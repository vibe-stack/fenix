import Stats from 'stats-gl'
import { createRawWebGPUContext, type RawWebGPUContext } from '../../gpu/context/createRawWebGPUContext'
import { createOrbitCameraController, type OrbitCameraController } from '../../scene/camera/createOrbitCameraController'
import { createCombustionVolumeSimulation, type CombustionVolumeSimulation } from '../../simulation/runtime/createCombustionVolumeSimulation'
import type { VolumeResolution } from '../../simulation/common/volumeResolution'
import { createVolumeRaymarchPass, type VolumeRaymarchPass } from '../passes/createVolumeRaymarchPass'
import { createViewportOverlayPass, type ViewportOverlayPass } from '../passes/createViewportOverlayPass'
import { createBloomPass, type BloomPass, type BloomParams } from '../passes/createBloomPass'
import type { VolumeDisplayMode } from '../volumetrics/volumeDisplayMode'
import type { SimulationHandle } from '../../core/types/platform'

export interface ViewportRuntime {
  mount(container: HTMLElement): Promise<void>
  getSimulationHandle(): SimulationHandle | null
  setViewportOverlays(overlays: readonly string[]): void
  dispose(): void
}

interface CreateViewportRuntimeOptions {
  displayMode: VolumeDisplayMode
  resolution: VolumeResolution
}

export function createViewportRuntime({
  displayMode,
  resolution,
}: CreateViewportRuntimeOptions): ViewportRuntime {
  return new RawWebGPUViewportRuntime(displayMode, resolution)
}

class RawWebGPUViewportRuntime implements ViewportRuntime {
  private readonly displayMode: VolumeDisplayMode
  private readonly resolution: VolumeResolution

  private container: HTMLElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private controls: OrbitCameraController | null = null
  private gpu: RawWebGPUContext | null = null
  private simulation: CombustionVolumeSimulation | null = null
  private raymarchPass: VolumeRaymarchPass | null = null
  private overlayPass: ViewportOverlayPass | null = null
  private bloomPass: BloomPass | null = null
  private bloomParams: BloomParams = { enabled: true, threshold: 0.6, strength: 0.9, radius: 0.4 }
  private hdrTexture: GPUTexture | null = null
  private resizeObserver: ResizeObserver | null = null
  private animationFrameId: number | null = null
  private lastFrameTime = 0
  private paused = false
  private simulationHandle: SimulationHandle | null = null
  private viewportOverlays: readonly string[] = []
  private stats: Stats | null = null
  private statsInitPromise: Promise<void> | null = null

  constructor(displayMode: VolumeDisplayMode, resolution: VolumeResolution) {
    this.displayMode = displayMode
    this.resolution = resolution
  }

  async mount(container: HTMLElement) {
    if (this.container === container && this.gpu) {
      return
    }

    this.dispose()
    this.container = container

    const canvas = document.createElement('canvas')

    canvas.className = 'h-full w-full'
    container.replaceChildren(canvas)

    const gpu = await createRawWebGPUContext(canvas)
    const controls = createOrbitCameraController(() => this.scheduleFrame())
    const simulation = createCombustionVolumeSimulation(gpu.device, {
      resolution: this.resolution,
      wind: [0, 0, 0],
      windStrength: 0,
      gravity: [0, -1, 0],
      gravityStrength: 0.45,
    })
    const raymarchPass = createVolumeRaymarchPass(gpu.device, 'rgba16float', simulation.resolution)
    const overlayPass = createViewportOverlayPass(gpu.device, gpu.format, simulation.resolution)
    const bloomPass = createBloomPass(gpu.device, gpu.format)

    controls.attach(canvas)

    this.canvas = canvas
    this.gpu = gpu
    this.controls = controls
    this.simulation = simulation
    this.raymarchPass = raymarchPass
    this.overlayPass = overlayPass
    this.bloomPass = bloomPass
    this.paused = true
    this.simulationHandle = this.buildHandle(simulation)

    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
      // Redraw after resize so the canvas matches even while paused
      this.scheduleFrame()
    })
    this.resizeObserver.observe(container)

    this.resize()
    this.lastFrameTime = performance.now()
    // Render one frame so the canvas isn't blank, then stop — loop only runs while playing
    this.scheduleFrame()
  }

  getSimulationHandle(): SimulationHandle | null {
    return this.simulationHandle
  }

  setViewportOverlays(overlays: readonly string[]) {
    this.viewportOverlays = overlays

    if (overlays.includes('stats')) {
      void this.ensureStats()
    } else {
      this.disposeStats()
    }

    this.scheduleFrame()
  }

  dispose() {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    this.resizeObserver?.disconnect()
    this.resizeObserver = null

    this.controls?.dispose()
    this.controls = null

    this.disposeStats()
    this.raymarchPass?.dispose()
    this.raymarchPass = null
    this.overlayPass?.dispose()
    this.overlayPass = null
    this.bloomPass?.dispose()
    this.bloomPass = null
    this.hdrTexture?.destroy()
    this.hdrTexture = null
    this.simulation?.dispose()
    this.simulation = null
    this.simulationHandle = null
    this.gpu = null
    this.canvas?.remove()
    this.canvas = null

    this.container = null
  }

  private scheduleFrame() {
    if (this.animationFrameId === null) {
      this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
    }
  }

  private buildHandle(simulation: CombustionVolumeSimulation): SimulationHandle {
    return {
      getPlaybackState: () => (this.paused ? 'paused' : 'playing'),
      play: () => {
        if (this.paused) {
          this.paused = false
          this.lastFrameTime = performance.now()
          this.scheduleFrame()
        }
      },
      pause: () => {
        // Don't cancel the RAF here — let renderFrame draw one final frame then stop itself
        this.paused = true
      },
      reset: () => {
        simulation.reset()
        // Redraw the cleared state even while paused
        this.scheduleFrame()
      },
      setWindDirection: (x, y, z) => simulation.setRuntimeParams({ wind: [x, y, z] }),
      setWindStrength: (v) => simulation.setRuntimeParams({ windStrength: v }),
      setGravityDirection: (x, y, z) => simulation.setRuntimeParams({ gravity: [x, y, z] }),
      setGravityStrength: (v) => simulation.setRuntimeParams({ gravityStrength: v }),
      setBuoyancy: (v) => simulation.setRuntimeParams({ buoyancy: v }),
      setVorticityStrength: (v) => simulation.setRuntimeParams({ vorticityStrength: v }),
      setVorticityMask: (constant, velocity, heat, density) => simulation.setRuntimeParams({
        vorticityConstantMask: constant,
        vorticityVelocityMask: velocity,
        vorticityHeatMask: heat,
        vorticityDensityMask: density,
      }),
      setWorldSize: (v) => simulation.setRuntimeParams({ worldSize: v }),
      setSimulationQuality: (settings) => simulation.setQualitySettings(settings),
      updateSources: (sources) => simulation.updateSources(sources),
      setRenderParams: (params) => {
        this.raymarchPass?.setRenderParams(params)
        if (params.bloomEnabled !== undefined) this.bloomParams.enabled = params.bloomEnabled
        if (params.bloomThreshold !== undefined) this.bloomParams.threshold = params.bloomThreshold
        if (params.bloomStrength !== undefined) this.bloomParams.strength = params.bloomStrength
        if (params.bloomRadius !== undefined) this.bloomParams.radius = params.bloomRadius
      },
      getCanvas: () => this.canvas,
      renderOffscreenFrame: (elapsedSeconds, deltaSeconds) => {
        if (!this.gpu || !this.simulation || !this.raymarchPass || !this.overlayPass || !this.bloomPass || !this.controls || !this.canvas) {
          return
        }
        const w = this.canvas.width
        const h = this.canvas.height
        if (!this.hdrTexture || this.hdrTexture.width !== w || this.hdrTexture.height !== h) {
          this.rebuildHdrTexture(w, h)
        }
        const encoder = this.gpu.device.createCommandEncoder({ label: 'export-frame' })
        const canvasView = this.gpu.context.getCurrentTexture().createView()
        const hdrView = this.hdrTexture!.createView()
        const camera = this.controls.getSnapshot()
        this.simulation.step(encoder, elapsedSeconds, deltaSeconds)
        this.raymarchPass.render(
          encoder,
          hdrView,
          this.simulation.getRenderBuffers(),
          camera,
          this.displayMode,
          w,
          h,
          elapsedSeconds,
        )
        this.bloomPass.render(encoder, hdrView, canvasView, w, h, this.bloomParams)
        this.overlayPass.render(encoder, canvasView, camera, w, h, this.viewportOverlays)
        this.gpu.device.queue.submit([encoder.finish()])
      },
    }
  }

  private ensureStats() {
    if (this.stats || this.statsInitPromise || !this.gpu || !this.container) {
      return this.statsInitPromise ?? Promise.resolve()
    }

    const stats = new Stats({
      trackGPU: true,
      trackFPS: true,
      precision: 2,
      horizontal: true,
      logsPerSecond: 8,
      graphsPerSecond: 30,
    })

    stats.dom.style.position = 'absolute'
    stats.dom.style.left = '12px'
    stats.dom.style.top = '12px'
    stats.dom.style.zIndex = '20'
    stats.dom.style.opacity = '0.92'
    stats.dom.style.pointerEvents = 'auto'
    this.container.appendChild(stats.dom)
    this.stats = stats
    this.statsInitPromise = stats
      .init(this.gpu.device)
      .catch((error: unknown) => {
        console.warn('stats-gl failed to initialize WebGPU timing.', error)
      })
      .finally(() => {
        this.statsInitPromise = null
      })

    return this.statsInitPromise
  }

  private disposeStats() {
    this.statsInitPromise = null

    if (!this.stats) {
      return
    }

    this.stats.dom.remove()
    this.stats.dispose()
    this.stats = null
  }

  private resize() {
    if (!this.container || !this.canvas || !this.controls) {
      return
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    const width = Math.max(Math.floor(this.container.clientWidth * pixelRatio), 1)
    const height = Math.max(Math.floor(this.container.clientHeight * pixelRatio), 1)

    this.canvas.width = width
    this.canvas.height = height
    this.controls.setAspect(width / height)
    this.rebuildHdrTexture(width, height)
  }

  private rebuildHdrTexture(width: number, height: number) {
    if (!this.gpu) return
    this.hdrTexture?.destroy()
    this.hdrTexture = this.gpu.device.createTexture({
      label: 'hdr-raymarch-target',
      size: { width, height },
      format: 'rgba16float',
      // RENDER_ATTACHMENT | TEXTURE_BINDING
      usage: 0x10 | 0x04,
    })
  }

  private readonly renderFrame = (time: number) => {
    this.animationFrameId = null

    if (!this.gpu || !this.simulation || !this.raymarchPass || !this.overlayPass || !this.bloomPass || !this.controls) {
      return
    }

    const w = this.canvas?.width ?? 1
    const h = this.canvas?.height ?? 1

    if (!this.hdrTexture || this.hdrTexture.width !== w || this.hdrTexture.height !== h) {
      this.rebuildHdrTexture(w, h)
    }

    const elapsedSeconds = time * 0.001
    const deltaSeconds = Math.max(1 / 240, Math.min((time - this.lastFrameTime) * 0.001, 1 / 20))
    const encoder = this.gpu.device.createCommandEncoder({ label: 'raw-webgpu-volume-frame' })
    const canvasView = this.gpu.context.getCurrentTexture().createView()
    const hdrView = this.hdrTexture!.createView()
    const camera = this.controls.getSnapshot()
    const stats = this.stats

    stats?.begin()
    if (!this.paused) {
      this.simulation.step(encoder, elapsedSeconds, deltaSeconds)
      this.lastFrameTime = time
    }

    // Raymarch into HDR offscreen texture
    this.raymarchPass.render(
      encoder,
      hdrView,
      this.simulation.getRenderBuffers(),
      camera,
      this.displayMode,
      w, h,
      elapsedSeconds,
      stats?.getTimestampWrites(),
    )

    // Bloom: threshold → blur → composite HDR onto canvas
    this.bloomPass.render(encoder, hdrView, canvasView, w, h, this.bloomParams)

    // Overlay on top of canvas
    this.overlayPass.render(encoder, canvasView, camera, w, h, this.viewportOverlays)

    stats?.end(encoder)
    this.gpu.device.queue.submit([encoder.finish()])
    stats?.update()

    if (!this.paused) {
      this.scheduleFrame()
    }
  }
}

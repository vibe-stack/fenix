import { createRawWebGPUContext, type RawWebGPUContext } from '../../gpu/context/createRawWebGPUContext'
import { createOrbitCameraController, type OrbitCameraController } from '../../scene/camera/createOrbitCameraController'
import { createCombustionVolumeSimulation, type CombustionVolumeSimulation } from '../../simulation/runtime/createCombustionVolumeSimulation'
import type { VolumeResolution } from '../../simulation/common/volumeResolution'
import { createVolumeRaymarchPass, type VolumeRaymarchPass } from '../passes/createVolumeRaymarchPass'
import type { VolumeDisplayMode } from '../volumetrics/volumeDisplayMode'
import type { SimulationHandle } from '../../core/types/platform'

export interface ViewportRuntime {
  mount(container: HTMLElement): Promise<void>
  getSimulationHandle(): SimulationHandle | null
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
  private resizeObserver: ResizeObserver | null = null
  private animationFrameId: number | null = null
  private lastFrameTime = 0
  private paused = false
  private simulationHandle: SimulationHandle | null = null

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
    const controls = createOrbitCameraController()
    const simulation = createCombustionVolumeSimulation(gpu.device, {
      resolution: this.resolution,
      wind: [0.8, -0.3, 0.2],
      windStrength: 2,
    })
    const raymarchPass = createVolumeRaymarchPass(gpu.device, gpu.format, simulation.resolution)

    controls.attach(canvas)

    this.canvas = canvas
    this.gpu = gpu
    this.controls = controls
    this.simulation = simulation
    this.raymarchPass = raymarchPass
    this.paused = false
    this.simulationHandle = this.buildHandle(simulation)

    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
    })
    this.resizeObserver.observe(container)

    this.resize()
    this.lastFrameTime = performance.now()
    this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
  }

  getSimulationHandle(): SimulationHandle | null {
    return this.simulationHandle
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

    this.raymarchPass?.dispose()
    this.raymarchPass = null
    this.simulation?.dispose()
    this.simulation = null
    this.simulationHandle = null
    this.gpu = null
    this.canvas?.remove()
    this.canvas = null

    this.container = null
  }

  private buildHandle(simulation: CombustionVolumeSimulation): SimulationHandle {
    return {
      getPlaybackState: () => (this.paused ? 'paused' : 'playing'),
      play: () => {
        if (this.paused) {
          this.paused = false
          this.lastFrameTime = performance.now()
        }
      },
      pause: () => {
        this.paused = true
      },
      reset: () => {
        simulation.reset()
      },
      setWindDirection: (x, y, z) => simulation.setRuntimeParams({ wind: [x, y, z] }),
      setWindStrength: (v) => simulation.setRuntimeParams({ windStrength: v }),
      setBuoyancy: (v) => simulation.setRuntimeParams({ buoyancy: v }),
      setVorticityStrength: (v) => simulation.setRuntimeParams({ vorticityStrength: v }),
    }
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
  }

  private readonly renderFrame = (time: number) => {
    if (!this.gpu || !this.simulation || !this.raymarchPass || !this.controls) {
      return
    }

    const elapsedSeconds = time * 0.001
    const deltaSeconds = Math.max(1 / 240, Math.min((time - this.lastFrameTime) * 0.001, 1 / 20))
    const encoder = this.gpu.device.createCommandEncoder({
      label: 'raw-webgpu-volume-frame',
    })
    const view = this.gpu.context.getCurrentTexture().createView()
    const camera = this.controls.getSnapshot()

    if (!this.paused) {
      this.simulation.step(encoder, elapsedSeconds, deltaSeconds)
    }
    this.raymarchPass.render(
      encoder,
      view,
      this.simulation.getRenderBuffers(),
      camera,
      this.displayMode,
      this.canvas?.width ?? 1,
      this.canvas?.height ?? 1,
      elapsedSeconds,
    )
    this.gpu.device.queue.submit([encoder.finish()])

    if (!this.paused) {
      this.lastFrameTime = time
    }
    this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
  }
}

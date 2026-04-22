import type { RendererDiagnostics } from '../../core/types/platform'
import { createRawWebGPUContext, type RawWebGPUContext } from '../../gpu/context/createRawWebGPUContext'
import { createOrbitCameraController, type OrbitCameraController } from '../../scene/camera/createOrbitCameraController'
import { createCombustionVolumeSimulation, type CombustionVolumeSimulation } from '../../simulation/runtime/createCombustionVolumeSimulation'
import { createVolumeRaymarchPass, type VolumeRaymarchPass } from '../passes/createVolumeRaymarchPass'
import type { VolumeDisplayMode } from '../volumetrics/volumeDisplayMode'

export interface ViewportRuntime {
  mount(container: HTMLElement): Promise<void>
  dispose(): void
}

interface CreateViewportRuntimeOptions {
  displayMode: VolumeDisplayMode
  resolveDiagnostics(): RendererDiagnostics
}

export function createViewportRuntime({
  displayMode,
  resolveDiagnostics,
}: CreateViewportRuntimeOptions): ViewportRuntime {
  return new RawWebGPUViewportRuntime(displayMode, resolveDiagnostics)
}

class RawWebGPUViewportRuntime implements ViewportRuntime {
  private readonly displayMode: VolumeDisplayMode
  private readonly resolveDiagnostics: () => RendererDiagnostics

  private container: HTMLElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private controls: OrbitCameraController | null = null
  private gpu: RawWebGPUContext | null = null
  private simulation: CombustionVolumeSimulation | null = null
  private raymarchPass: VolumeRaymarchPass | null = null
  private resizeObserver: ResizeObserver | null = null
  private animationFrameId: number | null = null
  private lastFrameTime = 0

  constructor(
    displayMode: VolumeDisplayMode,
    resolveDiagnostics: () => RendererDiagnostics,
  ) {
    this.displayMode = displayMode
    this.resolveDiagnostics = resolveDiagnostics
  }

  async mount(container: HTMLElement) {
    if (this.container === container && this.gpu) {
      return
    }

    this.dispose()
    this.container = container

    const diagnostics = this.resolveDiagnostics()

    if (diagnostics.supportState !== 'ready') {
      throw new Error(
        'WebGPU adapter is required for the viewport runtime, but no adapter is currently available.',
      )
    }

    const canvas = document.createElement('canvas')

    canvas.className = 'h-full w-full'
    container.replaceChildren(canvas)

    const gpu = await createRawWebGPUContext(canvas)
    const controls = createOrbitCameraController()
    const simulation = createCombustionVolumeSimulation(gpu.device)
    const raymarchPass = createVolumeRaymarchPass(gpu.device, gpu.format, simulation.resolution)

    controls.attach(canvas)

    this.canvas = canvas
    this.gpu = gpu
    this.controls = controls
    this.simulation = simulation
    this.raymarchPass = raymarchPass

    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
    })
    this.resizeObserver.observe(container)

    this.resize()
    this.lastFrameTime = performance.now()
    this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
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
    this.gpu = null
    this.canvas?.remove()
    this.canvas = null

    this.container = null
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

    this.simulation.step(encoder, elapsedSeconds, deltaSeconds)
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

    this.lastFrameTime = time
    this.animationFrameId = window.requestAnimationFrame(this.renderFrame)
  }
}

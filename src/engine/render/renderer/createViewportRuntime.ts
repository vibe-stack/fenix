import {
  ACESFilmicToneMapping,
  Clock,
  Color,
  FogExp2,
  Scene,
  SRGBColorSpace,
} from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { WebGPURenderer } from 'three/webgpu'
import type { RendererDiagnostics } from '../../core/types/platform'
import { createCombustionPreview, type CombustionPreview } from '../helpers/createCombustionPreview'
import { createViewportCamera } from '../../scene/camera/createViewportCamera'
import { createViewportControls } from '../../scene/controls/createViewportControls'
import {
  createViewportLightingRig,
  type ViewportLightingRig,
} from '../../scene/lighting/createViewportLightingRig'

export interface ViewportRuntime {
  mount(container: HTMLElement): Promise<void>
  dispose(): void
}

interface CreateViewportRuntimeOptions {
  resolveDiagnostics(): RendererDiagnostics
}

export function createViewportRuntime({
  resolveDiagnostics,
}: CreateViewportRuntimeOptions): ViewportRuntime {
  return new ThreeViewportRuntime(resolveDiagnostics)
}

class ThreeViewportRuntime implements ViewportRuntime {
  private readonly clock = new Clock()
  private readonly scene = new Scene()
  private readonly preview: CombustionPreview
  private readonly lighting: ViewportLightingRig
  private readonly camera = createViewportCamera(1)
  private readonly resolveDiagnostics: () => RendererDiagnostics

  private container: HTMLElement | null = null
  private controls: OrbitControls | null = null
  private renderer: WebGPURenderer | null = null
  private resizeObserver: ResizeObserver | null = null

  constructor(resolveDiagnostics: () => RendererDiagnostics) {
    this.resolveDiagnostics = resolveDiagnostics
    this.preview = createCombustionPreview()
    this.lighting = createViewportLightingRig()

    this.scene.name = 'ViewportScene'
    this.scene.background = new Color('#130f0d')
    this.scene.fog = new FogExp2('#130f0d', 0.11)
    this.scene.add(this.preview.root, this.lighting.root)
  }

  async mount(container: HTMLElement) {
    if (this.container === container && this.renderer) {
      return
    }

    this.dispose()
    this.container = container

    const diagnostics = this.resolveDiagnostics()
    const renderer = new WebGPURenderer({
      antialias: true,
      alpha: true,
      forceWebGL: diagnostics.supportState !== 'ready',
    })

    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.setClearColor(new Color('#130f0d'), 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    await renderer.init()

    renderer.domElement.className = 'h-full w-full'

    container.replaceChildren(renderer.domElement)

    this.renderer = renderer
    this.controls = createViewportControls(this.camera, renderer.domElement)

    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
    })
    this.resizeObserver.observe(container)

    this.resize()
    this.clock.start()

    await renderer.setAnimationLoop((time) => {
      this.renderFrame(time)
    })
  }

  dispose() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null

    this.controls?.dispose()
    this.controls = null

    if (this.renderer) {
      void this.renderer.setAnimationLoop(null)
      this.renderer.dispose()
      this.renderer.domElement.remove()
      this.renderer = null
    }

    this.container = null
  }

  private resize() {
    if (!this.container || !this.renderer) {
      return
    }

    const width = Math.max(this.container.clientWidth, 1)
    const height = Math.max(this.container.clientHeight, 1)

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height, false)
  }

  private renderFrame(time: number) {
    if (!this.renderer) {
      return
    }

    const elapsedSeconds = time * 0.001

    this.controls?.update(this.clock.getDelta())
    this.preview.animate(elapsedSeconds)
    this.lighting.animate(elapsedSeconds)
    this.renderer.render(this.scene, this.camera)
  }
}

import type { PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createViewportControls(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
) {
  const controls = new OrbitControls(camera, domElement)

  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = true
  controls.minDistance = 3
  controls.maxDistance = 22
  controls.maxPolarAngle = Math.PI * 0.48
  controls.target.set(0, 2.1, 0)
  controls.cursorStyle = 'grab'
  controls.update()

  return controls
}

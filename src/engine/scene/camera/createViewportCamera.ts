import { PerspectiveCamera } from 'three'

export function createViewportCamera(aspect: number) {
  const camera = new PerspectiveCamera(42, aspect, 0.1, 100)

  camera.name = 'EditorPerspectiveCamera'
  camera.position.set(6.5, 4.8, 8.5)

  return camera
}

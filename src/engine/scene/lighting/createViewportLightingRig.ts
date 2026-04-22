import { AmbientLight, DirectionalLight, Group, PointLight } from 'three'

export interface ViewportLightingRig {
  root: Group
  animate(elapsedSeconds: number): void
}

export function createViewportLightingRig(): ViewportLightingRig {
  const root = new Group()

  root.name = 'ViewportLightingRig'

  const ambientLight = new AmbientLight('#ffe9d6', 1.4)
  const rimLight = new DirectionalLight('#ffd0a6', 1.9)
  const keyLight = new PointLight('#ff8a4c', 28, 24, 2.1)

  rimLight.position.set(7, 11, 8)
  keyLight.position.set(0, 2.2, 0.8)

  root.add(ambientLight, rimLight, keyLight)

  return {
    root,
    animate(elapsedSeconds) {
      keyLight.intensity = 24 + Math.sin(elapsedSeconds * 2.4) * 3.2
      keyLight.position.x = Math.sin(elapsedSeconds * 0.7) * 0.45
      keyLight.position.z = 0.8 + Math.cos(elapsedSeconds * 0.8) * 0.22
    },
  }
}

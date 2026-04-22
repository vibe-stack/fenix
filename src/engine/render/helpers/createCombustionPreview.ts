import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  ConeGeometry,
  DynamicDrawUsage,
  EdgesGeometry,
  Group,
  GridHelper,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  SphereGeometry,
} from 'three'
import { disposeSceneObject } from './disposeSceneObject'

export interface CombustionPreview {
  root: Group
  animate(elapsedSeconds: number): void
  dispose(): void
}

export function createCombustionPreview(): CombustionPreview {
  const root = new Group()
  const dummy = new Object3D()

  root.name = 'CombustionPreview'

  const domainBounds = new LineSegments(
    new EdgesGeometry(new BoxGeometry(5.2, 6.4, 5.2)),
    new LineBasicMaterial({
      color: new Color('#ffb278'),
      transparent: true,
      opacity: 0.26,
    }),
  )
  domainBounds.position.y = 3.2

  const domainCore = new Mesh(
    new BoxGeometry(4.8, 6, 4.8),
    new MeshBasicMaterial({
      color: new Color('#ff8d4d'),
      transparent: true,
      opacity: 0.05,
    }),
  )
  domainCore.position.y = 3

  const grid = new GridHelper(12, 12, '#5f4535', '#2e241e')
  grid.position.y = -0.01

  const emitter = new Mesh(
    new ConeGeometry(0.65, 1.6, 28, 1, true),
    new MeshPhysicalMaterial({
      color: new Color('#ff9654'),
      emissive: new Color('#ff5c2b'),
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.22,
      roughness: 0.35,
      metalness: 0,
    }),
  )
  emitter.position.y = 0.78

  const plumeMaterial = new MeshPhysicalMaterial({
    color: new Color('#ffb06c'),
    emissive: new Color('#ff632e'),
    emissiveIntensity: 1.2,
    transmission: 0.02,
    transparent: true,
    opacity: 0.32,
    roughness: 0.34,
    metalness: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const plume = new InstancedMesh(new SphereGeometry(0.28, 18, 18), plumeMaterial, 28)

  plume.instanceMatrix.setUsage(DynamicDrawUsage)
  plume.position.y = 0.1

  root.add(grid, domainCore, domainBounds, emitter, plume)

  return {
    root,
    animate(elapsedSeconds) {
      emitter.rotation.y = elapsedSeconds * 0.75
      emitter.scale.setScalar(1 + Math.sin(elapsedSeconds * 3.2) * 0.06)

      for (let index = 0; index < plume.count; index += 1) {
        const progress = (index / plume.count + elapsedSeconds * 0.12) % 1
        const swirl = elapsedSeconds * 1.4 + index * 0.55
        const radius = 0.18 + progress * 0.95
        const height = 0.35 + progress * 5.5
        const scale = 0.45 + progress * 1.75

        dummy.position.set(
          Math.sin(swirl) * radius * 0.38,
          height,
          Math.cos(swirl * 1.2) * radius * 0.26,
        )
        dummy.scale.setScalar(scale)
        dummy.rotation.set(progress * 0.8, swirl, progress * 0.35)
        dummy.updateMatrix()

        plume.setMatrixAt(index, dummy.matrix)
      }

      plume.instanceMatrix.needsUpdate = true
    },
    dispose() {
      disposeSceneObject(root)
    },
  }
}

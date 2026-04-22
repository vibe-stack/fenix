import type { Material, Object3D } from 'three'

interface DisposableObject3D extends Object3D {
  geometry?: {
    dispose(): void
  }
  material?: Material | Material[]
}

export function disposeSceneObject(root: Object3D) {
  root.traverse((child) => {
    const disposable = child as DisposableObject3D

    disposable.geometry?.dispose()

    if (Array.isArray(disposable.material)) {
      disposable.material.forEach((material) => material.dispose())
    } else {
      disposable.material?.dispose()
    }
  })
}

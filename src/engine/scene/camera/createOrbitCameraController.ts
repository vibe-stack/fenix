import {
  addVector3,
  createVector3,
  crossVector3,
  normalizeVector3,
  subtractVector3,
  type Vector3,
} from '../../core/math/vector3'

export interface OrbitCameraSnapshot {
  position: Vector3
  target: Vector3
  forward: Vector3
  right: Vector3
  up: Vector3
  aspect: number
  tanHalfFovY: number
}

export interface OrbitCameraController {
  attach(target: HTMLElement): void
  setAspect(aspect: number): void
  getSnapshot(): OrbitCameraSnapshot
  dispose(): void
}

const WORLD_UP = createVector3(0, 1, 0)

export function createOrbitCameraController(): OrbitCameraController {
  let canvas: HTMLElement | null = null
  let aspect = 1
  let yaw = -0.62
  let pitch = 0.31
  let radius = 9.4
  let pointerId: number | null = null
  let lastX = 0
  let lastY = 0

  const target = createVector3(0, 2.95, 0)

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }

    pointerId = event.pointerId
    lastX = event.clientX
    lastY = event.clientY
    canvas?.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - lastX
    const deltaY = event.clientY - lastY

    lastX = event.clientX
    lastY = event.clientY
    yaw -= deltaX * 0.008
    pitch = clamp(pitch - deltaY * 0.008, -1.2, 1.2)
  }

  const releasePointer = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) {
      return
    }

    pointerId = null

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    radius = clamp(radius + event.deltaY * 0.01, 4.5, 18)
  }

  return {
    attach(targetElement) {
      this.dispose()
      canvas = targetElement
      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', releasePointer)
      canvas.addEventListener('pointercancel', releasePointer)
      canvas.addEventListener('wheel', onWheel, { passive: false })
    },
    setAspect(nextAspect) {
      aspect = nextAspect > 0 ? nextAspect : 1
    },
    getSnapshot() {
      const cosPitch = Math.cos(pitch)
      const position = addVector3(target, {
        x: Math.cos(yaw) * cosPitch * radius,
        y: Math.sin(pitch) * radius,
        z: Math.sin(yaw) * cosPitch * radius,
      })
      const forward = normalizeVector3(subtractVector3(target, position))
      const right = normalizeVector3(crossVector3(forward, WORLD_UP))
      const up = normalizeVector3(crossVector3(right, forward))

      return {
        position,
        target,
        forward,
        right,
        up,
        aspect,
        tanHalfFovY: Math.tan((42 * Math.PI) / 180),
      }
    },
    dispose() {
      if (!canvas) {
        return
      }

      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', releasePointer)
      canvas.removeEventListener('pointercancel', releasePointer)
      canvas.removeEventListener('wheel', onWheel)
      canvas = null
      pointerId = null
    },
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

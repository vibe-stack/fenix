import {
  addVector3,
  createVector3,
  crossVector3,
  normalizeVector3,
  scaleVector3,
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

export function createOrbitCameraController(onChange?: () => void): OrbitCameraController {
  let canvas: HTMLElement | null = null
  let aspect = 1
  let yaw = -0.62
  let pitch = 0.31
  let radius = 40
  let pointerId: number | null = null
  let dragMode: 'orbit' | 'pan' | null = null
  let lastX = 0
  let lastY = 0

  const target = createVector3(0, 16, 0)

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.button !== 2) {
      return
    }

    event.preventDefault()
    pointerId = event.pointerId
    dragMode = event.button === 2 ? 'pan' : 'orbit'
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

    if (dragMode === 'pan') {
      const basis = getCameraBasis()
      const panScale = radius * 0.0018
      const panOffset = addVector3(
        scaleVector3(basis.right, -deltaX * panScale),
        scaleVector3(basis.up, deltaY * panScale),
      )

      target.x += panOffset.x
      target.y = clamp(target.y + panOffset.y, -12, 96)
      target.z += panOffset.z
      onChange?.()
      return
    }

    yaw -= deltaX * 0.008
    pitch = clamp(pitch - deltaY * 0.008, -1.2, 1.2)
    onChange?.()
  }

  const releasePointer = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) {
      return
    }

    pointerId = null
    dragMode = null

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    radius = clamp(radius + event.deltaY * 0.045, 16, 660)
    onChange?.()
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
      canvas.addEventListener('contextmenu', preventContextMenu)
    },
    setAspect(nextAspect) {
      aspect = nextAspect > 0 ? nextAspect : 1
    },
    getSnapshot() {
      const { position, forward, right, up } = getCameraBasis()

      return {
        position,
        target,
        forward,
        right,
        up,
        aspect,
        tanHalfFovY: Math.tan((48 * Math.PI) / 180),
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
      canvas.removeEventListener('contextmenu', preventContextMenu)
      canvas = null
      pointerId = null
      dragMode = null
    },
  }

  function getCameraBasis() {
    const cosPitch = Math.cos(pitch)
    const position = addVector3(target, {
      x: Math.cos(yaw) * cosPitch * radius,
      y: Math.sin(pitch) * radius,
      z: Math.sin(yaw) * cosPitch * radius,
    })
    const forward = normalizeVector3(subtractVector3(target, position))
    const right = normalizeVector3(crossVector3(forward, WORLD_UP))
    const up = normalizeVector3(crossVector3(right, forward))

    return { position, forward, right, up }
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function preventContextMenu(event: Event) {
  event.preventDefault()
}

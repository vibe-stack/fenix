export type RenderLightType = 'directional' | 'point'

export interface RenderLight {
  type: RenderLightType
  direction: readonly [number, number, number]
  position: readonly [number, number, number]
  color: readonly [number, number, number]
  intensity: number
}

export const MAX_RENDER_LIGHTS = 3
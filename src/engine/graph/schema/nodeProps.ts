// Typed property schemas for each node type.
// These match what the shaders and packing functions read.

export interface ScalarEmitterNodeProps {
  positionX: number
  positionY: number
  positionZ: number
  radius: number
  startTime: number
  duration: number
  densityRate: number   // smoke mass/s
  heatRate: number      // temperature/s
  fuelRate: number      // combustible gas/s
  noiseScale: number    // spatial variation frequency
  noiseMix: number      // 0=uniform, 1=fully noise-modulated
  seed: number
}

export interface VelocityEmitterNodeProps {
  positionX: number
  positionY: number
  positionZ: number
  radius: number
  startTime: number
  duration: number
  mode: 'radial' | 'directional' | 'turbulent'
  speed: number         // voxels/s
  directionX: number
  directionY: number
  directionZ: number
  falloff: number       // 0=top-hat, 1=gaussian
  seed: number
}

export interface IgniterEmitterNodeProps {
  positionX: number
  positionY: number
  positionZ: number
  radius: number
  startTime: number
  duration: number
  intensity: number     // peak reaction value written (0–1)
  seed: number
}

export type EmitterKind = 'scalar' | 'velocity' | 'igniter'

export type EmitterNodeProps =
  | ({ kind: 'scalar' } & ScalarEmitterNodeProps)
  | ({ kind: 'velocity' } & VelocityEmitterNodeProps)
  | ({ kind: 'igniter' } & IgniterEmitterNodeProps)

export interface CombustionNodeProps {
  burnRateMin: number
  burnRateMax: number
  heatEmissionMin: number
  heatEmissionMax: number
  baseCoolingRate: number
  heightCoolingRate: number
  smokeYieldMin: number
  smokeYieldMax: number
  reactionDecayHot: number
  reactionDecayCool: number
}

export interface AdvectionNodeProps {
  mode: 'maccormack' | 'semi-lagrangian'
}

export interface LightNodeProps {
  lightType: 'directional' | 'point'
  dirX: number
  dirY: number
  dirZ: number
  posX: number
  posY: number
  posZ: number
  intensity: number
  colorR: number
  colorG: number
  colorB: number
}

export interface RenderOutputNodeProps {
  displayMode: 'temperature' | 'density' | 'fuel'
  stepCount: number
  scatteringForward: number
  scatteringBack: number
}

export type NodePropsMap = {
  'emitter-source': EmitterNodeProps
  'combustion': CombustionNodeProps
  'advection': AdvectionNodeProps
  'light': LightNodeProps
  'render-output': RenderOutputNodeProps
}

export type NodeId = keyof NodePropsMap
export type AnyNodeProps = NodePropsMap[NodeId]

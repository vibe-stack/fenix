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
  tightness?: number    // 0=additive force, 1=locally replace velocity
  seed: number
}

export interface BurstEmitterNodeProps {
  positionX: number
  positionY: number
  positionZ: number
  radius: number
  startTime: number
  duration: number
  densityAmount: number
  heatAmount: number
  fuelAmount: number
  reactionAmount: number
  expansionSpeed: number
  liftSpeed: number
  turbulenceSpeed: number
  falloff: number
  noiseScale: number
  noiseMix: number
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

export type EmitterKind = 'scalar' | 'velocity' | 'burst' | 'igniter'

export type EmitterNodeProps =
  | ({ kind: 'scalar' } & ScalarEmitterNodeProps)
  | ({ kind: 'velocity' } & VelocityEmitterNodeProps)
  | ({ kind: 'burst' } & BurstEmitterNodeProps)
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

export interface WindNodeProps {
  directionX: number
  directionY: number
  directionZ: number
  strength: number
}

export interface GravityNodeProps {
  directionX: number
  directionY: number
  directionZ: number
  strength: number
  buoyancy: number
}

export interface VorticityNodeProps {
  strength: number
  constantMask?: number
  velocityMask?: number
  heatMask?: number
  densityMask?: number
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
  bloomEnabled: boolean
  bloomThreshold: number
  bloomStrength: number
  bloomRadius: number
}

export type NodePropsMap = {
  'emitter-source': EmitterNodeProps
  'combustion': CombustionNodeProps
  'advection': AdvectionNodeProps
  'wind': WindNodeProps
  'gravity': GravityNodeProps
  'vorticity': VorticityNodeProps
  'light': LightNodeProps
  'render-output': RenderOutputNodeProps
}

export type NodeId = keyof NodePropsMap
export type AnyNodeProps = NodePropsMap[NodeId]

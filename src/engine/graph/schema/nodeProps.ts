// Typed property schemas for each node type.
// These match the constants and uniforms the shaders actually read.

export interface EmitterNodeProps {
  // Yields — written into scalar fields each frame
  densityYield: number      // smoke mass emitted (0..14)
  heatYield: number         // temperature injected during blast (0..18)
  fuelYield: number         // combustible gas injected (0..16)
  reactionYield: number     // initial reaction intensity (0..8)
  // Impulse
  radialImpulse: number     // expanding shell velocity (0..80)
  liftImpulse: number       // post-blast plume velocity (0..30)
  turbulence: number        // lateral shell shredding (0..14)
  crumbleStrength: number   // inward shredding around cool pockets (0..24)
  // Shape / noise
  heatPatchiness: number    // 0=uniform heat, 1=max patchy (0..1)
  patchScale: number        // noise frequency for breakup (1..24)
  coreHeat: number          // residual heat near updraft (0..0.8)
  coreLift: number          // narrow extra updraft force (0..24)
  // Position
  positionX: number         // normalized 0..1
  positionY: number
  positionZ: number
  radius: number            // normalized source radius (0.01..0.5)
  // Lift
  liftDirX: number
  liftDirY: number
  liftDirZ: number
  // Internal
  seed: number
  // Timing
  startTime: number         // seconds into sim when source activates
  smokeLeadTime: number     // pre-blast smoke seconds (0..4)
  blastDuration: number     // shock flash duration seconds (0.05..2)
  plumeDuration: number     // residual plume seconds (0.5..8)
}

export interface CombustionNodeProps {
  // Burn rates — correspond to hardcoded shader constants
  burnRateMin: number       // min burn rate (ignition * dt multiplier) maps to 4.2
  burnRateMax: number       // max burn rate in hot pockets                maps to 8.6
  // Heat response
  heatEmissionMin: number   // temperature added per unit burn (cool)      maps to 2.1
  heatEmissionMax: number   // temperature added per unit burn (hot)       maps to 3.25
  // Cooling
  baseCoolingRate: number   // base heat loss per frame                    maps to 0.018
  heightCoolingRate: number // additional cooling at top of domain         maps to 0.052
  // Smoke
  smokeYieldMin: number     // smoke per burn in cool pockets              maps to 0.16
  smokeYieldMax: number     // smoke per burn in hot pockets               maps to 0.58
  // Reaction
  reactionDecayHot: number  // reaction decay in hot pockets               maps to 0.68
  reactionDecayCool: number // reaction decay in cool zones                maps to 0.22
}

export interface AdvectionNodeProps {
  mode: 'maccormack' | 'semi-lagrangian'
}

export interface RenderOutputNodeProps {
  displayMode: 'temperature' | 'density' | 'fuel'
  stepCount: number          // raymarch steps (64..512)
  lightDirX: number          // light direction X (-1..1)
  lightDirY: number
  lightDirZ: number
  scatteringForward: number  // Henyey-Greenstein g forward (0..0.95)
  scatteringBack: number     // H-G g backward (-0.95..0)
}

// Union of all node property types keyed by node id
export type NodePropsMap = {
  'emitter-source': EmitterNodeProps
  'combustion': CombustionNodeProps
  'advection': AdvectionNodeProps
  'render-output': RenderOutputNodeProps
}

export type NodeId = keyof NodePropsMap
export type AnyNodeProps = NodePropsMap[NodeId]

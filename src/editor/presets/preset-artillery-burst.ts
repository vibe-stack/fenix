import { createEmitter, createLight, type NewFilePreset } from './types'

// Artillery HE shell burst. Compact, violent, asymmetric.
// The "smoke ring" effect comes from the toroidal circulation (mushroomStrength)
// and high implosionStrength on the single primary source — NOT a second emitter.
// A second ground-level source fires slightly later to add the disturbed-earth haze
// beneath; it has near-zero radialImpulse so it reads as a kick of dust, not an explosion.
export const artilleryBurstPreset: NewFilePreset = {
  id: 'artillery-burst',
  label: 'Artillery Airburst',
  description: 'Compact violent burst with a fast-expanding smoke ring and ground dust.',
  emitters: [
    createEmitter('Detonation', {
      position: [0.5, 0.19, 0.5],
      radius: 0.065,
      startTime: 0,
      smokeLeadTime: 0,
      blastDuration: 0.07,
      plumeDuration: 3.5,
      densityYield: 0.68,
      heatYield: 30,
      fuelYield: 7.0,
      reactionYield: 5.8,
      radialImpulse: 168,
      liftDirection: [0, 1, 0],
      liftImpulse: 12,
      heatPatchiness: 0.95,
      patchScale: 70,
      coreHeat: 4.5,
      coreLift: 6,
      turbulence: 22,
      crumbleStrength: 17,
      implosionStrength: 18,
      expansionRate: 1.95,
      sustain: 0.06,
      mushroomStrength: 3.5,
      smokeEntrainment: 1.0,
      seed: 211,
    }),
    // Ground dust — fires almost simultaneously. No radialImpulse, just a density kick
    // from the overpressure wave hitting the ground. This reads as disturbed earth/dust.
    createEmitter('Ground Dust', {
      position: [0.5, 0.055, 0.5],
      radius: 0.088,
      startTime: 0.05,
      smokeLeadTime: 0,
      blastDuration: 0.22,
      plumeDuration: 2.8,
      densityYield: 1.1,
      heatYield: 2.8,
      fuelYield: 0.5,
      reactionYield: 0.25,
      radialImpulse: 28,
      liftDirection: [0, 1, 0],
      liftImpulse: 3.5,
      heatPatchiness: 0.72,
      patchScale: 36,
      coreHeat: 0.25,
      coreLift: 1.8,
      turbulence: 7,
      crumbleStrength: 5,
      implosionStrength: 0.3,
      expansionRate: 0.72,
      sustain: 0.04,
      mushroomStrength: 0.3,
      smokeEntrainment: 0.7,
      seed: 223,
    }),
  ],
  lights: [
    createLight('Overcast Sky', {
      lightType: 'directional',
      dirX: -0.28, dirY: 0.92, dirZ: 0.26,
      posX: 0.5, posY: 0.85, posZ: 0.5,
      intensity: 1.85,
      colorR: 0.92, colorG: 0.94, colorB: 1.0,
    }),
  ],
  runtimeParams: {
    wind: [0.032, 0, -0.018],
    windStrength: 0.22,
    buoyancy: 4.8,
    vorticityStrength: 4.2,
    worldSize: 50,
  },
  renderOutput: {
    stepCount: 384,
    scatteringForward: 0.34,
    scatteringBack: -0.16,
  },
}

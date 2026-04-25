import { createEmitter, createLight, type NewFilePreset } from './types'

// A campfire has no explosion — it's a sustained low-energy heat source.
// The shader's blastGate drives a sin(blastAge*PI) bell curve over blastDuration,
// so a very long blastDuration (many seconds) produces a slow, gentle injection
// that looks like continuous emission rather than a detonation.
// High sustain keeps heat/fuel alive into the plume phase so the flame never
// fully dies, and the long plumeDuration carries the smoke column indefinitely.
export const campfirePreset: NewFilePreset = {
  id: 'campfire',
  label: 'Campfire',
  description: 'Sustained low flame with a turbulent thermal column and drifting smoke.',
  emitters: [
    createEmitter('Fire', {
      position: [0.5, 0.058, 0.5],
      radius: 0.042,
      startTime: 0,
      smokeLeadTime: 0,
      blastDuration: 18,
      plumeDuration: 60,
      densityYield: 0.48,
      heatYield: 7.5,
      fuelYield: 9.2,
      reactionYield: 1.4,
      radialImpulse: 1.8,
      liftDirection: [0, 1, 0],
      liftImpulse: 4.8,
      heatPatchiness: 0.24,
      patchScale: 9,
      coreHeat: 3.8,
      coreLift: 6.2,
      turbulence: 2.2,
      crumbleStrength: 1.5,
      implosionStrength: 0,
      expansionRate: 0.18,
      sustain: 2.8,
      mushroomStrength: 0.06,
      smokeEntrainment: 0.5,
      seed: 607,
    }),
  ],
  lights: [
    createLight('Warm Sky', {
      lightType: 'directional',
      dirX: -0.24, dirY: 0.95, dirZ: 0.18,
      posX: 0.5, posY: 0.82, posZ: 0.5,
      intensity: 1.15,
      colorR: 1.0, colorG: 0.86, colorB: 0.68,
    }),
  ],
  runtimeParams: {
    wind: [0.015, 0, -0.01],
    windStrength: 0.03,
    buoyancy: 2.6,
    vorticityStrength: 0.95,
    worldSize: 5,
  },
  renderOutput: {
    stepCount: 320,
    scatteringForward: 0.26,
    scatteringBack: -0.11,
  },
}

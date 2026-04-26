import { createBurstEmitter, createScalarEmitter, createVelocityEmitter, createLight, type NewFilePreset } from './types'

// Artillery airburst: an HE shell detonates in mid-air. Key visual:
// 1. A fast radial pressure wave that tears OUTWARD in all directions (not just up)
// 2. A dirty smoke ring/torus hanging at the burst point
// 3. Fragments pull dirty smoke trails downward as they fall
// 4. The burst residue drifts in wind and slowly dissipates
// Old preset was just a smokeball at height + a separate ground burst = two unrelated blobs.
export const artilleryBurstPreset: NewFilePreset = {
  id: 'artillery-burst',
  label: 'Artillery Airburst',
  description: 'Mid-air HE detonation with radial pressure wave, dirty smoke torus, and falling debris trails.',
  emitters: [
    // The detonation — very fast, radial, tears outward
    createBurstEmitter('Shell Detonation', {
      positionX: 0.5, positionY: 0.42, positionZ: 0.5,
      radius: 0.038,
      startTime: 0,
      duration: 0.06,
      densityAmount: 0.08,
      heatAmount: 1.85,
      fuelAmount: 0.55,
      reactionAmount: 0.9,
      expansionSpeed: 175,
      liftSpeed: 0,
      turbulenceSpeed: 88,
      falloff: 0.22,
      noiseScale: 32,
      noiseMix: 0.86,
      seed: 211,
    }),
    // Radial outward velocity — the pressure wave. Fires immediately at burst point.
    createVelocityEmitter('Pressure Wave', {
      positionX: 0.5, positionY: 0.42, positionZ: 0.5,
      radius: 0.09,
      startTime: 0,
      duration: 0.18,
      mode: 'radial',
      speed: 95,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.38,
      tightness: 0.45,
      seed: 213,
    }),
    // Dirty smoke ring — fills the toroidal region around burst point after expansion settles
    createScalarEmitter('Burst Smoke Ring', {
      positionX: 0.5, positionY: 0.41, positionZ: 0.5,
      radius: 0.065,
      startTime: 0.08,
      duration: 1.8,
      densityRate: 1.55,
      heatRate: 0.22,
      fuelRate: 0,
      noiseScale: 34,
      noiseMix: 0.91,
      seed: 221,
    }),
    // Torus turbulence — the ring churns and folds as it expands
    createVelocityEmitter('Ring Churn', {
      positionX: 0.5, positionY: 0.41, positionZ: 0.5,
      radius: 0.12,
      startTime: 0.1,
      duration: 2.8,
      mode: 'turbulent',
      speed: 14,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.72,
      tightness: 0.07,
      seed: 229,
    }),
    // Debris smoke — dirty trails pulled downward and outward by fragments falling
    createScalarEmitter('Falling Debris Trails', {
      positionX: 0.5, positionY: 0.32, positionZ: 0.5,
      radius: 0.1,
      startTime: 0.14,
      duration: 1.5,
      densityRate: 0.85,
      heatRate: 0.08,
      fuelRate: 0,
      noiseScale: 28,
      noiseMix: 0.88,
      seed: 237,
    }),
    createVelocityEmitter('Debris Fall', {
      positionX: 0.5, positionY: 0.30, positionZ: 0.5,
      radius: 0.12,
      startTime: 0.12,
      duration: 1.8,
      mode: 'directional',
      speed: 18,
      directionX: 0.22, directionY: -0.65, directionZ: -0.14,
      falloff: 0.68,
      tightness: 0.12,
      seed: 241,
    }),
    // Crosswind tears the smoke ring sideways after it forms
    createVelocityEmitter('Crosswind Tear', {
      positionX: 0.5, positionY: 0.42, positionZ: 0.5,
      radius: 0.28,
      startTime: 0.25,
      duration: 4.0,
      mode: 'directional',
      speed: 14,
      directionX: 0.48, directionY: 0.08, directionZ: -0.22,
      falloff: 0.76,
      tightness: 0.06,
      seed: 251,
    }),
  ],
  lights: [
    createLight('Overcast Battlefield', {
      lightType: 'directional',
      dirX: -0.28, dirY: 0.92, dirZ: 0.26,
      posX: 0.5, posY: 0.85, posZ: 0.5,
      intensity: 1.75,
      colorR: 0.90, colorG: 0.92, colorB: 1.0,
    }),
  ],
  runtimeParams: {
    wind: [0.038, 0, -0.018],
    windStrength: 0.18,
    gravity: [0, -1, 0],
    gravityStrength: 0.52,
    buoyancy: 1.8,
    vorticityStrength: 3.2,
    vorticityConstantMask: 0.55,
    vorticityVelocityMask: 0.65,
    vorticityHeatMask: 0.4,
    vorticityDensityMask: 0.3,
    worldSize: 45,
  },
  renderOutput: {
    stepCount: 440,
    scatteringForward: 0.32,
    scatteringBack: -0.15,
  },
}

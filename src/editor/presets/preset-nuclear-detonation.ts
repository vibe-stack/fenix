import { createBurstEmitter, createScalarEmitter, createVelocityEmitter, createIgniterEmitter, createLight, type NewFilePreset } from './types'

// Nuclear detonation — critical physics constraint:
// dx = worldSize / 128 = 4.06 m/voxel at worldSize=520
// voxelSpeedLimit = 80 / dx = ~20 voxels/s max
// So ALL velocity/burst speeds must stay well under 20.
// The mushroom forms naturally: fast rising stem stalls at height → buoyancy
// spreads it radially → vorticity rolls the cap. No emitters needed at cap height.
export const nuclearDetonationPreset: NewFilePreset = {
  id: 'nuclear-detonation',
  label: 'Nuclear Detonation',
  description: 'Ground fireball, fast rising stem, and naturally stalling toroidal mushroom cap.',
  emitters: [
    // Initial fireball — compact, intense, very brief burst at ground level.
    // Low density (combustion will generate smoke), high heat+fuel.
    createBurstEmitter('Ground Fireball', {
      positionX: 0.5, positionY: 0.07, positionZ: 0.5,
      radius: 0.06,
      startTime: 0,
      duration: 0.15,
      densityAmount: 0.1,
      heatAmount: 1.0,
      fuelAmount: 1.0,
      reactionAmount: 1.0,
      expansionSpeed: 16,
      liftSpeed: 12,
      turbulenceSpeed: 8,
      falloff: 0.3,
      noiseScale: 24,
      noiseMix: 0.82,
      seed: 1101,
    }),
    // Igniter seeds the reaction field to combust the fuel
    createIgniterEmitter('Ignition', {
      positionX: 0.5, positionY: 0.07, positionZ: 0.5,
      radius: 0.08,
      startTime: 0,
      duration: 0.2,
      intensity: 1.0,
      seed: 1103,
    }),
    // Narrow stem feed — tight continuous source at low height.
    // Heat drives buoyancy to lift the column upward.
    createScalarEmitter('Stem Feed', {
      positionX: 0.5, positionY: 0.075, positionZ: 0.5,
      radius: 0.016,
      startTime: 0.1,
      duration: 6.0,
      densityRate: 1.2,
      heatRate: 4.5,
      fuelRate: 1.0,
      noiseScale: 32,
      noiseMix: 0.88,
      seed: 1107,
    }),
    // Stem jet — stays under the speed limit (dx=4.06, limit≈20 vox/s).
    // Tight tightness to form a column not a sphere.
    createVelocityEmitter('Stem Jet', {
      positionX: 0.5, positionY: 0.075, positionZ: 0.5,
      radius: 0.022,
      startTime: 0.08,
      duration: 6.0,
      mode: 'directional',
      speed: 17,
      directionX: 0.01, directionY: 1, directionZ: -0.008,
      falloff: 0.94,
      tightness: 0.8,
      seed: 1113,
    }),
    // Ground dust surge — flat low ring expanding outward
    createBurstEmitter('Ground Dust Surge', {
      positionX: 0.5, positionY: 0.042, positionZ: 0.5,
      radius: 0.25,
      startTime: 0.2,
      duration: 0.6,
      densityAmount: 0.6,
      heatAmount: 0.02,
      fuelAmount: 0,
      reactionAmount: 0,
      expansionSpeed: 14,
      liftSpeed: -2,
      turbulenceSpeed: 6,
      falloff: 0.72,
      noiseScale: 14,
      noiseMix: 0.68,
      seed: 1141,
    }),
    // Stem turbulence — breaks up the column so it isn't a perfect tube.
    // Fires midway up as the column rises.
    createVelocityEmitter('Column Churn', {
      positionX: 0.5, positionY: 0.25, positionZ: 0.5,
      radius: 0.06,
      startTime: 1.5,
      duration: 5.0,
      mode: 'turbulent',
      speed: 6,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.85,
      tightness: 0.06,
      seed: 1121,
    }),
  ],
  lights: [
    createLight('Nuclear Flash', {
      lightType: 'directional',
      dirX: -0.08, dirY: 1, dirZ: 0.04,
      posX: 0.5, posY: 0.5, posZ: 0.5,
      intensity: 5.5,
      colorR: 1.0, colorG: 0.97, colorB: 0.85,
    }),
  ],
  runtimeParams: {
    wind: [0.008, 0, -0.004],
    windStrength: 0.05,
    gravity: [0, -1, 0],
    gravityStrength: 0.35,
    // High buoyancy is what forms the mushroom: hot gas rises fast,
    // stalls at the top of the thermal column, and spreads radially.
    buoyancy: 12.0,
    vorticityStrength: 4.5,
    vorticityConstantMask: 0.5,
    vorticityVelocityMask: 0.8,
    vorticityHeatMask: 1.8,
    vorticityDensityMask: 0.4,
    worldSize: 520,
  },
  renderOutput: {
    stepCount: 580,
    scatteringForward: 0.24,
    scatteringBack: -0.07,
  },
}

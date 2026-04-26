import { createBurstEmitter, createScalarEmitter, createVelocityEmitter, createIgniterEmitter, createLight, type NewFilePreset } from './types'

// Fuel tank explosion: BLEVE (boiling liquid expanding vapor explosion).
// Key visuals that were missing:
// 1. The FUEL — burning liquid hydrocarbon makes an orange-yellow rolling fireball, NOT gray smoke
// 2. The fireball rolls and rises — it's buoyant burning gas, not a static sphere
// 3. BLACK smoke column rises from the burning pool AFTER the fireball lifts off
// 4. Ground debris/shrapnel pushes dust radially at low level
// Fix: use fuel+heat (not density) for the fireball so combustion produces the visual.
// The burning fuel column should sustain for seconds as the pool burns.
export const fuelTankExplosionPreset: NewFilePreset = {
  id: 'fuel-tank-explosion',
  label: 'Fuel Tank Explosion',
  description: 'BLEVE fireball lifts off and rolls while a black soot column rises from the burning pool below.',
  emitters: [
    // Tank rupture — sudden release of pressurized fuel vapor. Dense fuel cloud, minimal density.
    createBurstEmitter('Tank Rupture', {
      positionX: 0.5, positionY: 0.08, positionZ: 0.5,
      radius: 0.072,
      startTime: 0,
      duration: 0.1,
      densityAmount: 0.05,
      heatAmount: 0.85,
      fuelAmount: 1.95,
      reactionAmount: 0.4,
      expansionSpeed: 95,
      liftSpeed: 28,
      turbulenceSpeed: 42,
      falloff: 0.36,
      noiseScale: 20,
      noiseMix: 0.76,
      seed: 1411,
    }),
    // Ignition — ignites the fuel cloud immediately
    createIgniterEmitter('Vapor Ignition', {
      positionX: 0.5, positionY: 0.08, positionZ: 0.5,
      radius: 0.09,
      startTime: 0.02,
      duration: 0.2,
      intensity: 1.0,
      seed: 1413,
    }),
    // Rolling fireball — buoyant burning gas rising and rolling. Uses fuel+heat so combustion
    // generates the orange glow organically. This is the KEY element that was missing.
    createScalarEmitter('Burning Vapor Cloud', {
      positionX: 0.5, positionY: 0.12, positionZ: 0.5,
      radius: 0.068,
      startTime: 0.08,
      duration: 1.6,
      densityRate: 0.08,
      heatRate: 8.5,
      fuelRate: 9.2,
      noiseScale: 22,
      noiseMix: 0.72,
      seed: 1421,
    }),
    // Fireball lift — the burning gas is buoyant and rises as a rolling ball
    createVelocityEmitter('Fireball Lift', {
      positionX: 0.5, positionY: 0.14, positionZ: 0.5,
      radius: 0.095,
      startTime: 0.06,
      duration: 2.2,
      mode: 'directional',
      speed: 38,
      directionX: 0.08, directionY: 1, directionZ: -0.05,
      falloff: 0.72,
      tightness: 0.28,
      seed: 1431,
    }),
    // Fireball roll — the characteristic tumbling of a BLEVE fireball
    createVelocityEmitter('Fireball Roll', {
      positionX: 0.52, positionY: 0.22, positionZ: 0.49,
      radius: 0.14,
      startTime: 0.35,
      duration: 2.8,
      mode: 'turbulent',
      speed: 22,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.64,
      tightness: 0.08,
      seed: 1439,
    }),
    // Burning pool — the spilled fuel burning on the ground after the fireball lifts off.
    // High fuel + heat → combustion → dense black smoke. This is the soot source.
    createScalarEmitter('Pool Fire Feed', {
      positionX: 0.5, positionY: 0.062, positionZ: 0.5,
      radius: 0.058,
      startTime: 0.3,
      duration: 6.5,
      densityRate: 0.15,
      heatRate: 12.0,
      fuelRate: 11.5,
      noiseScale: 28,
      noiseMix: 0.82,
      seed: 1447,
    }),
    // Pool fire updraft — tight column above the burning pool
    createVelocityEmitter('Pool Fire Column', {
      positionX: 0.5, positionY: 0.075, positionZ: 0.5,
      radius: 0.062,
      startTime: 0.3,
      duration: 6.5,
      mode: 'directional',
      speed: 28,
      directionX: 0.04, directionY: 1, directionZ: -0.02,
      falloff: 0.88,
      tightness: 0.52,
      seed: 1453,
    }),
    // Black soot column — rises above the pool fire, dense and dark
    createScalarEmitter('Black Soot Column', {
      positionX: 0.52, positionY: 0.18, positionZ: 0.49,
      radius: 0.04,
      startTime: 1.2,
      duration: 7.0,
      densityRate: 2.2,
      heatRate: 0.65,
      fuelRate: 0.12,
      noiseScale: 26,
      noiseMix: 0.85,
      seed: 1459,
    }),
    // Ground debris — shrapnel pushes dust radially at low level
    createBurstEmitter('Tank Shell Debris', {
      positionX: 0.5, positionY: 0.048, positionZ: 0.5,
      radius: 0.22,
      startTime: 0.15,
      duration: 0.38,
      densityAmount: 0.35,
      heatAmount: 0,
      fuelAmount: 0,
      reactionAmount: 0,
      expansionSpeed: 32,
      liftSpeed: -3,
      turbulenceSpeed: 28,
      falloff: 0.58,
      noiseScale: 14,
      noiseMix: 0.65,
      seed: 1471,
    }),
  ],
  lights: [
    createLight('Industrial Yard Sun', {
      lightType: 'directional',
      dirX: -0.26, dirY: 0.93, dirZ: 0.24,
      posX: 0.5, posY: 0.86, posZ: 0.5,
      intensity: 2.2,
      colorR: 1.0, colorG: 0.94, colorB: 0.84,
    }),
  ],
  runtimeParams: {
    wind: [0.048, 0, -0.022],
    windStrength: 0.28,
    gravity: [0, -1, 0],
    gravityStrength: 0.42,
    buoyancy: 7.2,
    vorticityStrength: 4.5,
    vorticityConstantMask: 0.5,
    vorticityVelocityMask: 0.65,
    vorticityHeatMask: 1.2,
    vorticityDensityMask: 0.3,
    worldSize: 75,
  },
  renderOutput: {
    stepCount: 520,
    scatteringForward: 0.2,
    scatteringBack: -0.08,
  },
}

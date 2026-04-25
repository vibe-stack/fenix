import { createScalarEmitter, createVelocityEmitter, createIgniterEmitter, createLight, type NewFilePreset } from './types'

export const nuclearDetonationPreset: NewFilePreset = {
  id: 'nuclear-detonation',
  label: 'Nuclear Detonation',
  description: 'Massive fireball rising into a mushroom column with a ground-level blast wave.',
  emitters: [
    createScalarEmitter('Fireball', {
      positionX: 0.5, positionY: 0.12, positionZ: 0.5,
      radius: 0.13,
      startTime: 0, duration: 0.4,
      densityRate: 6, heatRate: 30, fuelRate: 20,
      noiseScale: 80, noiseMix: 0.95, seed: 11,
    }),
    createVelocityEmitter('Primary Shockwave', {
      positionX: 0.5, positionY: 0.12, positionZ: 0.5,
      radius: 0.14, startTime: 0, duration: 0.18,
      mode: 'radial', speed: 200,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.2, seed: 13,
    }),
    createVelocityEmitter('Stem Jet', {
      positionX: 0.5, positionY: 0.1, positionZ: 0.5,
      radius: 0.04, startTime: 0.05, duration: 3.0,
      mode: 'directional', speed: 80,
      directionX: 0, directionY: 1, directionZ: 0,
      falloff: 0.8, seed: 17,
    }),
    createScalarEmitter('Stem Smoke', {
      positionX: 0.5, positionY: 0.15, positionZ: 0.5,
      radius: 0.055, startTime: 0.2, duration: 4.0,
      densityRate: 4, heatRate: 2, fuelRate: 0,
      noiseScale: 50, noiseMix: 0.8, seed: 19,
    }),
    createScalarEmitter('Mushroom Cap', {
      positionX: 0.5, positionY: 0.28, positionZ: 0.5,
      radius: 0.12, startTime: 0.5, duration: 5.0,
      densityRate: 5, heatRate: 4, fuelRate: 1,
      noiseScale: 70, noiseMix: 0.85, seed: 23,
    }),
    createVelocityEmitter('Cap Spread', {
      positionX: 0.5, positionY: 0.28, positionZ: 0.5,
      radius: 0.14, startTime: 0.5, duration: 3.0,
      mode: 'radial', speed: 25,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.6, seed: 29,
    }),
    createVelocityEmitter('Ground Blast', {
      positionX: 0.5, positionY: 0.06, positionZ: 0.5,
      radius: 0.18, startTime: 0.02, duration: 0.5,
      mode: 'radial', speed: 120,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.3, seed: 31,
    }),
    createScalarEmitter('Ground Debris', {
      positionX: 0.5, positionY: 0.055, positionZ: 0.5,
      radius: 0.2, startTime: 0.05, duration: 6.0,
      densityRate: 3, heatRate: 0, fuelRate: 0,
      noiseScale: 35, noiseMix: 0.7, seed: 37,
    }),
    createIgniterEmitter('Zero Point', {
      positionX: 0.5, positionY: 0.12, positionZ: 0.5,
      radius: 0.14, startTime: 0, duration: 0.08,
      intensity: 1.0, seed: 41,
    }),
  ],
  lights: [
    createLight('Flash', {
      lightType: 'directional',
      dirX: 0, dirY: 1, dirZ: 0,
      posX: 0.5, posY: 0.5, posZ: 0.5,
      intensity: 4.5,
      colorR: 1.0, colorG: 0.98, colorB: 0.9,
    }),
  ],
  runtimeParams: {
    wind: [0.02, 0, -0.01],
    windStrength: 0.08,
    buoyancy: 8.0,
    vorticityStrength: 6.0,
    worldSize: 500,
  },
  renderOutput: {
    stepCount: 480,
    scatteringForward: 0.3,
    scatteringBack: -0.12,
  },
}

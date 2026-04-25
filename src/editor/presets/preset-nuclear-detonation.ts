import { createScalarEmitter, createVelocityEmitter, createIgniterEmitter, createLight, type NewFilePreset } from './types'

export const nuclearDetonationPreset: NewFilePreset = {
  id: 'nuclear-detonation',
  label: 'Nuclear Detonation',
  description: 'Timed fireball, stem draw, cap rollout, and delayed base dust surge.',
  emitters: [
    createScalarEmitter('Initial Fireball', {
      positionX: 0.5, positionY: 0.12, positionZ: 0.5,
      radius: 0.13,
      startTime: 0, duration: 0.32,
      densityRate: 3.8, heatRate: 24, fuelRate: 13,
      noiseScale: 80, noiseMix: 0.95, seed: 11,
    }),
    createVelocityEmitter('Fireball Impulse', {
      positionX: 0.5, positionY: 0.12, positionZ: 0.5,
      radius: 0.14, startTime: 0, duration: 0.18,
      mode: 'radial', speed: 150,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.2, seed: 13,
    }),
    createVelocityEmitter('Stem Jet', {
      positionX: 0.5, positionY: 0.1, positionZ: 0.5,
      radius: 0.05, startTime: 0.18, duration: 3.5,
      mode: 'directional', speed: 42,
      directionX: 0, directionY: 1, directionZ: 0,
      falloff: 0.82, seed: 17,
    }),
    createScalarEmitter('Stem Smoke', {
      positionX: 0.5, positionY: 0.145, positionZ: 0.5,
      radius: 0.06, startTime: 0.45, duration: 5.2,
      densityRate: 2.7, heatRate: 1.2, fuelRate: 0,
      noiseScale: 42, noiseMix: 0.78, seed: 19,
    }),
    createScalarEmitter('Mushroom Cap', {
      positionX: 0.5, positionY: 0.31, positionZ: 0.5,
      radius: 0.135, startTime: 1.35, duration: 4.4,
      densityRate: 2.6, heatRate: 1.1, fuelRate: 0.2,
      noiseScale: 46, noiseMix: 0.82, seed: 23,
    }),
    createVelocityEmitter('Cap Spread', {
      positionX: 0.5, positionY: 0.31, positionZ: 0.5,
      radius: 0.15, startTime: 1.25, duration: 2.8,
      mode: 'radial', speed: 18,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.6, seed: 29,
    }),
    createVelocityEmitter('Ground Blast', {
      positionX: 0.5, positionY: 0.06, positionZ: 0.5,
      radius: 0.18, startTime: 0.08, duration: 0.42,
      mode: 'radial', speed: 72,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.3, seed: 31,
    }),
    createScalarEmitter('Base Dust Roll', {
      positionX: 0.5, positionY: 0.055, positionZ: 0.5,
      radius: 0.22, startTime: 0.55, duration: 6.2,
      densityRate: 1.9, heatRate: 0, fuelRate: 0,
      noiseScale: 26, noiseMix: 0.68, seed: 37,
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
    wind: [0.018, 0, -0.008],
    windStrength: 0.12,
    gravity: [0, -1, 0],
    gravityStrength: 0.45,
    buoyancy: 6.8,
    vorticityStrength: 5.4,
    worldSize: 500,
  },
  renderOutput: {
    stepCount: 480,
    scatteringForward: 0.3,
    scatteringBack: -0.12,
  },
}

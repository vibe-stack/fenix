import { createScalarEmitter, createIgniterEmitter, createLight, type NewFilePreset } from './types'

export const campfirePreset: NewFilePreset = {
  id: 'campfire',
  label: 'Campfire',
  description: 'Sustained low flame with a turbulent thermal column and drifting smoke.',
  emitters: [
    // Continuous heat and fuel — combustion pass turns these into fire and soot.
    createScalarEmitter('Flame', {
      positionX: 0.5, positionY: 0.06, positionZ: 0.5,
      radius: 0.035,
      startTime: 0,
      duration: 9999,
      densityRate: 0,    // combustion produces the soot, not us
      heatRate: 6,
      fuelRate: 8,
      noiseScale: 12,
      noiseMix: 0.5,
      seed: 607,
    }),
    // Separate wider smoke emitter — cold, no heat, just density drifting up.
    createScalarEmitter('Smoke', {
      positionX: 0.5, positionY: 0.09, positionZ: 0.5,
      radius: 0.055,
      startTime: 0.5,
      duration: 9999,
      densityRate: 1.2,
      heatRate: 0,
      fuelRate: 0,
      noiseScale: 6,
      noiseMix: 0.7,
      seed: 613,
    }),
    // Spark to ignite the fuel at t=0.
    createIgniterEmitter('Ignition', {
      positionX: 0.5, positionY: 0.065, positionZ: 0.5,
      radius: 0.04,
      startTime: 0,
      duration: 0.3,
      intensity: 0.9,
      seed: 619,
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
    gravity: [0, -1, 0],
    gravityStrength: 0.45,
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

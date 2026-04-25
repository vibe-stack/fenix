import { createScalarEmitter, createIgniterEmitter, createLight, type NewFilePreset } from './types'

export const oilWellFirePreset: NewFilePreset = {
  id: 'oil-well-fire',
  label: 'Oil Well Fire',
  description: 'Tight intensely hot flame feeding a dense sooty column sheared by crosswind.',
  emitters: [
    // Intense fuel-rich flame base.
    createScalarEmitter('Flame Base', {
      positionX: 0.5, positionY: 0.055, positionZ: 0.5,
      radius: 0.03,
      startTime: 0,
      duration: 9999,
      densityRate: 0,
      heatRate: 14,
      fuelRate: 16,
      noiseScale: 8,
      noiseMix: 0.3,
      seed: 811,
    }),
    // Dense black soot column above the flame.
    createScalarEmitter('Soot Column', {
      positionX: 0.5, positionY: 0.1, positionZ: 0.5,
      radius: 0.065,
      startTime: 1.5,
      duration: 9999,
      densityRate: 5,
      heatRate: 0.5,
      fuelRate: 0,
      noiseScale: 18,
      noiseMix: 0.65,
      seed: 827,
    }),
    // Jet of upward velocity to drive the column.
    createScalarEmitter('Thermal Draft', {
      positionX: 0.5, positionY: 0.07, positionZ: 0.5,
      radius: 0.025,
      startTime: 0,
      duration: 9999,
      densityRate: 0,
      heatRate: 4,
      fuelRate: 2,
      noiseScale: 5,
      noiseMix: 0.2,
      seed: 839,
    }),
    createIgniterEmitter('Ignition', {
      positionX: 0.5, positionY: 0.06, positionZ: 0.5,
      radius: 0.04,
      startTime: 0,
      duration: 0.2,
      intensity: 1.0,
      seed: 853,
    }),
  ],
  lights: [
    createLight('Harsh Noon Sun', {
      lightType: 'directional',
      dirX: -0.18, dirY: 0.96, dirZ: 0.22,
      posX: 0.5, posY: 0.9, posZ: 0.5,
      intensity: 2.8,
      colorR: 1.0, colorG: 0.97, colorB: 0.92,
    }),
  ],
  runtimeParams: {
    wind: [0.08, 0, -0.035],
    windStrength: 0.55,
    buoyancy: 5.0,
    vorticityStrength: 2.6,
    worldSize: 30,
  },
  renderOutput: {
    stepCount: 360,
    scatteringForward: 0.18,
    scatteringBack: -0.06,
  },
}

import { createLight, type NewFilePreset } from './types'

export const blankPreset: NewFilePreset = {
  id: 'blank',
  label: 'Blank',
  description: 'Empty graph with neutral fluid motion.',
  emitters: [],
  lights: [
    createLight('Key Light', {
      lightType: 'directional',
      dirX: -0.34, dirY: 0.88, dirZ: 0.31,
      posX: 0.5, posY: 0.8, posZ: 0.5,
      intensity: 1.25,
      colorR: 1.0, colorG: 0.95, colorB: 0.88,
    }),
  ],
  runtimeParams: {
    wind: [0, 0, 0],
    windStrength: 0,
    buoyancy: 3.6,
    vorticityStrength: 2.15,
  },
  renderOutput: {
    stepCount: 400,
    scatteringForward: 0.32,
    scatteringBack: -0.18,
  },
}

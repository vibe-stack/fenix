import { createScalarEmitter, createVelocityEmitter, createIgniterEmitter, createLight, type NewFilePreset } from './types'

export const volcanicEruptionPreset: NewFilePreset = {
  id: 'volcanic-eruption',
  label: 'Volcanic Eruption',
  description: 'High-momentum Plinian vent column with a pyroclastic base surge.',
  emitters: [
    // Hot gas and ash from the vent.
    createScalarEmitter('Vent Ejecta', {
      positionX: 0.5, positionY: 0.055, positionZ: 0.5,
      radius: 0.045,
      startTime: 0,
      duration: 9999,
      densityRate: 3,
      heatRate: 12,
      fuelRate: 1.5,
      noiseScale: 10,
      noiseMix: 0.35,
      seed: 501,
    }),
    // Strong upward jet to drive the column.
    createVelocityEmitter('Vent Jet', {
      positionX: 0.5, positionY: 0.058, positionZ: 0.5,
      radius: 0.038,
      startTime: 0,
      duration: 9999,
      mode: 'directional',
      speed: 60,
      directionX: 0, directionY: 1, directionZ: 0,
      falloff: 0.7,
      seed: 509,
    }),
    // Wide dense pyroclastic surge along the ground.
    createScalarEmitter('Base Surge', {
      positionX: 0.5, positionY: 0.05, positionZ: 0.5,
      radius: 0.12,
      startTime: 2.5,
      duration: 9999,
      densityRate: 2.5,
      heatRate: 0.8,
      fuelRate: 0,
      noiseScale: 24,
      noiseMix: 0.75,
      seed: 523,
    }),
    // Radial shockwave of the surge spreading outward.
    createVelocityEmitter('Surge Spread', {
      positionX: 0.5, positionY: 0.052, positionZ: 0.5,
      radius: 0.14,
      startTime: 2.5,
      duration: 4.0,
      mode: 'radial',
      speed: 18,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.4,
      seed: 541,
    }),
    createIgniterEmitter('Ignition', {
      positionX: 0.5, positionY: 0.06, positionZ: 0.5,
      radius: 0.05,
      startTime: 0,
      duration: 0.5,
      intensity: 0.8,
      seed: 557,
    }),
  ],
  lights: [
    createLight('Tropical Sun', {
      lightType: 'directional',
      dirX: -0.22, dirY: 0.94, dirZ: 0.26,
      posX: 0.5, posY: 0.9, posZ: 0.5,
      intensity: 2.4,
      colorR: 1.0, colorG: 0.98, colorB: 0.88,
    }),
  ],
  runtimeParams: {
    wind: [0.042, 0, -0.022],
    windStrength: 0.25,
    gravity: [0, -1, 0],
    gravityStrength: 0.45,
    buoyancy: 7.2,
    vorticityStrength: 3.8,
    worldSize: 200,
  },
  renderOutput: {
    stepCount: 440,
    scatteringForward: 0.24,
    scatteringBack: -0.1,
  },
}

import { createEmitter, createLight, type NewFilePreset } from './types'

// Plinian volcanic eruption. Uses the long-blastDuration sustained emission
// approach (same mechanism as campfire). The vent fires as a single tight,
// very high-impulse source. The convective broadening and ash umbrella emerge
// from the fluid dynamics — buoyancy + vorticity carry material upward and
// the column naturally widens. A second wide low-impulse source adds
// dense pyroclastic density current along the base.
export const volcanicEruptionPreset: NewFilePreset = {
  id: 'volcanic-eruption',
  label: 'Volcanic Eruption',
  description: 'High-momentum Plinian vent column with a pyroclastic base surge.',
  emitters: [
    // Main vent — sustained, high coreLift to drive material upward as a column.
    // Low radialImpulse (it's not an explosion), very high liftImpulse.
    createEmitter('Vent Column', {
      position: [0.5, 0.058, 0.5],
      radius: 0.052,
      startTime: 0,
      smokeLeadTime: 0,
      blastDuration: 28,
      plumeDuration: 60,
      densityYield: 2.4,
      heatYield: 14,
      fuelYield: 3.8,
      reactionYield: 1.4,
      radialImpulse: 4.5,
      liftDirection: [0, 1, 0],
      liftImpulse: 18,
      heatPatchiness: 0.38,
      patchScale: 12,
      coreHeat: 6.5,
      coreLift: 32,
      turbulence: 5.0,
      crumbleStrength: 3.5,
      implosionStrength: 0,
      expansionRate: 0.32,
      sustain: 3.8,
      mushroomStrength: 0.15,
      smokeEntrainment: 1.6,
      seed: 501,
    }),
    // Pyroclastic surge — wide, dense, very low, nearly no heat.
    // Fires after the vent establishes. Low impulse spreads radially outward.
    createEmitter('Base Surge', {
      position: [0.5, 0.052, 0.5],
      radius: 0.11,
      startTime: 2.5,
      smokeLeadTime: 0,
      blastDuration: 26,
      plumeDuration: 60,
      densityYield: 2.0,
      heatYield: 1.5,
      fuelYield: 0.5,
      reactionYield: 0.12,
      radialImpulse: 3.5,
      liftDirection: [0.03, 1, -0.02],
      liftImpulse: 2.8,
      heatPatchiness: 0.78,
      patchScale: 28,
      coreHeat: 0.4,
      coreLift: 1.8,
      turbulence: 5.5,
      crumbleStrength: 3.8,
      implosionStrength: 0,
      expansionRate: 1.05,
      sustain: 2.5,
      mushroomStrength: 0.2,
      smokeEntrainment: 1.0,
      seed: 523,
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
    buoyancy: 7.2,
    vorticityStrength: 3.8,
  },
  renderOutput: {
    stepCount: 440,
    scatteringForward: 0.24,
    scatteringBack: -0.1,
  },
}

export interface SimulationDefaults {
  domainResolution: [number, number, number]
  sparseBrickSize: number
  solver: string
  stepRateHz: number
  temperatureBuoyancy: number
  combustionEnabled: boolean
  cacheStrategy: string
}

export const simulationDefaults: SimulationDefaults = {
  domainResolution: [128, 256, 128],
  sparseBrickSize: 8,
  solver: 'mac-cormack',
  stepRateHz: 60,
  temperatureBuoyancy: 0.48,
  combustionEnabled: true,
  cacheStrategy: 'deferred sparse pages',
}

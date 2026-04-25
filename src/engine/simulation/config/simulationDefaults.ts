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
  domainResolution: [90, 164, 90],
  sparseBrickSize: 128,
  solver: 'mac-cormack',
  stepRateHz: 120,
  temperatureBuoyancy: 0.64,
  combustionEnabled: true,
  cacheStrategy: 'deferred sparse pages',
}

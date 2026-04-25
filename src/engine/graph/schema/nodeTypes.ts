export interface GraphNodeDefinition {
  id: string
  label: string
  category: string
  description: string
}

export const foundationalNodeTypes: GraphNodeDefinition[] = [
  {
    id: 'emitter-source',
    label: 'Emitter Source',
    category: 'Emitters',
    description: 'Seeds density, temperature, and velocity into the simulation domain.',
  },
  {
    id: 'combustion',
    label: 'Combustion',
    category: 'Combustion',
    description: 'Controls burn, cooling, and fuel reaction shaping for fire-style effects.',
  },
  {
    id: 'advection',
    label: 'Advection',
    category: 'Solvers',
    description: 'Advects scalar and vector fields through the velocity domain each step.',
  },
  {
    id: 'vorticity',
    label: 'Vorticity',
    category: 'Forces',
    description: 'Controls curl confinement strength to preserve rotational detail.',
  },
  {
    id: 'light',
    label: 'Light',
    category: 'Lighting',
    description: 'Directional viewport light with color and intensity controls.',
  },
  {
    id: 'render-output',
    label: 'Render Output',
    category: 'Output',
    description: 'Collects simulation fields and prepares them for viewport and export targets.',
  },
]

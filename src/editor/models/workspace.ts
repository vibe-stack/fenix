import type { GraphNodeDefinition } from '../../engine/graph/schema/nodeTypes'
import type { VolumeDisplayMode } from '../../engine/render/volumetrics/volumeDisplayMode'
import type { SimulationDefaults } from '../../engine/simulation/config/simulationDefaults'

export interface AppState {
  productName: string
  workspaceStage: string
  branchLabel: string
}

export interface ProjectState {
  name: string
  author: string
  units: string
  savedRevision: string
}

export type ViewportShadingMode = VolumeDisplayMode
export type SimulationProfile =
  | 'Combustion Authoring Baseline'
  | 'Sparse Smoke Blocking'
  | 'Explosive Burst Draft'

export interface GraphState {
  activeGraph: string
  selectedNodeId: string
  nodeCatalog: GraphNodeDefinition[]
}

export interface ViewportState {
  activeCamera: string
  shadingMode: ViewportShadingMode
  overlays: string[]
}

export interface SimulationState extends SimulationDefaults {
  profile: SimulationProfile
}

export interface EditorSnapshot {
  appState: AppState
  graphState: GraphState
  projectState: ProjectState
  simulationState: SimulationState
  viewportState: ViewportState
}

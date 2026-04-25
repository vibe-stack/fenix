import type { GraphNodeDefinition } from '../../engine/graph/schema/nodeTypes'
import type { VolumeDisplayMode } from '../../engine/render/volumetrics/volumeDisplayMode'
import type { SimulationDefaults } from '../../engine/simulation/config/simulationDefaults'
import type {
  SimulationQualitySettings,
  SimulationRuntimeParams,
} from '../../engine/simulation/runtime/combustion-volume-simulation/types'

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

export interface ViewportBackgroundState {
  imageDataUrl: string | null
  imageName: string | null
  offsetX: number
  offsetY: number
  scale: number
  color: string
}

export interface ViewportState {
  activeCamera: string
  shadingMode: ViewportShadingMode
  overlays: string[]
  background: ViewportBackgroundState
}

export interface SimulationState extends SimulationDefaults {
  profile: SimulationProfile
  runtimeParams: SimulationRuntimeParams
  qualitySettings: SimulationQualitySettings
}

export interface EditorSnapshot {
  appState: AppState
  graphState: GraphState
  projectState: ProjectState
  simulationState: SimulationState
  viewportState: ViewportState
}

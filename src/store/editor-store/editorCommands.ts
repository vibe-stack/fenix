import type {
  SimulationProfile,
  ViewportShadingMode,
} from '../../editor/models/workspace'

export type EditorCommand =
  | {
      type: 'project/set-name'
      name: string
    }
  | {
      type: 'graph/select-node'
      nodeId: string
    }
  | {
      type: 'viewport/set-shading-mode'
      shadingMode: ViewportShadingMode
    }
  | {
      type: 'viewport/toggle-overlay'
      overlay: string
    }
  | {
      type: 'viewport/set-background-image'
      imageDataUrl: string | null
      imageName: string | null
    }
  | {
      type: 'viewport/set-background-offset'
      offsetX: number
      offsetY: number
    }
  | {
      type: 'viewport/set-background-scale'
      scale: number
    }
  | {
      type: 'simulation/set-profile'
      profile: SimulationProfile
    }
  | {
      type: 'simulation/set-domain-resolution'
      resolution: [number, number, number]
    }

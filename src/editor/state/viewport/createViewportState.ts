import type { ViewportState } from '../../models/workspace'

export function createViewportState(): ViewportState {
  return {
    activeCamera: 'Perspective',
    shadingMode: 'temperature',
    overlays: ['bounds', 'guides', 'stats'],
  }
}

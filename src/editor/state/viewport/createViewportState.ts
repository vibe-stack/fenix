import type { ViewportState } from '../../models/workspace'

export function createViewportState(): ViewportState {
  return {
    activeCamera: 'Perspective',
    shadingMode: 'temperature',
    overlays: ['bounds', 'guides', 'stats'],
    background: {
      imageDataUrl: null,
      imageName: null,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      color: '#0d0a09',
    },
  }
}

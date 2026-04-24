import type { EditorSnapshot } from '../../editor/models/workspace'
import type { EditorCommand } from './editorCommands'

type Listener = () => void

export interface EditorStore {
  getSnapshot(): EditorSnapshot
  subscribe(listener: Listener): () => void
  dispatch(command: EditorCommand): void
}

export function createEditorStore(initialSnapshot: EditorSnapshot): EditorStore {
  let snapshot = initialSnapshot
  const listeners = new Set<Listener>()

  return {
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    dispatch(command) {
      snapshot = reduceEditorSnapshot(snapshot, command)
      listeners.forEach((listener) => listener())
    },
  }
}

function reduceEditorSnapshot(
  snapshot: EditorSnapshot,
  command: EditorCommand,
): EditorSnapshot {
  switch (command.type) {
    case 'project/set-name': {
      return {
        ...snapshot,
        projectState: {
          ...snapshot.projectState,
          name: command.name,
        },
      }
    }

    case 'graph/select-node': {
      return {
        ...snapshot,
        graphState: {
          ...snapshot.graphState,
          selectedNodeId: command.nodeId,
        },
      }
    }

    case 'viewport/set-shading-mode': {
      return {
        ...snapshot,
        viewportState: {
          ...snapshot.viewportState,
          shadingMode: command.shadingMode,
        },
      }
    }

    case 'viewport/toggle-overlay': {
      const overlaySet = new Set(snapshot.viewportState.overlays)

      if (overlaySet.has(command.overlay)) {
        overlaySet.delete(command.overlay)
      } else {
        overlaySet.add(command.overlay)
      }

      return {
        ...snapshot,
        viewportState: {
          ...snapshot.viewportState,
          overlays: Array.from(overlaySet),
        },
      }
    }

    case 'viewport/set-background-image': {
      return {
        ...snapshot,
        viewportState: {
          ...snapshot.viewportState,
          background: {
            ...snapshot.viewportState.background,
            imageDataUrl: command.imageDataUrl,
            imageName: command.imageName,
          },
        },
      }
    }

    case 'viewport/set-background-offset': {
      return {
        ...snapshot,
        viewportState: {
          ...snapshot.viewportState,
          background: {
            ...snapshot.viewportState.background,
            offsetX: command.offsetX,
            offsetY: command.offsetY,
          },
        },
      }
    }

    case 'viewport/set-background-scale': {
      return {
        ...snapshot,
        viewportState: {
          ...snapshot.viewportState,
          background: {
            ...snapshot.viewportState.background,
            scale: command.scale,
          },
        },
      }
    }

    case 'simulation/set-profile': {
      return {
        ...snapshot,
        simulationState: {
          ...snapshot.simulationState,
          profile: command.profile,
        },
      }
    }

    case 'simulation/set-domain-resolution': {
      return {
        ...snapshot,
        simulationState: {
          ...snapshot.simulationState,
          domainResolution: command.resolution,
        },
      }
    }
  }
}

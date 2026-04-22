import type { AppState } from '../../models/workspace'

export function createAppState(): AppState {
  return {
    productName: 'Fenix',
    workspaceStage: 'foundation',
    branchLabel: 'Pass 01',
  }
}

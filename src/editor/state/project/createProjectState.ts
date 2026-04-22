import type { ProjectState } from '../../models/workspace'

export function createProjectState(): ProjectState {
  return {
    name: 'Untitled Combustion Study',
    author: 'Local Workspace',
    units: 'meters',
    savedRevision: 'rev a0',
  }
}

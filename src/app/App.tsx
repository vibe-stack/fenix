import { useState } from 'react'
import { EditorLayout } from './layout/EditorLayout'
import { EditorStoreProvider } from './providers/EditorStoreProvider'
import { createEditorBootstrap } from '../editor/services/bootstrap/createEditorBootstrap'
import { useViewportDiagnostics } from '../features/viewport/useViewportDiagnostics'
import { createEditorStore } from '../store/editor-store/createEditorStore'

export function App() {
  const [bootstrap] = useState(createEditorBootstrap)
  const [editorStore] = useState(() => createEditorStore(bootstrap.initialSnapshot))
  const diagnostics = useViewportDiagnostics(bootstrap.rendererBridge)

  return (
    <EditorStoreProvider store={editorStore}>
      <EditorLayout rendererBridge={bootstrap.rendererBridge} diagnostics={diagnostics} />
    </EditorStoreProvider>
  )
}

export default App

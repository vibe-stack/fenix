import type { ReactNode } from 'react'
import { EditorStoreContext } from './editorStoreContext'
import type { EditorStore } from '../../store/editor-store/createEditorStore'

interface EditorStoreProviderProps {
  children: ReactNode
  store: EditorStore
}

export function EditorStoreProvider({
  children,
  store,
}: EditorStoreProviderProps) {
  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  )
}

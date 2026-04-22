import { createContext, useContext } from 'react'
import type { EditorStore } from '../../store/editor-store/createEditorStore'

export const EditorStoreContext = createContext<EditorStore | null>(null)

export function useEditorStoreContext() {
  const store = useContext(EditorStoreContext)

  if (!store) {
    throw new Error('EditorStoreProvider is missing from the app tree.')
  }

  return store
}

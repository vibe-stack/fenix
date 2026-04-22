import { useSyncExternalStore } from 'react'
import type { EditorSnapshot } from '../../editor/models/workspace'
import { useEditorStoreContext } from '../../app/providers/editorStoreContext'

export function useEditorStore<T>(selector: (snapshot: EditorSnapshot) => T): T {
  const store = useEditorStoreContext()
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )

  return selector(snapshot)
}

export function useEditorDispatch() {
  return useEditorStoreContext().dispatch
}

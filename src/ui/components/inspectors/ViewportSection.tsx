import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'
import { Panel } from '../panels/Panel'
import { ToggleRow } from '../common/ToggleRow'

const OVERLAYS = ['bounds', 'guides', 'stats'] as const

export function ViewportSection() {
  const dispatch = useEditorDispatch()
  const overlays = useEditorStore((s) => s.viewportState.overlays)

  return (
    <Panel title="Viewport">
      {OVERLAYS.map((overlay) => (
        <ToggleRow
          key={overlay}
          label={overlay}
          value={overlays.includes(overlay)}
          onChange={() => dispatch({ type: 'viewport/toggle-overlay', overlay })}
        />
      ))}
    </Panel>
  )
}

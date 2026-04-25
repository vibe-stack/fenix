import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'
import { Panel } from '../panels/Panel'
import { SliderRow } from '../common/SliderRow'
import { SectionDivider } from '../common/SectionDivider'
import { StatRow } from '../common/StatRow'

export function SimulationParamsSection() {
  const dispatch = useEditorDispatch()
  const { runtimeParams, qualitySettings, solver, stepRateHz, sparseBrickSize } = useEditorStore(
    (s) => s.simulationState,
  )

  function setParam<K extends keyof typeof runtimeParams>(key: K, value: typeof runtimeParams[K]) {
    dispatch({ type: 'simulation/set-runtime-params', params: { [key]: value } })
  }

  function setQuality<K extends keyof typeof qualitySettings>(
    key: K,
    value: typeof qualitySettings[K],
  ) {
    dispatch({ type: 'simulation/set-quality-settings', settings: { [key]: value } })
  }

  return (
    <Panel title="Simulation">
      <SectionDivider label="Domain" />
      <SliderRow
        label="World Size"
        value={runtimeParams.worldSize}
        min={1}
        max={2000}
        step={1}
        decimals={0}
        onChange={(v) => setParam('worldSize', v)}
      />

      <SectionDivider label="Solver" />
      <StatRow label="Mode" value={solver} />
      <StatRow label="Rate" value={`${stepRateHz} Hz`} />
      <StatRow label="Brick" value={`${sparseBrickSize} vox`} />

      <SectionDivider label="Cadence" />
      <SliderRow label="Pressure Every" value={qualitySettings.pressureInterval} min={1} max={8} step={1} decimals={0} onChange={(v) => setQuality('pressureInterval', v)} />
      <SliderRow label="Vorticity Every" value={qualitySettings.vorticityInterval} min={1} max={8} step={1} decimals={0} onChange={(v) => setQuality('vorticityInterval', v)} />

      <SectionDivider label="Pressure Solve" />
      <SliderRow label="Fine Pre" value={qualitySettings.finePreIterations} min={0} max={16} step={1} decimals={0} onChange={(v) => setQuality('finePreIterations', v)} />
      <SliderRow label="Fine Post" value={qualitySettings.finePostIterations} min={0} max={16} step={1} decimals={0} onChange={(v) => setQuality('finePostIterations', v)} />
      <SliderRow label="Mid Pre" value={qualitySettings.midPreIterations} min={0} max={16} step={1} decimals={0} onChange={(v) => setQuality('midPreIterations', v)} />
      <SliderRow label="Mid Post" value={qualitySettings.midPostIterations} min={0} max={16} step={1} decimals={0} onChange={(v) => setQuality('midPostIterations', v)} />
      <SliderRow label="Coarse" value={qualitySettings.coarseIterations} min={0} max={32} step={1} decimals={0} onChange={(v) => setQuality('coarseIterations', v)} />

      <SectionDivider label="Notes" />
      <StatRow label="Vorticity" value="node inspector" />
      <StatRow label="Raymarch" value="render output node" />
    </Panel>
  )
}

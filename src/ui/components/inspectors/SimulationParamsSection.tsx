import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'
import { Panel } from '../panels/Panel'
import { SliderRow } from '../common/SliderRow'
import { SectionDivider } from '../common/SectionDivider'
import { StatRow } from '../common/StatRow'

export function SimulationParamsSection() {
  const dispatch = useEditorDispatch()
  const { runtimeParams, solver, stepRateHz, sparseBrickSize } = useEditorStore(
    (s) => s.simulationState,
  )

  function setParam<K extends keyof typeof runtimeParams>(key: K, value: typeof runtimeParams[K]) {
    dispatch({ type: 'simulation/set-runtime-params', params: { [key]: value } })
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

      <SectionDivider label="Fluid" />
      <SliderRow
        label="Buoyancy"
        value={runtimeParams.buoyancy}
        min={-12}
        max={24}
        step={0.05}
        onChange={(v) => setParam('buoyancy', v)}
      />
      <SliderRow
        label="Vorticity"
        value={runtimeParams.vorticityStrength}
        min={0}
        max={32}
        step={0.05}
        onChange={(v) => setParam('vorticityStrength', v)}
      />

      <SectionDivider label="Wind" />
      <SliderRow
        label="Strength"
        value={runtimeParams.windStrength}
        min={-8}
        max={16}
        step={0.05}
        onChange={(v) => setParam('windStrength', v)}
      />
      <SliderRow
        label="X"
        value={runtimeParams.wind[0]}
        min={-4}
        max={4}
        step={0.01}
        onChange={(v) =>
          dispatch({
            type: 'simulation/set-runtime-params',
            params: { wind: [v, runtimeParams.wind[1], runtimeParams.wind[2]] },
          })
        }
      />
      <SliderRow
        label="Y"
        value={runtimeParams.wind[1]}
        min={-4}
        max={4}
        step={0.01}
        onChange={(v) =>
          dispatch({
            type: 'simulation/set-runtime-params',
            params: { wind: [runtimeParams.wind[0], v, runtimeParams.wind[2]] },
          })
        }
      />
      <SliderRow
        label="Z"
        value={runtimeParams.wind[2]}
        min={-4}
        max={4}
        step={0.01}
        onChange={(v) =>
          dispatch({
            type: 'simulation/set-runtime-params',
            params: { wind: [runtimeParams.wind[0], runtimeParams.wind[1], v] },
          })
        }
      />

      <SectionDivider label="Solver" />
      <StatRow label="Mode" value={solver} />
      <StatRow label="Rate" value={`${stepRateHz} Hz`} />
      <StatRow label="Brick" value={`${sparseBrickSize} vox`} />
    </Panel>
  )
}

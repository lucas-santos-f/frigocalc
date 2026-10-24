import { useMemo } from 'react'
import { Card, SafetyChip } from '../ui/Field'
import { CopBars, CopGwpScatter, type CompareRow } from '../charts/RefrigerantCompare'
import { useStore } from '../../state/store'
import { computeAll, useFluids, useT, useUnits, type Computed } from '../../hooks'
import type { CycleInput, Scenario } from '../../engine/types'
import { REFRIGERANTS } from '../../engine/refrigerants'
import { computeCycle } from '../../engine/cycle'

const K0 = 273.15
const ALL_IDS = REFRIGERANTS.map((r) => r.id)

/** Adapta o arranjo do cenário a cada fluido para uma comparação justa. */
function adaptInput(base: CycleInput, id: string): { input: CycleInput; mode: string } {
  const inp: CycleInput = { ...base, refrigerant: id }
  if (id === 'R744') {
    if (base.system === 'transcritical') return { input: inp, mode: 'transcritical' }
    if (base.system === 'cascade') return { input: inp, mode: 'cascade' }
    if (base.tCond > 22) return { input: { ...inp, system: 'transcritical', transcritical: { tGasCoolerOut: base.tCond - 5, pGasCooler: null } }, mode: 'transcritical' }
    return { input: inp, mode: base.system }
  }
  if (base.system === 'transcritical') return { input: { ...inp, system: 'single', tCond: base.transcritical.tGasCoolerOut + 5 }, mode: 'single' }
  return { input: inp, mode: base.system }
}

export function ComparePanel({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const u = useUnits()
  const scenarios = useStore((s) => s.scenarios)
  const { fluids, error } = useFluids(ALL_IDS)
  const Q = Math.max(computed.load.kWEquipment, 0.1)

  const rows = useMemo<CompareRow[]>(() => {
    if (!fluids) return []
    return REFRIGERANTS.map((meta) => {
      const { input, mode } = adaptInput(sc.cycle, meta.id)
      try {
        const r = computeCycle(input, Q, { main: fluids[meta.id], ht: input.system === 'cascade' ? fluids[input.cascade.refrigerantHT] : undefined })
        const Tdis = Math.max(...r.stages.map((s) => s.Tdischarge)) - K0
        return { id: meta.id, name: meta.name, color: meta.color, safety: meta.safety, gwp: meta.gwpAR4, ok: true, cop: r.COP, W: r.Wtotal, Tdis, Vdisp: r.stages.reduce((a, s) => a + s.Vdisplacement, 0), mode }
      } catch {
        return { id: meta.id, name: meta.name, color: meta.color, safety: meta.safety, gwp: meta.gwpAR4, ok: false, cop: 0, W: 0, Tdis: 0, Vdisp: 0, mode }
      }
    })
  }, [fluids, sc.cycle, Q])

  const scenarioRows = useMemo(() => {
    if (!fluids) return []
    return scenarios.map((s) => ({ sc: s, c: computeAll(s, fluids) }))
  }, [scenarios, fluids])

  return (
    <div className="grid">
      <Card title={t('cmp.refrigerants')} hint={t('cmp.hint')} className="span-2">
        {!fluids && !error && <div className="alert info">{t('cmp.loading')}</div>}
        {error && <div className="alert error">{error}</div>}
        {rows.length > 0 && (
          <div className="grid">
            <div>
              <CopBars rows={rows} highlight={sc.cycle.refrigerant} />
            </div>
            <div>
              <CopGwpScatter rows={rows} highlight={sc.cycle.refrigerant} />
            </div>
          </div>
        )}
        {rows.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="kv">
              <thead>
                <tr>
                  <th>{t('cyc.refrigerant')}</th>
                  <th>{t('cmp.class')}</th>
                  <th className="num">{t('cmp.gwp')}</th>
                  <th>{t('cyc.system')}</th>
                  <th className="num">{t('cmp.cop')}</th>
                  <th className="num">{t('cyc.W')}</th>
                  <th className="num">{t('cyc.Tdis')}</th>
                  <th className="num">{t('cyc.Vdisp')}</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice()
                  .sort((a, b) => Number(b.ok) - Number(a.ok) || b.cop - a.cop)
                  .map((r) => (
                    <tr key={r.id} style={r.id === sc.cycle.refrigerant ? { fontWeight: 700 } : undefined}>
                      <td>{r.name}</td>
                      <td>
                        <SafetyChip cls={r.safety} />
                      </td>
                      <td className="num">{r.gwp}</td>
                      <td>{r.ok ? t(`cyc.${r.mode}`) : <span className="muted">{t('cmp.not_applicable')}</span>}</td>
                      <td className="num">{r.ok ? u.n(r.cop, 2) : '—'}</td>
                      <td className="num">{r.ok ? u.show('power', r.W, 1) : '—'}</td>
                      <td className="num">{r.ok ? u.show('temp', r.Tdis, 0) : '—'}</td>
                      <td className="num">{r.ok ? u.show('airflow', r.Vdisp, 0) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={t('cmp.scenarios')} className="span-2">
        {scenarioRows.length < 2 && <div className="muted">{t('cmp.no_scenarios')}</div>}
        {scenarioRows.length > 0 && (
          <div className="table-wrap">
            <table className="kv">
              <thead>
                <tr>
                  <th>{t('scenario.title')}</th>
                  <th>{t('scenario.application')}</th>
                  <th>{t('cyc.refrigerant')}</th>
                  <th className="num">{t('cmp.capacity')}</th>
                  <th className="num">{t('cmp.cop')}</th>
                  <th className="num">{t('cmp.power')}</th>
                  <th className="num">{t('cmp.charge')}</th>
                  <th className="num">{t('cmp.co2e')}</th>
                </tr>
              </thead>
              <tbody>
                {scenarioRows.map(({ sc: s, c }) => (
                  <tr key={s.id} style={s.id === sc.id ? { fontWeight: 700 } : undefined}>
                    <td>{s.name}</td>
                    <td>{t(`application.${s.application}`)}</td>
                    <td>
                      {s.cycle.refrigerant} <span className="muted">· {t(`cyc.${s.cycle.system}`)}</span>
                    </td>
                    <td className="num">{u.val('power', c.load.kWEquipment, 1)}</td>
                    <td className="num">{c.cycle ? u.n(c.cycle.COP, 2) : '—'}</td>
                    <td className="num">{c.plant ? u.val('power', c.plant.electrical.totalKW, 1) : '—'}</td>
                    <td className="num">{c.plant ? u.val('mass', c.plant.refrigerant.chargeKg, 0) : '—'}</td>
                    <td className="num">{c.plant ? u.n(c.plant.refrigerant.co2eTon, 1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

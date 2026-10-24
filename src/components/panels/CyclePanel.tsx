import { useMemo } from 'react'
import { Alerts, Card, NumberField, SafetyChip, SelectField, Stat } from '../ui/Field'
import { PhDiagram } from '../charts/PhDiagram'
import { SensitivityChart, type SweepPoint } from '../charts/Sensitivity'
import { useStore } from '../../state/store'
import { useT, useUnits, type Computed } from '../../hooks'
import type { CycleInput, CycleResult, Scenario } from '../../engine/types'
import { REFRIGERANTS, refrigerantMeta } from '../../engine/refrigerants'
import { compressorEfficiencies, computeCycle, optimalGasCoolerPressureBar } from '../../engine/cycle'

const K0 = 273.15

export function CyclePanel({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const u = useUnits()
  const update = useStore((s) => s.update)
  const c = sc.cycle
  const meta = refrigerantMeta(c.refrigerant)
  const cycle = computed.cycle
  const fluids = computed.fluids
  const setC = (k: keyof CycleInput) => (v: number | null) => update((d) => ((d.cycle as unknown as Record<string, number | null>)[k] = k === 'etaIsOverride' || k === 'etaVolOverride' || k === 'tInter' ? v : (v ?? 0)))

  const refOptions = REFRIGERANTS.map((r) => ({ value: r.id, label: `${r.name} · ${r.safety} · GWP ${r.gwpAR4}` }))
  const Q = Math.max(computed.load.kWEquipment, 0.1)

  // sensibilidade local (reaproveita as tabelas já carregadas)
  const sweeps = useMemo(() => {
    if (!fluids || !fluids[c.refrigerant]) return null
    const main = fluids[c.refrigerant]
    const ht = c.system === 'cascade' ? fluids[c.cascade.refrigerantHT] : undefined
    const run = (mut: (inp: CycleInput, v: number) => CycleInput, center: number, span: number, step: number): SweepPoint[] => {
      const out: SweepPoint[] = []
      for (let v = center - span; v <= center + span + 1e-9; v += step) {
        try {
          const r = computeCycle(mut(c, v), Q, { main, ht })
          out.push({ x: v, COP: r.COP, W: r.Wtotal, Tdis: Math.max(...r.stages.map((s) => s.Tdischarge), ...(r.ht?.stages.map((s) => s.Tdischarge) ?? [])) - K0 })
        } catch {
          /* fora da faixa */
        }
      }
      return out
    }
    const evap = run((inp, v) => ({ ...inp, tEvap: v }), c.tEvap, 10, 2)
    const cond =
      c.system === 'transcritical'
        ? run((inp, v) => ({ ...inp, transcritical: { ...inp.transcritical, tGasCoolerOut: v } }), c.transcritical.tGasCoolerOut, 10, 2)
        : run((inp, v) => ({ ...inp, tCond: v }), c.tCond, 12, 2)
    return { evap, cond }
  }, [fluids, c, Q])

  const effInfo = cycle ? compressorEfficiencies(c.compressorType, cycle.stages[0].pressureRatio, c.etaIsOverride, c.etaVolOverride) : null

  return (
    <div className="grid">
      <Card title={t('cyc.title')} hint={`${t('cyc.load_from')}: ${u.show('power', Q, 1)}`}>
        <div className="fields">
          <SelectField label={t('cyc.refrigerant')} value={c.refrigerant} onChange={(v) => update((d) => (d.cycle.refrigerant = v))} options={refOptions} />
          <SelectField
            label={t('cyc.system')}
            value={c.system}
            onChange={(v) => update((d) => (d.cycle.system = v))}
            options={[
              { value: 'single', label: t('cyc.single') },
              { value: 'two_stage', label: t('cyc.two_stage') },
              { value: 'cascade', label: t('cyc.cascade') },
              { value: 'transcritical', label: t('cyc.transcritical') },
            ]}
          />
          <NumberField label={t('cyc.tEvap')} quantity="temp" value={c.tEvap} onChange={setC('tEvap')} />
          {c.system !== 'transcritical' && <NumberField label={t('cyc.tCond')} quantity="temp" value={c.tCond} onChange={setC('tCond')} />}
          <NumberField label={t('cyc.superheat')} quantity="dtemp" value={c.superheat} min={0} onChange={setC('superheat')} />
          <NumberField label={t('cyc.subcooling')} quantity="dtemp" value={c.subcooling} min={0} onChange={setC('subcooling')} />
          <SelectField
            label={t('cyc.compressorType')}
            value={c.compressorType}
            onChange={(v) => update((d) => (d.cycle.compressorType = v))}
            options={[
              { value: 'reciprocating', label: t('cyc.reciprocating') },
              { value: 'screw', label: t('cyc.screw') },
              { value: 'scroll', label: t('cyc.scroll') },
            ]}
          />
          <NumberField label={t('cyc.etaIs')} unit="0–1" value={c.etaIsOverride} nullable autoHint={effInfo ? `auto ${effInfo.etaIs.toFixed(2)}` : undefined} min={0.2} max={1} onChange={setC('etaIsOverride')} />
          <NumberField label={t('cyc.etaVol')} unit="0–1" value={c.etaVolOverride} nullable autoHint={effInfo ? `auto ${effInfo.etaVol.toFixed(2)}` : undefined} min={0.2} max={1} onChange={setC('etaVolOverride')} />
          <NumberField label={t('cyc.motorEff')} unit="0–1" value={c.motorEff} min={0.5} max={1} onChange={setC('motorEff')} />
          {c.system === 'two_stage' && <NumberField label={t('cyc.tInter')} quantity="temp" value={c.tInter} nullable autoHint={cycle ? `auto ${(cycle.stages[0].Pdischarge && fluids?.[c.refrigerant] ? fluids[c.refrigerant].tDew(cycle.stages[0].Pdischarge) - K0 : 0).toFixed(1)} °C` : undefined} onChange={setC('tInter')} />}
          {c.system === 'cascade' && (
            <>
              <SelectField label={t('cyc.refrigerantHT')} value={c.cascade.refrigerantHT} onChange={(v) => update((d) => (d.cycle.cascade.refrigerantHT = v))} options={refOptions} />
              <NumberField label={t('cyc.tCascade')} quantity="temp" value={c.cascade.tCascade} onChange={(v) => update((d) => (d.cycle.cascade.tCascade = v ?? -8))} />
              <NumberField label={t('cyc.dtCascade')} quantity="dtemp" value={c.cascade.dtCascade} min={0} onChange={(v) => update((d) => (d.cycle.cascade.dtCascade = v ?? 5))} />
            </>
          )}
          {c.system === 'transcritical' && (
            <>
              <NumberField label={t('cyc.tGasCoolerOut')} quantity="temp" value={c.transcritical.tGasCoolerOut} onChange={(v) => update((d) => (d.cycle.transcritical.tGasCoolerOut = v ?? 35))} />
              <NumberField label={t('cyc.pGasCooler')} unit="bar" value={c.transcritical.pGasCooler} nullable autoHint={`auto ${optimalGasCoolerPressureBar(c.tEvap, c.transcritical.tGasCoolerOut).toFixed(0)} bar`} min={60} max={160} onChange={(v) => update((d) => (d.cycle.transcritical.pGasCooler = v))} />
            </>
          )}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <SafetyChip cls={meta.safety} />
          <span className="chip">GWP {meta.gwpAR4}</span>
          <span className="chip">{t(`cyc.family.${meta.family}`)}</span>
          {fluids?.[c.refrigerant] && <span className="chip">Tcrit {u.val('temp', fluids[c.refrigerant].Tcrit - K0, 1)} {u.label('temp')}</span>}
        </div>
      </Card>

      <Card title={t('cyc.results')}>
        {computed.loading && <div className="alert info">{t('common.loading')}</div>}
        <Alerts error={computed.cycleError} warnings={cycle ? [...cycle.warnings, ...(cycle.ht?.warnings ?? [])] : []} />
        {cycle && <CycleStats cycle={cycle} />}
      </Card>

      {cycle && fluids?.[cycle.fluid] && (
        <Card title={`${t('cyc.ph_title')} — ${cycle.fluid}`} className="span-2">
          <PhDiagram fluid={fluids[cycle.fluid]} cycle={cycle} />
          <PointsTable cycle={cycle} />
        </Card>
      )}
      {cycle?.ht && fluids?.[cycle.ht.fluid] && (
        <Card title={`${t('cyc.ht_cycle')} — ${cycle.ht.fluid}`} className="span-2">
          <PhDiagram fluid={fluids[cycle.ht.fluid]} cycle={cycle.ht} />
          <CycleStats cycle={cycle.ht} compact />
        </Card>
      )}
      {sweeps && cycle && (
        <>
          <Card title={c.system === 'transcritical' ? `${t('cyc.sensitivity')} — ${t('cyc.tGasCoolerOut')}` : t('cyc.sens_tcond')}>
            <SensitivityChart data={sweeps.cond} xLabel={c.system === 'transcritical' ? t('cyc.tGasCoolerOut') : t('cyc.tCond')} current={c.system === 'transcritical' ? c.transcritical.tGasCoolerOut : c.tCond} />
          </Card>
          <Card title={t('cyc.sens_tevap')}>
            <SensitivityChart data={sweeps.evap} xLabel={t('cyc.tEvap')} current={c.tEvap} />
          </Card>
        </>
      )}
    </div>
  )
}

function CycleStats({ cycle, compact }: { cycle: CycleResult; compact?: boolean }) {
  const t = useT()
  const u = useUnits()
  const Tdis = Math.max(...cycle.stages.map((s) => s.Tdischarge))
  return (
    <>
      <div className="stats">
        <Stat big={!compact} label={t('cyc.cop')} value={u.n(cycle.COP, 2)} sub={`${t('cyc.cop_carnot')} ${u.n(cycle.COPCarnot, 2)} · ${t('cyc.second_law')} ${u.n(cycle.secondLawEff * 100, 0)} %`} />
        <Stat label={t('cyc.Qevap')} value={u.show('power', cycle.Qevap, 1)} />
        <Stat label={t('cyc.W')} value={u.show('power', cycle.Wtotal, 1)} />
        <Stat label={t('cyc.Qcond')} value={u.show('power', cycle.Qcond, 1)} />
        <Stat label={t('cyc.Tdis')} value={u.show('temp', Tdis - K0, 0)} />
        <Stat label={t('cyc.Pevap')} value={u.show('pressure', cycle.Pevap, 2)} sub={cycle.glideEvap > 0.3 ? `${t('cyc.glide_evap')} ${u.show('dtemp', cycle.glideEvap, 1)}` : undefined} />
        <Stat label={t('cyc.Pcond')} value={u.show('pressure', cycle.Pcond, 2)} sub={cycle.glideCond > 0.3 ? `${t('cyc.glide_cond')} ${u.show('dtemp', cycle.glideCond, 1)}` : undefined} />
      </div>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="kv">
          <thead>
            <tr>
              <th>{t('cyc.stage')}</th>
              <th className="num">{t('cyc.pr')}</th>
              <th className="num">{t('cyc.etaIs')}</th>
              <th className="num">{t('cyc.etaVol')}</th>
              <th className="num">{t('cyc.mdot')}</th>
              <th className="num">{t('cyc.W')}</th>
              <th className="num">{t('cyc.Vsuction')}</th>
              <th className="num">{t('cyc.Vdisp')}</th>
              <th className="num">{t('cyc.Tdis')}</th>
            </tr>
          </thead>
          <tbody>
            {cycle.stages.map((s) => (
              <tr key={s.name}>
                <td>{t(`cyc.stage.${s.name}`)}</td>
                <td className="num">{u.n(s.pressureRatio, 2)}</td>
                <td className="num">{u.n(s.etaIs, 2)}</td>
                <td className="num">{u.n(s.etaVol, 2)}</td>
                <td className="num">{u.show('massflow', s.mdot, 3)}</td>
                <td className="num">{u.show('power', s.Wshaft, 1)}</td>
                <td className="num">{u.show('airflow', s.Vsuction, 0)}</td>
                <td className="num">{u.show('airflow', s.Vdisplacement, 0)}</td>
                <td className="num">{u.show('temp', s.Tdischarge - K0, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function PointsTable({ cycle }: { cycle: CycleResult }) {
  const t = useT()
  const u = useUnits()
  return (
    <div className="table-wrap" style={{ marginTop: 8 }}>
      <table className="kv">
        <thead>
          <tr>
            <th>{t('cyc.points')}</th>
            <th className="num">P ({u.label('pressure')})</th>
            <th className="num">T ({u.label('temp')})</th>
            <th className="num">h ({u.label('enthalpy')})</th>
            <th className="num">s (kJ/kg·K)</th>
            <th className="num">ρ ({u.label('density')})</th>
            <th>x</th>
          </tr>
        </thead>
        <tbody>
          {cycle.points.map((p) => (
            <tr key={p.id}>
              <td>
                <b>{p.id}</b> <span className="muted">{t(`cyc.region.${p.region}`)}</span>
              </td>
              <td className="num">{u.val('pressure', p.P, 2)}</td>
              <td className="num">{u.val('temp', p.T - K0, 1)}</td>
              <td className="num">{u.val('enthalpy', p.h, 1)}</td>
              <td className="num">{u.n(p.s, 4)}</td>
              <td className="num">{u.val('density', p.rho, 2)}</td>
              <td>{p.x !== undefined && p.x < 1 ? p.x.toFixed(2) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

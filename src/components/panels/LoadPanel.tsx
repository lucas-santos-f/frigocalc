import { useState } from 'react'
import { X } from 'lucide-react'
import { Alerts, Card, CheckField, NumberField, SelectField, Stat } from '../ui/Field'
import { LoadBars, LoadDonut } from '../charts/LoadBreakdown'
import { useStore } from '../../state/store'
import { useT, useUnits, type Computed } from '../../hooks'
import type { Insulation, LoadResult, Scenario } from '../../engine/types'
import { DIRECT_PRESETS, PRODUCT_PRESETS, makeDirect, makeProduct } from '../../engine/presets'
import { autoAirChanges } from '../../engine/load'
import { powerAlternatives } from '../../units'
import { labelText } from '../../labels'

function uValue(ins: Insulation): number {
  return 1 / (ins.rSurfaces + ins.thickness / 1000 / Math.max(ins.k, 1e-4))
}

export function LoadPanel({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const update = useStore((s) => s.update)
  const load = computed.load

  return (
    <div className="workspace">
      <div className="stack">
        <RoomCard sc={sc} load={load} />
        <EnvelopeCard sc={sc} />
        <InfiltrationCard sc={sc} load={load} />
        <InternalCard sc={sc} />
        <Card title={t('vent.title')}>
          <div className="fields">
            <NumberField label={t('vent.airflowM3h')} quantity="airflow" value={sc.ventilation.airflowM3h} min={0} onChange={(v) => update((d) => (d.ventilation.airflowM3h = v ?? 0))} />
          </div>
        </Card>
        <ProductsCard sc={sc} />
        <DirectCard sc={sc} />
      </div>
      <aside className="aside">
        <ResultsCard load={load} />
      </aside>
    </div>
  )
}

function RoomCard({ sc, load }: { sc: Scenario; load: LoadResult }) {
  const t = useT()
  const u = useUnits()
  const update = useStore((s) => s.update)
  const r = sc.room
  const set = (k: keyof typeof r) => (v: number | null) => update((d) => ((d.room as unknown as Record<string, number>)[k] = v ?? 0))
  return (
    <Card title={t('room.title')}>
      <div className="fields">
        <NumberField label={t('room.length')} quantity="length" value={r.length} min={0.5} onChange={set('length')} />
        <NumberField label={t('room.width')} quantity="length" value={r.width} min={0.5} onChange={set('width')} />
        <NumberField label={t('room.height')} quantity="length" value={r.height} min={1} onChange={set('height')} />
        <NumberField label={t('room.tInt')} quantity="temp" value={r.tInt} onChange={set('tInt')} />
        <NumberField label={t('room.rhInt')} unit="%" value={r.rhInt} min={0} max={100} digits={0} onChange={set('rhInt')} />
        <NumberField label={t('room.tExt')} quantity="temp" value={r.tExt} onChange={set('tExt')} />
        <NumberField label={t('room.rhExt')} unit="%" value={r.rhExt} min={0} max={100} digits={0} onChange={set('rhExt')} />
        <NumberField label={t('room.tGround')} quantity="temp" value={r.tGround} onChange={set('tGround')} />
        <NumberField label={t('room.runHours')} unit={t('common.hours_day')} value={r.runHours} min={1} max={24} onChange={set('runHours')} />
        <NumberField label={t('room.safetyFactor')} unit="%" value={r.safetyFactor} min={0} max={100} digits={0} onChange={set('safetyFactor')} />
      </div>
      <div className="stats" style={{ marginTop: 16 }}>
        <Stat label={t('room.volume')} value={u.show('volume', load.geometry.volume, 0)} />
        <Stat label={t('room.floorArea')} value={u.show('area', load.geometry.floorArea, 0)} />
        <Stat label={t('room.wallArea')} value={u.show('area', load.geometry.wallArea, 0)} />
      </div>
    </Card>
  )
}

function EnvelopeCard({ sc }: { sc: Scenario }) {
  const t = useT()
  const u = useUnits()
  const update = useStore((s) => s.update)
  const surfaces: ('walls' | 'roof' | 'floor')[] = ['walls', 'roof', 'floor']
  return (
    <Card title={t('env.title')} hint={t('env.hint')}>
      {surfaces.map((key) => {
        const ins = sc.envelope[key]
        const set = (k: keyof Insulation) => (v: number | null) => update((d) => ((d.envelope[key] as unknown as Record<string, number | null>)[k] = k === 'tExtOverride' ? v : (v ?? 0)))
        return (
          <div className="list-item" key={key}>
            <header>
              <strong>{t(`env.${key}`)}</strong>
              <span className="muted">
                {t('env.uvalue')} = {ins.enabled ? u.show('uvalue', uValue(ins), 3) : '—'}
              </span>
            </header>
            <div className="fields">
              <CheckField label={t('env.enabled')} checked={ins.enabled} onChange={(v) => update((d) => (d.envelope[key].enabled = v))} />
              <NumberField label={t('env.thickness')} unit="mm" value={ins.thickness} min={0} digits={0} onChange={set('thickness')} />
              <NumberField label={t('env.k')} unit="W/m·K" value={ins.k} min={0.005} digits={3} onChange={set('k')} />
              <NumberField label={t('env.rSurfaces')} unit="m²K/W" value={ins.rSurfaces} min={0} digits={2} onChange={set('rSurfaces')} />
              <NumberField label={t('env.tExtOverride')} quantity="temp" value={ins.tExtOverride} nullable onChange={set('tExtOverride')} />
              <NumberField label={t('env.solarAdd')} quantity="dtemp" value={ins.solarAdd} onChange={set('solarAdd')} />
            </div>
          </div>
        )
      })}
    </Card>
  )
}

function InfiltrationCard({ sc, load }: { sc: Scenario; load: LoadResult }) {
  const t = useT()
  const update = useStore((s) => s.update)
  const inf = sc.infiltration
  const auto = autoAirChanges(load.geometry.volume, sc.room.tInt)
  return (
    <Card title={t('inf.title')}>
      <div className="fields">
        <SelectField
          label={t('inf.method')}
          value={inf.method}
          onChange={(v) => update((d) => (d.infiltration.method = v))}
          options={[
            { value: 'door', label: t('inf.door') },
            { value: 'air_change', label: t('inf.air_change') },
          ]}
        />
        {inf.method === 'air_change' ? (
          <NumberField label={t('inf.airChangesPerDay')} unit={t('common.per_day')} value={inf.airChangesPerDay} nullable autoHint={`auto ≈ ${auto.toFixed(1)}`} min={0} onChange={(v) => update((d) => (d.infiltration.airChangesPerDay = v))} />
        ) : (
          <>
            <NumberField label={t('inf.doorCount')} value={inf.doorCount} min={0} digits={0} onChange={(v) => update((d) => (d.infiltration.doorCount = v ?? 0))} />
            <NumberField label={t('inf.doorWidth')} quantity="length" value={inf.doorWidth} min={0} onChange={(v) => update((d) => (d.infiltration.doorWidth = v ?? 0))} />
            <NumberField label={t('inf.doorHeight')} quantity="length" value={inf.doorHeight} min={0} onChange={(v) => update((d) => (d.infiltration.doorHeight = v ?? 0))} />
            <NumberField label={t('inf.doorOpenMinutesPerDay')} unit={t('common.min_day')} value={inf.doorOpenMinutesPerDay} min={0} digits={0} onChange={(v) => update((d) => (d.infiltration.doorOpenMinutesPerDay = v ?? 0))} />
            <NumberField label={t('inf.protectionEffectiveness')} unit="0–1" value={inf.protectionEffectiveness} min={0} max={0.95} onChange={(v) => update((d) => (d.infiltration.protectionEffectiveness = v ?? 0))} />
          </>
        )}
      </div>
    </Card>
  )
}

function InternalCard({ sc }: { sc: Scenario }) {
  const t = useT()
  const update = useStore((s) => s.update)
  const i = sc.internal
  const set = (k: keyof typeof i) => (v: number | null) => update((d) => ((d.internal as unknown as Record<string, number | null>)[k] = k === 'evapFanKW' ? v : (v ?? 0)))
  const h = t('common.hours_day')
  return (
    <Card title={t('int.title')}>
      <div className="fields">
        <NumberField label={t('int.people')} value={i.people} min={0} digits={0} onChange={set('people')} />
        <NumberField label={t('int.peopleHours')} unit={h} value={i.peopleHours} min={0} max={24} onChange={set('peopleHours')} />
        <NumberField label={t('int.lightingWPerM2')} quantity="wpm2" value={i.lightingWPerM2} min={0} onChange={set('lightingWPerM2')} />
        <NumberField label={t('int.lightingHours')} unit={h} value={i.lightingHours} min={0} max={24} onChange={set('lightingHours')} />
        <NumberField label={t('int.evapFanKW')} quantity="power" value={i.evapFanKW} nullable autoHint="auto 4 %" min={0} onChange={set('evapFanKW')} />
        <NumberField label={t('int.evapFanHours')} unit={h} value={i.evapFanHours} min={0} max={24} onChange={set('evapFanHours')} />
        <NumberField label={t('int.forklifts')} value={i.forklifts} min={0} digits={0} onChange={set('forklifts')} />
        <NumberField label={t('int.forkliftKW')} quantity="power" value={i.forkliftKW} min={0} onChange={set('forkliftKW')} />
        <NumberField label={t('int.forkliftHours')} unit={h} value={i.forkliftHours} min={0} max={24} onChange={set('forkliftHours')} />
        <NumberField label={t('int.otherEquipmentKW')} quantity="power" value={i.otherEquipmentKW} min={0} onChange={set('otherEquipmentKW')} />
        <NumberField label={t('int.otherEquipmentHours')} unit={h} value={i.otherEquipmentHours} min={0} max={24} onChange={set('otherEquipmentHours')} />
        <NumberField label={t('int.defrostKW')} quantity="power" value={i.defrostKW} min={0} onChange={set('defrostKW')} />
        <NumberField label={t('int.defrostMinutesPerDay')} unit={t('common.min_day')} value={i.defrostMinutesPerDay} min={0} digits={0} onChange={set('defrostMinutesPerDay')} />
        <NumberField label={t('int.defrostHeatFraction')} unit="0–1" value={i.defrostHeatFraction} min={0} max={1} onChange={set('defrostHeatFraction')} />
      </div>
    </Card>
  )
}

function ProductsCard({ sc }: { sc: Scenario }) {
  const t = useT()
  const update = useStore((s) => s.update)
  const [preset, setPreset] = useState('beef')
  return (
    <Card
      title={t('prod.title')}
      right={
        <span className="btn-row no-print">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label={t('prod.preset')}>
            {PRODUCT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.nameKey)}
              </option>
            ))}
          </select>
          <button type="button" className="btn small primary" onClick={() => update((d) => d.products.push(makeProduct(preset, 1000, 10, d.room.tInt, 24, 0)))}>
            + {t('common.add')}
          </button>
        </span>
      }
    >
      {sc.products.length === 0 && <div className="empty">{t('common.none')}</div>}
      {sc.products.map((p, idx) => {
        const set = (k: keyof typeof p) => (v: number | null) => update((d) => ((d.products[idx] as unknown as Record<string, number>)[k] = v ?? 0))
        return (
          <div className="list-item" key={p.id}>
            <header>
              <input type="text" value={labelText(p.name, 'prod.generic', t)} maxLength={80} onChange={(e) => update((d) => (d.products[idx].name = e.target.value))} aria-label={t('prod.name')} />
              <select
                value=""
                aria-label={t('prod.preset')}
                onChange={(e) => {
                  const pr = PRODUCT_PRESETS.find((x) => x.id === e.target.value)
                  if (pr) update((d) => Object.assign(d.products[idx], { name: pr.nameKey, cpAbove: pr.cpAbove, cpBelow: pr.cpBelow, latent: pr.latent, tFreeze: pr.tFreeze, respiration: pr.respiration }))
                }}
              >
                <option value="">{t('prod.preset')}…</option>
                {PRODUCT_PRESETS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {t(x.nameKey)}
                  </option>
                ))}
              </select>
              <button type="button" className="btn small icon ghost danger no-print" aria-label={t('common.remove')} title={t('common.remove')} onClick={() => update((d) => d.products.splice(idx, 1))}>
                <X size={16} />
              </button>
            </header>
            <div className="fields">
              <NumberField label={t('prod.massPerDay')} quantity="mass" value={p.massPerDay} min={0} digits={0} onChange={set('massPerDay')} />
              <NumberField label={t('prod.tIn')} quantity="temp" value={p.tIn} onChange={set('tIn')} />
              <NumberField label={t('prod.tOut')} quantity="temp" value={p.tOut} onChange={set('tOut')} />
              <NumberField label={t('prod.pulldownHours')} unit="h" value={p.pulldownHours} min={0.1} onChange={set('pulldownHours')} />
              <NumberField label={t('prod.storedMass')} quantity="mass" value={p.storedMass} min={0} digits={0} onChange={set('storedMass')} />
              <NumberField label={t('prod.respiration')} unit="W/kg" value={p.respiration} min={0} digits={3} onChange={set('respiration')} />
              <NumberField label={t('prod.cpAbove')} unit="kJ/kg·K" value={p.cpAbove} min={0} onChange={set('cpAbove')} />
              <NumberField label={t('prod.cpBelow')} unit="kJ/kg·K" value={p.cpBelow} min={0} onChange={set('cpBelow')} />
              <NumberField label={t('prod.latent')} quantity="enthalpy" value={p.latent} min={0} digits={0} onChange={set('latent')} />
              <NumberField label={t('prod.tFreeze')} quantity="temp" value={p.tFreeze} onChange={set('tFreeze')} />
              <NumberField label={t('prod.packagingFraction')} unit="kg/kg" value={p.packagingFraction} min={0} onChange={set('packagingFraction')} />
              <NumberField label={t('prod.packagingCp')} unit="kJ/kg·K" value={p.packagingCp} min={0} onChange={set('packagingCp')} />
            </div>
          </div>
        )
      })}
    </Card>
  )
}

function DirectCard({ sc }: { sc: Scenario }) {
  const t = useT()
  const update = useStore((s) => s.update)
  const [preset, setPreset] = useState('generic')
  return (
    <Card
      title={t('direct.title')}
      right={
        <span className="btn-row no-print">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label={t('prod.preset')}>
            {DIRECT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.nameKey)}
              </option>
            ))}
          </select>
          <button type="button" className="btn small primary" onClick={() => update((d) => d.directLoads.push(makeDirect(preset)))}>
            + {t('common.add')}
          </button>
        </span>
      }
    >
      {sc.directLoads.length === 0 && <div className="empty">{t('common.none')}</div>}
      {sc.directLoads.map((dl, idx) => (
        <div className="list-item" key={dl.id}>
          <header>
            <input type="text" value={labelText(dl.name, 'direct.generic', t)} maxLength={80} onChange={(e) => update((d) => (d.directLoads[idx].name = e.target.value))} aria-label={t('direct.name')} />
            <button type="button" className="btn small icon ghost danger no-print" aria-label={t('common.remove')} title={t('common.remove')} onClick={() => update((d) => d.directLoads.splice(idx, 1))}>
              <X size={16} />
            </button>
          </header>
          <div className="fields">
            <NumberField label={t('direct.kW')} quantity="power" value={dl.kW} min={0} onChange={(v) => update((d) => (d.directLoads[idx].kW = v ?? 0))} />
            <NumberField label={t('direct.hours')} unit={t('common.hours_day')} value={dl.hours} min={0} max={24} onChange={(v) => update((d) => (d.directLoads[idx].hours = v ?? 0))} />
          </div>
        </div>
      ))}
    </Card>
  )
}

function ResultsCard({ load }: { load: LoadResult }) {
  const t = useT()
  const u = useUnits()
  const alt = powerAlternatives(load.kWEquipment)
  return (
    <Card title={t('load.results')} className="raised">
      <div className="stats">
        <Stat
          big
          label={t('load.equipment_total')}
          value={
            <>
              {u.val('power', load.kWEquipment, 1)}
              <small>{u.label('power')}</small>
            </>
          }
          sub={`${u.n(alt.TR, 1)} TR · ${u.n(alt.kcalh, 0)} kcal/h · ${u.n(alt.BTUh, 0)} BTU/h`}
        />
        <Stat label={t('load.total_day')} value={u.show('energy', load.kWhDay, 0)} />
        <Stat label={t('load.avg24')} value={u.show('power', load.kWAvg24, 1)} />
        <Stat label={t('load.equipment_base')} value={u.show('power', load.kWEquipmentBase, 1)} />
        <Stat label={t('load.safety')} value={u.show('power', load.safetyKW, 1)} />
      </div>
      <Alerts warnings={load.warnings} />
      <div className="chart-title">{t('load.breakdown')}</div>
      <LoadDonut load={load} />
      <div className="chart-title">{t('load.kw_sizing')}</div>
      <LoadBars load={load} />
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="kv">
          <thead>
            <tr>
              <th>{t('load.item')}</th>
              <th className="num">{u.label('energy')}</th>
              <th className="num">{u.label('power')}</th>
              <th className="num">{t('load.share')}</th>
            </tr>
          </thead>
          <tbody>
            {load.items.map((i) => (
              <tr key={i.key}>
                <td>
                  {labelText(i.label, i.labelKey, t)}
                  {i.label && <span className="muted"> · {t(i.labelKey)}</span>}
                  {i.detail && <span className="muted"> · {typeof i.detail === 'string' ? i.detail : t(i.detail.key, i.detail.value)}</span>}
                </td>
                <td className="num">{u.val('energy', i.kWhDay, 0)}</td>
                <td className="num">{u.val('power', i.kWSizing, 2)}</td>
                <td className="num">{load.kWEquipmentBase > 0 ? `${((100 * i.kWSizing) / load.kWEquipmentBase).toFixed(0)} %` : '—'}</td>
              </tr>
            ))}
            <tr className="total">
              <td>{t('common.total')}</td>
              <td className="num">{u.val('energy', load.kWhDay, 0)}</td>
              <td className="num">{u.val('power', load.kWEquipmentBase, 2)}</td>
              <td className="num">100 %</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

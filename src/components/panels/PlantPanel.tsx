import { Alerts, Card, CheckField, NumberField, SafetyChip, SelectField, Stat } from '../ui/Field'
import { useStore } from '../../state/store'
import { useT, useUnits, type Computed } from '../../hooks'
import type { Scenario } from '../../engine/types'
import { refrigerantMeta } from '../../engine/refrigerants'

export function PlantPanel({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const u = useUnits()
  const update = useStore((s) => s.update)
  const p = sc.plant
  const r = computed.plant
  const meta = refrigerantMeta(sc.cycle.refrigerant)
  const noteKey = sc.cycle.refrigerant === 'R744' ? 'plant.note.R744' : `plant.note.${meta.safety === 'A2' || meta.safety === 'B2' || meta.safety === 'B3' ? 'A3' : meta.safety === 'B1' ? 'A1' : meta.safety}`

  return (
    <div className="grid">
      <Card title={t('plant.title')}>
        <div className="fields">
          <NumberField label={t('plant.nCompressors')} value={p.nCompressors} min={1} max={40} digits={0} onChange={(v) => update((d) => (d.plant.nCompressors = Math.max(1, Math.round(v ?? 1))))} />
          <CheckField label={t('plant.standby')} checked={p.standby} onChange={(v) => update((d) => (d.plant.standby = v))} />
          <SelectField
            label={t('plant.condenserType')}
            value={p.condenserType}
            onChange={(v) => update((d) => (d.plant.condenserType = v))}
            options={[
              { value: 'evaporative', label: t('plant.evaporative') },
              { value: 'air', label: t('plant.air') },
              { value: 'water', label: t('plant.water') },
            ]}
          />
          <NumberField label={t('plant.voltage')} unit="V" value={p.voltage} min={100} digits={0} onChange={(v) => update((d) => (d.plant.voltage = v ?? 380))} />
          <NumberField label={t('plant.powerFactor')} unit="0–1" value={p.powerFactor} min={0.6} max={1} onChange={(v) => update((d) => (d.plant.powerFactor = v ?? 0.92))} />
          <NumberField label={t('plant.chargeKgPerKW')} quantity="kgperkw" value={p.chargeKgPerKW} nullable autoHint={r ? `auto ${r.refrigerant.chargeKgPerKW.toFixed(1)}` : undefined} min={0} onChange={(v) => update((d) => (d.plant.chargeKgPerKW = v))} />
          <NumberField label={t('plant.machineRoomArea')} quantity="area" value={p.machineRoomArea} nullable autoHint={r ? `auto ${r.refrigerant.machineRoomAreaM2.toFixed(0)} m²` : undefined} min={0} onChange={(v) => update((d) => (d.plant.machineRoomArea = v))} />
        </div>
        <Alerts error={computed.cycleError} warnings={r?.warnings} />
      </Card>

      {r && computed.cycle && (
        <>
          <Card title={t('plant.compressors')}>
            <div className="stats">
              <Stat big label={t('plant.installed')} value={`${r.compressors.installed}`} sub={`${t('plant.operating')}: ${r.compressors.operating}${p.standby ? ' + 1' : ''}`} />
              <Stat label={t('plant.Qeach')} value={u.show('power', r.compressors.QeachKW, 1)} />
              <Stat label={t('plant.Wshaft_each')} value={u.show('power', r.compressors.WshaftEachKW, 1)} />
              <Stat label={t('plant.motor_each')} value={u.show('power', r.compressors.motorKWEach, 1)} />
              <Stat label={t('plant.motor_std')} value={u.show('power', r.compressors.motorStdKWEach, 1)} />
              <Stat label={t('plant.displacement_each')} value={u.show('airflow', r.compressors.displacementEachM3h, 0)} />
            </div>
            {r.compressors.stageSplit.length > 1 && (
              <table className="kv" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>{t('cyc.stage')}</th>
                    <th className="num">{t('plant.displacement_each')}</th>
                    <th className="num">{t('plant.motor_std')}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.compressors.stageSplit.map((s) => (
                    <tr key={s.name}>
                      <td>{t(`cyc.stage.${s.name}`)}</td>
                      <td className="num">{u.show('airflow', s.displacementEachM3h, 0)}</td>
                      <td className="num">{u.show('power', s.motorStdKWEach, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={t('plant.condenser')}>
            <div className="stats">
              <Stat big label={t('plant.Qrej')} value={u.show('power', r.condenser.QrejKW, 1)} sub={t(`plant.${r.condenser.type}`)} />
              {r.condenser.waterEvapM3h !== undefined && <Stat label={t('plant.water_evap')} value={u.show('waterflow', r.condenser.waterEvapM3h, 2)} />}
              {r.condenser.makeupM3h !== undefined && <Stat label={t('plant.makeup')} value={u.show('waterflow', r.condenser.makeupM3h, 2)} />}
              {r.condenser.airflowM3h !== undefined && <Stat label={t('plant.airflow')} value={u.show('airflow', r.condenser.airflowM3h, 0)} />}
              {r.condenser.waterFlowM3h !== undefined && <Stat label={t('plant.water_flow')} value={u.show('waterflow', r.condenser.waterFlowM3h, 1)} />}
              <Stat label={t('plant.aux_power')} value={u.show('power', r.condenser.auxKW, 1)} />
            </div>
          </Card>

          <Card title={t('plant.electrical')}>
            <div className="stats">
              <Stat big label={t('plant.totalKW')} value={u.show('power', r.electrical.totalKW, 1)} sub={`${t('plant.specific_power')} ${u.n(r.electrical.specificPower, 2)} kW/kW`} />
              <Stat label={t('plant.kVA')} value={`${u.n(r.electrical.kVA, 0)} kVA`} />
              <Stat label={t('plant.amps')} value={`${u.n(r.electrical.amps, 0)} A`} sub={`${p.voltage} V`} />
              <Stat label={t('plant.transformer')} value={`${u.n(r.electrical.transformerKVA, 0)} kVA`} />
            </div>
            <table className="kv" style={{ marginTop: 10 }}>
              <tbody>
                <tr>
                  <td>{t('plant.compressorsKW')}</td>
                  <td className="num">{u.show('power', r.electrical.compressorsKW, 1)}</td>
                </tr>
                <tr>
                  <td>{t('plant.condenserKW')}</td>
                  <td className="num">{u.show('power', r.electrical.condenserKW, 1)}</td>
                </tr>
                <tr>
                  <td>{t('plant.evapFansKW')}</td>
                  <td className="num">{u.show('power', r.electrical.evapFansKW, 1)}</td>
                </tr>
                <tr>
                  <td>{t('plant.pumpsKW')}</td>
                  <td className="num">{u.show('power', r.electrical.pumpsKW, 1)}</td>
                </tr>
                <tr>
                  <td>{t('plant.lightingKW')}</td>
                  <td className="num">{u.show('power', r.electrical.lightingKW, 1)}</td>
                </tr>
                <tr className="sub">
                  <td>{t('plant.defrostKW')}</td>
                  <td className="num">{u.show('power', r.electrical.defrostKW, 1)}</td>
                </tr>
                <tr className="total">
                  <td>{t('plant.totalKW')}</td>
                  <td className="num">{u.show('power', r.electrical.totalKW, 1)}</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card
            title={t('plant.refrigerant_section')}
            right={
              <span>
                <SafetyChip cls={meta.safety} /> <span className="chip">GWP {meta.gwpAR4}</span>
              </span>
            }
          >
            <div className="stats">
              <Stat label={t('plant.charge')} value={u.show('mass', r.refrigerant.chargeKg, 0)} sub={`${u.n(r.refrigerant.chargeKgPerKW, 1)} kg/kW`} />
              <Stat label={t('plant.co2e')} value={`${u.n(r.refrigerant.co2eTon, 1)} t`} />
              <Stat label={t('plant.vent_emergency')} value={u.show('airflow', r.refrigerant.ventilationEmergencyM3h, 0)} />
              <Stat label={t('plant.vent_normal')} value={u.show('airflow', r.refrigerant.ventilationNormalM3h, 0)} />
              <Stat label={t('plant.area')} value={u.show('area', r.refrigerant.machineRoomAreaM2, 0)} sub={r.refrigerant.areaEstimated ? t('plant.area_estimated') : undefined} />
            </div>
            <h3 style={{ fontSize: '0.9rem', margin: '12px 0 6px' }}>{t('plant.safety_notes')}</h3>
            <p style={{ margin: 0, fontSize: '0.88rem' }}>{t(noteKey)}</p>
            <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.78rem' }}>
              {t('plant.norms')}
            </p>
          </Card>
        </>
      )}
    </div>
  )
}

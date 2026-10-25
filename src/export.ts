// CSV export of the current scenario. Separators follow the UI language so the file opens
// cleanly in a spreadsheet using that locale (pt-BR expects ';' and decimal commas).
import type { Computed } from './hooks'
import type { Scenario } from './engine/types'
import type { Lang } from './i18n'
import type { TFn } from './hooks'
import { downloadBlob, safeFileName } from './state/store'

const K0 = 273.15

function csvCell(v: string | number, lang: Lang, sep: string): string {
  const s = typeof v === 'number' ? v.toLocaleString(lang, { maximumFractionDigits: 3, useGrouping: false }) : v
  return s.includes(sep) || /["\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(sc: Scenario, c: Computed, t: TFn, lang: Lang = 'en'): string {
  const rows: (string | number)[][] = []
  rows.push([t('scenario.title'), sc.name])
  rows.push([t('scenario.application'), t(`application.${sc.application}`)])
  rows.push([])
  rows.push([t('load.results')])
  rows.push([t('load.item'), t('load.kwh_day'), t('load.kw_sizing')])
  for (const i of c.load.items) rows.push([i.label ? (i.label.startsWith('prod.') || i.label.startsWith('direct.') ? t(i.label) : i.label) : t(i.labelKey), i.kWhDay, i.kWSizing])
  rows.push([t('load.total_day'), c.load.kWhDay, c.load.kWEquipmentBase])
  rows.push([t('load.equipment_total') + ' (kW)', '', c.load.kWEquipment])
  if (c.cycle) {
    rows.push([])
    rows.push([t('cyc.results'), c.cycle.fluid, t(`cyc.${c.cycle.system}`)])
    rows.push([t('cyc.Qevap') + ' (kW)', c.cycle.Qevap])
    rows.push([t('cyc.W') + ' (kW)', c.cycle.Wtotal])
    rows.push([t('cyc.Qcond') + ' (kW)', c.cycle.Qcond])
    rows.push([t('cyc.cop'), c.cycle.COP])
    rows.push([t('cyc.cop_carnot'), c.cycle.COPCarnot])
    rows.push([t('cyc.Pevap') + ' (bar)', c.cycle.Pevap / 100])
    rows.push([t('cyc.Pcond') + ' (bar)', c.cycle.Pcond / 100])
    for (const s of c.cycle.stages) {
      rows.push([`${t('cyc.stage')} ${t(`cyc.stage.${s.name}`)}: ${t('cyc.pr')}`, s.pressureRatio])
      rows.push([`${t('cyc.stage')} ${t(`cyc.stage.${s.name}`)}: ${t('cyc.Tdis')} (°C)`, s.Tdischarge - K0])
      rows.push([`${t('cyc.stage')} ${t(`cyc.stage.${s.name}`)}: ${t('cyc.mdot')} (kg/s)`, s.mdot])
      rows.push([`${t('cyc.stage')} ${t(`cyc.stage.${s.name}`)}: ${t('cyc.Vdisp')} (m³/h)`, s.Vdisplacement])
    }
    rows.push([])
    rows.push([t('cyc.points'), 'P (kPa)', 'T (°C)', 'h (kJ/kg)', 's (kJ/kgK)', 'x'])
    for (const p of c.cycle.points) rows.push([p.id, p.P, p.T - K0, p.h, p.s, p.x ?? ''])
  }
  if (c.plant) {
    const p = c.plant
    rows.push([])
    rows.push([t('plant.title')])
    rows.push([t('plant.operating'), p.compressors.operating])
    rows.push([t('plant.installed'), p.compressors.installed])
    rows.push([t('plant.Qeach') + ' (kW)', p.compressors.QeachKW])
    rows.push([t('plant.motor_std') + ' (kW)', p.compressors.motorStdKWEach])
    rows.push([t('plant.displacement_each') + ' (m³/h)', p.compressors.displacementEachM3h])
    rows.push([t('plant.Qrej') + ' (kW)', p.condenser.QrejKW])
    rows.push([t('plant.totalKW') + ' (kW)', p.electrical.totalKW])
    rows.push([t('plant.kVA') + ' (kVA)', p.electrical.kVA])
    rows.push([t('plant.amps') + ' (A)', p.electrical.amps])
    rows.push([t('plant.transformer') + ' (kVA)', p.electrical.transformerKVA])
    rows.push([t('plant.charge') + ' (kg)', p.refrigerant.chargeKg])
    rows.push([t('plant.co2e') + ' (t)', p.refrigerant.co2eTon])
    rows.push([t('plant.vent_emergency') + ' (m³/h)', p.refrigerant.ventilationEmergencyM3h])
    rows.push([t('plant.area') + ' (m²)', p.refrigerant.machineRoomAreaM2])
  }
  const sep = lang === 'pt-BR' ? ';' : ','
  return '﻿' + rows.map((r) => r.map((v) => csvCell(v, lang, sep)).join(sep)).join('\r\n')
}

export function exportCsv(sc: Scenario, c: Computed, t: TFn, lang: Lang): void {
  downloadBlob(new Blob([buildCsv(sc, c, t, lang)], { type: 'text/csv;charset=utf-8' }), `${safeFileName(sc.name)}.csv`)
}

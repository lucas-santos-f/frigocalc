// Refrigeration load per the ASHRAE Refrigeration handbook ("Refrigeration Load" chapter); NBR 16401 for outdoor air.
import type { Insulation, LoadGroup, LoadItem, LoadResult, Scenario, Warning } from './types'
import { moistAir } from './psychro'

const G = 9.81

function uValue(ins: Insulation): number {
  const r = ins.rSurfaces + ins.thickness / 1000 / Math.max(ins.k, 1e-4)
  return 1 / r
}

/** Daily air changes from door openings, a curve fit of the ASHRAE table for average use. */
export function autoAirChanges(volume: number, tInt: number): number {
  const n = 196 * Math.pow(Math.max(volume, 2), -0.534)
  return tInt < 0 ? n * 0.8 : n
}

/** Heat released per person (W) as a function of room temperature (ASHRAE). */
export function personHeat(tInt: number): number {
  return Math.max(120, 270 - 6 * tInt)
}

/** Product enthalpy drop (kJ/kg) from tIn to tOut, with latent heat when it crosses tFreeze. */
export function productEnthalpyChange(p: { tIn: number; tOut: number; tFreeze: number; cpAbove: number; cpBelow: number; latent: number }): number {
  const { tIn, tOut, tFreeze, cpAbove, cpBelow, latent } = p
  if (tOut >= tIn) return 0
  if (tIn > tFreeze && tOut < tFreeze) return cpAbove * (tIn - tFreeze) + latent + cpBelow * (tFreeze - tOut)
  if (tOut >= tFreeze) return cpAbove * (tIn - tOut)
  return cpBelow * (tIn - tOut)
}

export function computeLoad(sc: Scenario): LoadResult {
  const { room, envelope, infiltration, products, internal, ventilation, directLoads } = sc
  const warnings: Warning[] = []
  const items: LoadItem[] = []
  const runHours = Math.min(24, Math.max(1, room.runHours))

  const floorArea = room.length * room.width
  const wallArea = 2 * (room.length + room.width) * room.height
  const roofArea = floorArea
  const volume = floorArea * room.height

  const push = (key: string, labelKey: string, group: LoadGroup, kWhDay: number, hours = runHours, label?: string, detail?: LoadItem['detail']) => {
    if (!(kWhDay > 0)) return
    items.push({ key, labelKey, label, group, kWhDay, kWAvg: kWhDay / 24, kWSizing: kWhDay / Math.max(hours, 0.5), detail })
  }

  const surfaces: [string, Insulation, number, number][] = [
    ['walls', envelope.walls, wallArea, room.tExt],
    ['roof', envelope.roof, roofArea, room.tExt],
    ['floor', envelope.floor, floorArea, room.tGround],
  ]
  for (const [name, ins, area, tDefault] of surfaces) {
    if (!ins.enabled) continue
    const u = uValue(ins)
    const tExt = (ins.tExtOverride ?? tDefault) + ins.solarAdd
    const dT = tExt - room.tInt
    if (dT <= 0) continue
    const w = u * area * dT
    push(`trans_${name}`, `load.trans_${name}`, 'transmission', (w / 1000) * 24, runHours, undefined, `U=${u.toFixed(3)} W/m²K · ΔT=${dT.toFixed(1)} K`)
    if (u > 0.35 && room.tInt < 5) warnings.push({ key: 'warn.insulation_thin', value: u })
  }

  const airOut = moistAir(room.tExt, { rh: room.rhExt / 100 })
  const airIn = moistAir(room.tInt, { rh: room.rhInt / 100 })
  const dh = Math.max(0, airOut.h - airIn.h) // kJ/kg dry air
  if (infiltration.method === 'air_change') {
    const n = infiltration.airChangesPerDay ?? autoAirChanges(volume, room.tInt)
    const massDay = (n * volume) / airOut.v // kg dry air per day
    push('infiltration', 'load.infiltration_airchange', 'infiltration', (massDay * dh) / 3600, runHours, undefined, { key: 'detail.air_changes', value: n })
  } else {
    const A = infiltration.doorWidth * infiltration.doorHeight
    const rhoR = airIn.rho
    const rhoI = airOut.rho
    if (A > 0 && infiltration.doorOpenMinutesPerDay > 0 && rhoR > rhoI && dh > 0) {
      const fm = Math.pow(2 / (1 + Math.pow(rhoR / rhoI, 1 / 3)), 1.5)
      const q = 0.221 * A * dh * rhoR * Math.sqrt(1 - rhoI / rhoR) * Math.sqrt(G * infiltration.doorHeight) * fm // kW while the door is open
      const df = room.tExt - room.tInt > 11 ? 0.8 : 1.1
      const openSeconds = infiltration.doorOpenMinutesPerDay * 60 * Math.max(1, infiltration.doorCount)
      const e = Math.min(0.95, Math.max(0, infiltration.protectionEffectiveness))
      const kWh = (q * df * (1 - e) * openSeconds) / 3600
      push('infiltration', 'load.infiltration_door', 'infiltration', kWh, runHours, undefined, { key: 'detail.door_open', value: q })
    }
  }

  for (const p of products) {
    const dhp = productEnthalpyChange(p) + Math.max(0, p.packagingFraction) * p.packagingCp * Math.max(0, p.tIn - p.tOut)
    const kWh = (p.massPerDay * dhp) / 3600
    const hours = Math.min(runHours, Math.max(0.5, p.pulldownHours))
    push(`product_${p.id}`, 'load.product', 'product', kWh, hours, p.name, `${dhp.toFixed(0)} kJ/kg`)
    if (p.respiration > 0 && p.storedMass > 0) {
      push(`resp_${p.id}`, 'load.respiration', 'product', (p.storedMass * p.respiration * 24) / 1000, runHours, p.name)
    }
    if (p.tOut < room.tInt - 0.5) warnings.push({ key: 'warn.product_below_room' })
  }

  push('people', 'load.people', 'internal', (internal.people * personHeat(room.tInt) * internal.peopleHours) / 1000)
  push('lighting', 'load.lighting', 'internal', (internal.lightingWPerM2 * floorArea * internal.lightingHours) / 1000)
  push('forklifts', 'load.forklifts', 'internal', internal.forklifts * internal.forkliftKW * internal.forkliftHours)
  push('equipment', 'load.equipment', 'internal', internal.otherEquipmentKW * internal.otherEquipmentHours)
  push('defrost', 'load.defrost', 'internal', (internal.defrostKW * internal.defrostMinutesPerDay * internal.defrostHeatFraction) / 60)

  if (ventilation.airflowM3h > 0 && dh > 0) {
    const massH = ventilation.airflowM3h / airOut.v
    push('ventilation', 'load.ventilation', 'ventilation', (massH * dh * 24) / 3600, 24, undefined, `${ventilation.airflowM3h.toFixed(0)} m³/h`)
  }

  for (const d of directLoads) push(`direct_${d.id}`, 'load.direct', 'direct', d.kW * d.hours, Math.min(runHours, d.hours), d.name)

  // evaporator fans go last: unless given, they are estimated as 4 % of everything above
  const subtotalSizing = items.reduce((a, i) => a + i.kWSizing, 0)
  const evapFanKW = internal.evapFanKW ?? Math.round(subtotalSizing * 0.04 * 100) / 100
  push('fans', 'load.fans', 'internal', evapFanKW * internal.evapFanHours, runHours, undefined, internal.evapFanKW === null ? 'auto 4 %' : undefined)

  const byGroup: Record<LoadGroup, number> = { transmission: 0, infiltration: 0, product: 0, internal: 0, ventilation: 0, direct: 0 }
  for (const i of items) byGroup[i.group] += i.kWhDay
  const kWhDay = items.reduce((a, i) => a + i.kWhDay, 0)
  const kWEquipmentBase = items.reduce((a, i) => a + i.kWSizing, 0)
  const safetyKW = kWEquipmentBase * (room.safetyFactor / 100)
  const kWEquipment = kWEquipmentBase + safetyKW

  if (kWhDay > 0 && byGroup.infiltration / kWhDay > 0.3) warnings.push({ key: 'warn.infiltration_high', value: (100 * byGroup.infiltration) / kWhDay })
  if (kWEquipment <= 0) warnings.push({ key: 'warn.no_load' })

  return { items, byGroup, kWhDay, kWAvg24: kWhDay / 24, kWEquipmentBase, kWEquipment, safetyKW, evapFanKW, geometry: { volume, floorArea, wallArea, roofArea }, warnings }
}

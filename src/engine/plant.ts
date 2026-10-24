// Dimensionamento preliminar da sala de máquinas: compressores, condensador, elétrica, carga de fluido,
// ventilação (ASHRAE 15 / NBR 16069) e área.
import type { CycleResult, LoadResult, PlantInput, PlantResult, Scenario, Warning } from './types'
import { refrigerantMeta } from './refrigerants'

export const STD_MOTORS_KW = [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000]
export const STD_TRANSFORMERS_KVA = [15, 30, 45, 75, 112.5, 150, 225, 300, 400, 500, 630, 750, 1000, 1250, 1500, 2000, 2500, 3000]

function nextStd(list: number[], v: number): number {
  for (const s of list) if (s >= v) return s
  return Math.ceil(v / 100) * 100
}

export function computePlant(sc: Scenario, load: LoadResult, cycle: CycleResult): PlantResult {
  const p: PlantInput = sc.plant
  const meta = refrigerantMeta(sc.cycle.refrigerant)
  const warnings: Warning[] = []
  const n = Math.max(1, Math.round(p.nCompressors))
  const installed = n + (p.standby ? 1 : 0)
  const Q = cycle.Qevap

  // ---------- compressores ----------
  const QeachKW = Q / n
  const WshaftEachKW = cycle.Wtotal / n
  const motorKWEach = WshaftEachKW / Math.max(0.5, sc.cycle.motorEff)
  const motorStdKWEach = nextStd(STD_MOTORS_KW, motorKWEach * 1.1)
  const displacementEachM3h = cycle.stages.reduce((a, s) => a + s.Vdisplacement, 0) / n
  const stageSplit = cycle.stages.map((s) => ({
    name: s.name,
    displacementEachM3h: s.Vdisplacement / n,
    motorStdKWEach: nextStd(STD_MOTORS_KW, (s.Wshaft / n / Math.max(0.5, sc.cycle.motorEff)) * 1.1),
  }))

  // ---------- condensador ----------
  const Qrej = cycle.Qcond
  let condenser: PlantResult['condenser']
  if (p.condenserType === 'evaporative') {
    const evap = (Qrej / 2450) * 3.6 // m³/h evaporados (≈ kg/s × 3,6)
    condenser = { type: 'evaporative', QrejKW: Qrej, waterEvapM3h: evap, makeupM3h: evap * 1.4, auxKW: Qrej * 0.015 }
  } else if (p.condenserType === 'air') {
    const airflow = (Qrej / (1.15 * 1.006 * 8)) * 3600 // ΔT ar 8 K
    condenser = { type: 'air', QrejKW: Qrej, airflowM3h: airflow, auxKW: Qrej * 0.03 }
  } else {
    const water = (Qrej / (4.186 * 5)) * 3.6 // ΔT água 5 K
    condenser = { type: 'water', QrejKW: Qrej, waterFlowM3h: water, makeupM3h: (Qrej / 2450) * 3.6 * 1.4, auxKW: Qrej * 0.024 }
  }

  // ---------- elétrica ----------
  const compressorsKW = motorKWEach * n
  const evapFansKW = load.evapFanKW
  const pumpsKW = sc.cycle.system === 'single' ? 0 : Q * 0.005
  const defrostKW = sc.internal.defrostKW
  const lightingKW = (sc.internal.lightingWPerM2 * load.geometry.floorArea) / 1000
  const totalKW = compressorsKW + condenser.auxKW + evapFansKW + pumpsKW + lightingKW
  const pf = Math.min(1, Math.max(0.6, p.powerFactor))
  const kVA = totalKW / pf
  const amps = (kVA * 1000) / (Math.sqrt(3) * Math.max(200, p.voltage))
  const transformerKVA = nextStd(STD_TRANSFORMERS_KVA, (kVA + defrostKW / pf) * 1.25)

  // ---------- fluido, ventilação, área ----------
  const chargeKgPerKW = p.chargeKgPerKW ?? meta.chargeKgPerKW * (sc.cycle.system === 'single' ? 1 : 1.4)
  const chargeKg = chargeKgPerKW * Q
  const co2eTon = (chargeKg * meta.gwpAR4) / 1000
  const ventilationEmergencyM3h = 70 * Math.sqrt(Math.max(chargeKg, 1)) * 3.6 // L/s → m³/h (ASHRAE 15 §8.11.5)
  let machineRoomAreaM2: number
  let areaEstimated = false
  if (p.machineRoomArea !== null && p.machineRoomArea > 0) machineRoomAreaM2 = p.machineRoomArea
  else {
    areaEstimated = true
    const base = 12 + installed * (4 + 0.02 * QeachKW) + (p.condenserType === 'water' ? 6 : 0) + (sc.cycle.system === 'single' ? 0 : 8)
    machineRoomAreaM2 = Math.round(base * 1.25)
  }
  const ventilationNormalM3h = 2.5 * machineRoomAreaM2 * 3.6 // 2,5 L/s·m² contínuo

  // ---------- avisos ----------
  if (meta.safety === 'A3') warnings.push({ key: 'warn.a3_charge', value: chargeKg })
  if (meta.safety === 'B2L') warnings.push({ key: 'warn.b2l_room' })
  if (meta.safety === 'A2L') warnings.push({ key: 'warn.a2l_room' })
  if (meta.gwpAR4 >= 2500) warnings.push({ key: 'warn.gwp_high', value: meta.gwpAR4 })
  if (meta.legacy) warnings.push({ key: 'warn.legacy_fluid' })
  if (!p.standby && n === 1) warnings.push({ key: 'warn.no_redundancy' })
  if (sc.cycle.system === 'transcritical' && p.condenserType === 'evaporative') warnings.push({ key: 'warn.gc_evaporative' })

  return {
    compressors: { operating: n, installed, QeachKW, WshaftEachKW, motorKWEach, motorStdKWEach, displacementEachM3h, stageSplit },
    condenser,
    electrical: { compressorsKW, condenserKW: condenser.auxKW, evapFansKW, pumpsKW, defrostKW, lightingKW, totalKW, kVA, amps, transformerKVA, specificPower: Q > 0 ? totalKW / Q : 0 },
    refrigerant: { chargeKg, chargeKgPerKW, co2eTon, ventilationEmergencyM3h, ventilationNormalM3h, machineRoomAreaM2, areaEstimated },
    warnings,
  }
}

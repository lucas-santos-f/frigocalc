// Built-in templates for applications, products and typical direct loads. Every value is an editable starting point.
import type { ApplicationId, DirectLoad, Insulation, ProductLoad, Scenario } from './types'

export interface ProductPreset {
  id: string
  nameKey: string
  cpAbove: number
  cpBelow: number
  latent: number
  tFreeze: number
  respiration: number
}

export const PRODUCT_PRESETS: ProductPreset[] = [
  { id: 'beef', nameKey: 'prod.beef', cpAbove: 3.2, cpBelow: 1.7, latent: 233, tFreeze: -1.7, respiration: 0 },
  { id: 'pork', nameKey: 'prod.pork', cpAbove: 2.6, cpBelow: 1.5, latent: 180, tFreeze: -2.2, respiration: 0 },
  { id: 'poultry', nameKey: 'prod.poultry', cpAbove: 3.3, cpBelow: 1.8, latent: 247, tFreeze: -2.8, respiration: 0 },
  { id: 'fish', nameKey: 'prod.fish', cpAbove: 3.6, cpBelow: 1.9, latent: 270, tFreeze: -2.2, respiration: 0 },
  { id: 'cheese', nameKey: 'prod.cheese', cpAbove: 2.6, cpBelow: 1.3, latent: 160, tFreeze: -10, respiration: 0 },
  { id: 'eggs', nameKey: 'prod.eggs', cpAbove: 3.3, cpBelow: 1.7, latent: 247, tFreeze: -2.2, respiration: 0 },
  { id: 'apple', nameKey: 'prod.apple', cpAbove: 3.6, cpBelow: 1.9, latent: 280, tFreeze: -1.1, respiration: 0.015 },
  { id: 'lettuce', nameKey: 'prod.lettuce', cpAbove: 4.0, cpBelow: 2.0, latent: 318, tFreeze: -0.2, respiration: 0.05 },
  { id: 'banana', nameKey: 'prod.banana', cpAbove: 3.4, cpBelow: 1.8, latent: 250, tFreeze: -0.8, respiration: 0.08 },
  { id: 'icecream', nameKey: 'prod.icecream', cpAbove: 3.3, cpBelow: 1.9, latent: 216, tFreeze: -5.6, respiration: 0 },
  { id: 'bread', nameKey: 'prod.bread', cpAbove: 2.9, cpBelow: 1.4, latent: 150, tFreeze: -6, respiration: 0 },
  { id: 'beverage', nameKey: 'prod.beverage', cpAbove: 4.0, cpBelow: 2.0, latent: 320, tFreeze: -2, respiration: 0 },
  { id: 'water', nameKey: 'prod.water', cpAbove: 4.19, cpBelow: 2.1, latent: 334, tFreeze: 0, respiration: 0 },
  { id: 'generic', nameKey: 'prod.generic', cpAbove: 3.0, cpBelow: 1.6, latent: 220, tFreeze: -2, respiration: 0 },
]

export interface DirectPreset {
  id: string
  nameKey: string
  kW: number
  hours: number
}

export const DIRECT_PRESETS: DirectPreset[] = [
  { id: 'case_mt_open', nameKey: 'direct.case_mt_open', kW: 1.4, hours: 24 }, // display cases are per meter
  { id: 'case_mt_door', nameKey: 'direct.case_mt_door', kW: 0.5, hours: 24 },
  { id: 'case_lt_island', nameKey: 'direct.case_lt_island', kW: 0.6, hours: 24 },
  { id: 'case_lt_door', nameKey: 'direct.case_lt_door', kW: 0.9, hours: 24 },
  { id: 'case_serveover', nameKey: 'direct.case_serveover', kW: 0.8, hours: 24 },
  { id: 'coldroom_mt', nameKey: 'direct.coldroom_mt', kW: 5, hours: 24 },
  { id: 'coldroom_lt', nameKey: 'direct.coldroom_lt', kW: 3, hours: 24 },
  { id: 'reactor', nameKey: 'direct.reactor', kW: 150, hours: 16 },
  { id: 'process_condenser', nameKey: 'direct.process_condenser', kW: 80, hours: 24 },
  { id: 'glycol_losses', nameKey: 'direct.glycol_losses', kW: 10, hours: 24 },
  { id: 'it_load', nameKey: 'direct.it_load', kW: 500, hours: 24 },
  { id: 'ups_lights', nameKey: 'direct.ups_lights', kW: 40, hours: 24 },
  { id: 'generic', nameKey: 'direct.generic', kW: 10, hours: 24 },
]

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

const ins = (thickness: number, solarAdd = 0, enabled = true, k = 0.023): Insulation => ({ enabled, k, thickness, rSurfaces: 0.17, tExtOverride: null, solarAdd })

export function makeProduct(presetId: string, massPerDay: number, tIn: number, tOut: number, pulldownHours = 24, storedMass = 0, name?: string): ProductLoad {
  const p = PRODUCT_PRESETS.find((x) => x.id === presetId) ?? PRODUCT_PRESETS[PRODUCT_PRESETS.length - 1]
  return { id: uid(), name: name ?? p.nameKey, massPerDay, tIn, tOut, cpAbove: p.cpAbove, cpBelow: p.cpBelow, latent: p.latent, tFreeze: p.tFreeze, respiration: p.respiration, pulldownHours, storedMass, packagingFraction: 0.05, packagingCp: 1.6 }
}

export function makeDirect(presetId: string, multiplier = 1, name?: string): DirectLoad {
  const d = DIRECT_PRESETS.find((x) => x.id === presetId) ?? DIRECT_PRESETS[DIRECT_PRESETS.length - 1]
  return { id: uid(), name: name ?? d.nameKey, kW: Math.round(d.kW * multiplier * 100) / 100, hours: d.hours }
}

export const APPLICATIONS: ApplicationId[] = ['chilled_storage', 'frozen_storage', 'blast_freezer', 'carcass_chilling', 'process_room', 'supermarket', 'chemical_plant', 'data_center', 'custom']

function base(application: ApplicationId, name: string): Scenario {
  const now = new Date().toISOString()
  return {
    id: uid(),
    name,
    application,
    createdAt: now,
    updatedAt: now,
    notes: '',
    room: { length: 10, width: 8, height: 4, tInt: 2, rhInt: 85, tExt: 30, rhExt: 60, tGround: 15, runHours: 18, safetyFactor: 10 },
    envelope: { walls: ins(100), roof: ins(100, 5), floor: ins(80) },
    infiltration: { method: 'door', airChangesPerDay: null, doorCount: 2, doorWidth: 2.0, doorHeight: 2.4, doorOpenMinutesPerDay: 60, protectionEffectiveness: 0.5 },
    products: [],
    internal: { people: 2, peopleHours: 4, lightingWPerM2: 10, lightingHours: 8, evapFanKW: null, evapFanHours: 18, forklifts: 1, forkliftKW: 4, forkliftHours: 4, otherEquipmentKW: 0, otherEquipmentHours: 0, defrostKW: 0, defrostMinutesPerDay: 0, defrostHeatFraction: 0.5 },
    ventilation: { airflowM3h: 0 },
    directLoads: [],
    cycle: {
      refrigerant: 'R448A',
      system: 'single',
      tEvap: -6,
      tCond: 40,
      superheat: 6,
      subcooling: 3,
      compressorType: 'reciprocating',
      etaIsOverride: null,
      etaVolOverride: null,
      motorEff: 0.93,
      tInter: null,
      cascade: { refrigerantHT: 'R717', tCascade: -8, dtCascade: 5 },
      transcritical: { tGasCoolerOut: 35, pGasCooler: null },
    },
    plant: { nCompressors: 2, standby: true, condenserType: 'air', powerFactor: 0.92, voltage: 380, chargeKgPerKW: null, machineRoomArea: null },
  }
}

const noEnvelope = (s: Scenario) => {
  s.envelope.walls.enabled = false
  s.envelope.roof.enabled = false
  s.envelope.floor.enabled = false
  s.infiltration.doorOpenMinutesPerDay = 0
  s.internal = { ...s.internal, people: 0, lightingWPerM2: 0, forklifts: 0, evapFanKW: 0 }
  s.room = { ...s.room, length: 6, width: 4, height: 3, tInt: 20, rhInt: 50, runHours: 24 }
}

export function createScenario(application: ApplicationId, name: string): Scenario {
  const s = base(application, name)
  switch (application) {
    case 'chilled_storage':
      s.products = [makeProduct('beef', 5000, 10, 2, 24, 20000)]
      break
    case 'frozen_storage':
      s.room = { ...s.room, length: 15, width: 10, height: 6, tInt: -22, rhInt: 90, runHours: 18 }
      s.envelope = { walls: ins(150), roof: ins(150, 5), floor: ins(120) }
      s.infiltration = { ...s.infiltration, doorWidth: 2.2, doorHeight: 2.8, doorOpenMinutesPerDay: 90, protectionEffectiveness: 0.6 }
      s.products = [makeProduct('beef', 10000, -18, -22, 24, 100000)]
      s.internal = { ...s.internal, lightingWPerM2: 8, forklifts: 2, forkliftKW: 5, forkliftHours: 6, defrostKW: 15, defrostMinutesPerDay: 60 }
      s.cycle = { ...s.cycle, refrigerant: 'R717', system: 'two_stage', tEvap: -30, tCond: 35, superheat: 5, compressorType: 'screw' }
      s.plant = { ...s.plant, condenserType: 'evaporative' }
      break
    case 'blast_freezer':
      s.room = { ...s.room, length: 6, width: 4, height: 3.5, tInt: -35, rhInt: 90, tExt: 25, tGround: 10, runHours: 20 }
      s.envelope = { walls: ins(200), roof: ins(200, 0), floor: ins(150) }
      s.infiltration = { ...s.infiltration, doorCount: 1, doorWidth: 1.5, doorHeight: 2.2, doorOpenMinutesPerDay: 20, protectionEffectiveness: 0.3 }
      s.products = [makeProduct('poultry', 20000, 5, -18, 8, 0)]
      s.internal = { ...s.internal, people: 1, peopleHours: 2, lightingWPerM2: 8, lightingHours: 4, evapFanKW: 30, evapFanHours: 20, forklifts: 0, defrostKW: 20, defrostMinutesPerDay: 30 }
      s.cycle = { ...s.cycle, refrigerant: 'R717', system: 'two_stage', tEvap: -42, tCond: 35, superheat: 3, subcooling: 2, compressorType: 'screw' }
      s.plant = { ...s.plant, condenserType: 'evaporative' }
      break
    case 'carcass_chilling':
      s.room = { ...s.room, length: 20, width: 12, height: 6, tInt: 0, rhInt: 90, tExt: 28, runHours: 20 }
      s.envelope = { walls: ins(120), roof: ins(120, 5), floor: ins(80) }
      s.infiltration = { ...s.infiltration, doorWidth: 2.4, doorHeight: 3.0, doorOpenMinutesPerDay: 240, protectionEffectiveness: 0.4 }
      s.products = [makeProduct('beef', 60000, 39, 4, 20, 60000, 'prod.carcass')]
      s.internal = { ...s.internal, people: 4, peopleHours: 8, lightingWPerM2: 12, lightingHours: 16, forklifts: 0 }
      s.cycle = { ...s.cycle, refrigerant: 'R717', system: 'single', tEvap: -8, tCond: 35, superheat: 5, compressorType: 'screw' }
      s.plant = { ...s.plant, nCompressors: 3, condenserType: 'evaporative' }
      break
    case 'process_room':
      s.room = { ...s.room, length: 25, width: 15, height: 4, tInt: 10, rhInt: 70, tExt: 28, runHours: 16 }
      s.envelope = { walls: ins(60), roof: ins(80, 3), floor: ins(0, 0, false) }
      s.infiltration = { ...s.infiltration, doorCount: 3, doorOpenMinutesPerDay: 300, protectionEffectiveness: 0.3 }
      s.internal = { ...s.internal, people: 40, peopleHours: 8, lightingWPerM2: 15, lightingHours: 16, forklifts: 0, otherEquipmentKW: 30, otherEquipmentHours: 8 }
      s.ventilation = { airflowM3h: 3000 }
      s.cycle = { ...s.cycle, refrigerant: 'R134a', system: 'single', tEvap: 2, tCond: 40, compressorType: 'screw' }
      break
    case 'supermarket':
      noEnvelope(s)
      s.directLoads = [makeDirect('case_mt_open', 40, 'direct.case_mt_open_40m'), makeDirect('case_mt_door', 20, 'direct.case_mt_door_20m'), makeDirect('case_serveover', 10, 'direct.case_serveover_10m'), makeDirect('coldroom_mt', 2, 'direct.coldroom_mt_x2')]
      s.cycle = { ...s.cycle, refrigerant: 'R448A', system: 'single', tEvap: -10, tCond: 42, compressorType: 'scroll' }
      s.plant = { ...s.plant, nCompressors: 4, standby: false, condenserType: 'air' }
      break
    case 'chemical_plant':
      noEnvelope(s)
      s.directLoads = [makeDirect('reactor'), makeDirect('process_condenser'), makeDirect('glycol_losses')]
      s.cycle = { ...s.cycle, refrigerant: 'R717', system: 'single', tEvap: -16, tCond: 38, superheat: 5, compressorType: 'screw' }
      s.plant = { ...s.plant, condenserType: 'water' }
      break
    case 'data_center':
      noEnvelope(s)
      s.directLoads = [makeDirect('it_load'), makeDirect('ups_lights')]
      s.cycle = { ...s.cycle, refrigerant: 'R134a', system: 'single', tEvap: 7, tCond: 38, superheat: 5, compressorType: 'screw' }
      s.plant = { ...s.plant, nCompressors: 3, condenserType: 'water' }
      break
    default:
      s.products = [makeProduct('generic', 2000, 15, 2, 24, 5000)]
  }
  return s
}

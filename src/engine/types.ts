// Core engine types. Internal units are SI: kW, °C for user input, K inside the thermodynamic code,
// kPa, kJ/kg, kJ/(kg·K), kg/m³, m, m², m³.

export type ApplicationId =
  | 'chilled_storage'
  | 'frozen_storage'
  | 'blast_freezer'
  | 'carcass_chilling'
  | 'process_room'
  | 'supermarket'
  | 'chemical_plant'
  | 'data_center'
  | 'custom'

export type SystemType = 'single' | 'two_stage' | 'cascade' | 'transcritical'
export type CompressorType = 'reciprocating' | 'screw' | 'scroll'
export type CondenserType = 'evaporative' | 'air' | 'water'
export type InfiltrationMethod = 'air_change' | 'door'

export interface Room {
  length: number // m
  width: number // m
  height: number // m
  tInt: number // °C
  rhInt: number // %
  tExt: number // °C, ambient air around the room
  rhExt: number // %
  tGround: number // °C, ground / slab under the room
  runHours: number // h/day the plant runs (typically 16–20)
  safetyFactor: number // %, added on top of the total
}

export interface Insulation {
  enabled: boolean
  k: number // W/(m·K), insulation conductivity
  thickness: number // mm
  rSurfaces: number // m²·K/W, inside + outside surface resistances (~0.17)
  tExtOverride: number | null // °C; null uses room.tExt (tGround for the floor)
  solarAdd: number // K added for solar exposure
}

export interface Envelope {
  walls: Insulation
  roof: Insulation
  floor: Insulation
}

export interface Infiltration {
  method: InfiltrationMethod
  airChangesPerDay: number | null // null = estimated from room volume (ASHRAE)
  doorCount: number
  doorWidth: number // m
  doorHeight: number // m
  doorOpenMinutesPerDay: number // min/day per door, all openings added up
  protectionEffectiveness: number // 0–1 (air curtain or strip curtain: 0.5–0.9)
}

export interface ProductLoad {
  id: string
  name: string
  massPerDay: number // kg/day brought in
  tIn: number // °C
  tOut: number // °C, usually tInt
  cpAbove: number // kJ/(kg·K) above freezing
  cpBelow: number // kJ/(kg·K) below freezing
  latent: number // kJ/kg, latent heat of freezing
  tFreeze: number // °C, freezing point
  respiration: number // W/kg, fruit and vegetables only (0 otherwise)
  storedMass: number // kg in storage, basis for respiration heat
  pulldownHours: number // h to pull down a batch (24 = steady daily intake)
  packagingFraction: number // kg packaging per kg product
  packagingCp: number // kJ/(kg·K)
}

export interface InternalLoads {
  people: number
  peopleHours: number // h/day
  lightingWPerM2: number
  lightingHours: number
  evapFanKW: number | null // null = estimated as 4 % of the other loads
  evapFanHours: number
  forklifts: number
  forkliftKW: number
  forkliftHours: number
  otherEquipmentKW: number
  otherEquipmentHours: number
  defrostKW: number
  defrostMinutesPerDay: number
  defrostHeatFraction: number // 0–1, share of defrost heat that ends up in the room
}

export interface DirectLoad {
  id: string
  name: string
  kW: number
  hours: number // h/day
}

export interface Ventilation {
  airflowM3h: number // m³/h of outdoor air
}

export interface CascadeInput {
  refrigerantHT: string
  tCascade: number // °C, LT stage condensing temperature
  dtCascade: number // K, cascade heat exchanger approach
}

export interface TranscriticalInput {
  tGasCoolerOut: number // °C, gas cooler outlet
  pGasCooler: number | null // bar(a); null = estimated optimum
}

export interface CycleInput {
  refrigerant: string
  system: SystemType
  tEvap: number // °C, dew point
  tCond: number // °C, dew point; ignored for transcritical
  superheat: number // K
  subcooling: number // K
  compressorType: CompressorType
  etaIsOverride: number | null
  etaVolOverride: number | null
  motorEff: number // 0–1
  tInter: number | null // °C, two-stage intermediate; null = from √(Pe·Pc)
  cascade: CascadeInput
  transcritical: TranscriticalInput
}

export interface PlantInput {
  nCompressors: number // running, standby not included
  standby: boolean // N+1
  condenserType: CondenserType
  powerFactor: number
  voltage: number // V, three-phase
  chargeKgPerKW: number | null // null = refrigerant / system default
  machineRoomArea: number | null // m²; null = estimated
}

export interface Scenario {
  id: string
  name: string
  application: ApplicationId
  createdAt: string
  updatedAt: string
  notes: string
  room: Room
  envelope: Envelope
  infiltration: Infiltration
  products: ProductLoad[]
  internal: InternalLoads
  ventilation: Ventilation
  directLoads: DirectLoad[]
  cycle: CycleInput
  plant: PlantInput
}

// results

/** i18n warning key with an optional numeric value. */
export interface Warning {
  key: string
  value?: number
}

export type LoadGroup = 'transmission' | 'infiltration' | 'product' | 'internal' | 'ventilation' | 'direct'

export interface LoadItem {
  key: string
  labelKey: string // i18n key
  label?: string // user-given name (product or direct load)
  group: LoadGroup
  kWhDay: number
  kWAvg: number // kWh/day ÷ 24
  kWSizing: number // kWh/day ÷ effective hours, used for sizing
  detail?: string | Warning // plain text, or an i18n key the UI fills in with value
}

export interface LoadResult {
  items: LoadItem[]
  byGroup: Record<LoadGroup, number> // kWh/day
  kWhDay: number
  kWAvg24: number
  kWEquipmentBase: number // kWh/day ÷ run hours
  kWEquipment: number // safety factor included
  safetyKW: number
  evapFanKW: number
  geometry: { volume: number; floorArea: number; wallArea: number; roofArea: number }
  warnings: Warning[]
}

export type Region = 'sh' | 'sat_v' | 'sat_l' | 'two_phase' | 'liq' | 'sc'

export interface StatePoint {
  id: string
  P: number // kPa
  T: number // K
  h: number // kJ/kg
  s: number // kJ/(kg·K)
  rho: number // kg/m³
  x?: number
  region: Region
}

export interface StageResult {
  name: string // 'LP' | 'HP' | 'single' | 'LT' | 'HT'
  pressureRatio: number
  etaIs: number
  etaVol: number
  mdot: number // kg/s
  Wshaft: number // kW
  Vsuction: number // m³/h, actual suction volume flow
  Vdisplacement: number // m³/h, required swept volume
  Tdischarge: number // K
  Psuction: number // kPa
  Pdischarge: number // kPa
}

export interface CycleResult {
  system: SystemType
  fluid: string
  points: StatePoint[]
  path: StatePoint[] // polyline for the p-h chart
  stages: StageResult[]
  Qevap: number // kW
  Wtotal: number // kW, shaft
  Qcond: number // kW, total heat rejection (HT stage included for cascade)
  COP: number
  COPCarnot: number
  secondLawEff: number
  glideEvap: number // K
  glideCond: number // K
  Pevap: number
  Pcond: number
  Tevap: number // K, dew point
  Tcond: number // K, dew point (gas cooler outlet for transcritical)
  warnings: Warning[]
  ht?: CycleResult // cascade high stage, second refrigerant
}

export interface PlantResult {
  compressors: {
    operating: number
    installed: number
    QeachKW: number
    WshaftEachKW: number
    motorKWEach: number
    motorStdKWEach: number
    displacementEachM3h: number
    stageSplit: { name: string; displacementEachM3h: number; motorStdKWEach: number }[]
  }
  condenser: {
    type: CondenserType
    QrejKW: number
    waterEvapM3h?: number
    makeupM3h?: number
    airflowM3h?: number
    waterFlowM3h?: number
    auxKW: number
  }
  electrical: {
    compressorsKW: number
    condenserKW: number
    evapFansKW: number
    pumpsKW: number
    defrostKW: number
    lightingKW: number
    totalKW: number
    kVA: number
    amps: number
    transformerKVA: number
    specificPower: number // kW_el per kW of cooling
  }
  refrigerant: {
    chargeKg: number
    chargeKgPerKW: number
    co2eTon: number
    ventilationEmergencyM3h: number
    ventilationNormalM3h: number
    machineRoomAreaM2: number
    areaEstimated: boolean
  }
  warnings: Warning[]
}

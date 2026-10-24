// Tipos centrais do motor de cálculo. Unidades internas: SI (kW, °C na entrada do usuário, K dentro do motor
// termodinâmico, kPa, kJ/kg, kJ/(kg·K), kg/m³, m, m², m³).

export type ApplicationId =
  | 'camara_resfriados'
  | 'camara_congelados'
  | 'tunel_congelamento'
  | 'frigorifico_carcacas'
  | 'sala_processo'
  | 'supermercado'
  | 'industria_quimica'
  | 'data_center'
  | 'personalizado'

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
  tExt: number // °C (ar ambiente ao redor da câmara / sala)
  rhExt: number // %
  tGround: number // °C (solo / piso sob a câmara)
  runHours: number // h/dia de funcionamento do sistema (16–20)
  safetyFactor: number // % acrescido ao total
}

export interface Insulation {
  enabled: boolean
  k: number // W/(m·K) do isolante
  thickness: number // mm
  rSurfaces: number // m²·K/W (resistências superficiais interna + externa, ~0,17)
  tExtOverride: number | null // °C — se null usa room.tExt (ou tGround no piso)
  solarAdd: number // K adicionais por insolação
}

export interface Envelope {
  walls: Insulation
  roof: Insulation
  floor: Insulation
}

export interface Infiltration {
  method: InfiltrationMethod
  airChangesPerDay: number | null // null = automático pelo volume (ASHRAE)
  doorCount: number
  doorWidth: number // m
  doorHeight: number // m
  doorOpenMinutesPerDay: number // min/dia (soma de todas as aberturas por porta)
  protectionEffectiveness: number // 0–1 (cortina de ar / tiras: 0,5–0,9)
}

export interface ProductLoad {
  id: string
  name: string
  massPerDay: number // kg/dia que entram
  tIn: number // °C
  tOut: number // °C (normalmente = tInt)
  cpAbove: number // kJ/(kg·K) acima do congelamento
  cpBelow: number // kJ/(kg·K) abaixo do congelamento
  latent: number // kJ/kg calor latente de congelamento
  tFreeze: number // °C ponto de congelamento
  respiration: number // W/kg (frutas/hortaliças; 0 para os demais)
  storedMass: number // kg em estoque (base da respiração)
  pulldownHours: number // h para retirar o calor do lote (24 = regime diário)
  packagingFraction: number // kg embalagem / kg produto
  packagingCp: number // kJ/(kg·K)
}

export interface InternalLoads {
  people: number
  peopleHours: number // h/dia
  lightingWPerM2: number
  lightingHours: number
  evapFanKW: number | null // null = estimado (4 % da carga restante)
  evapFanHours: number
  forklifts: number
  forkliftKW: number
  forkliftHours: number
  otherEquipmentKW: number
  otherEquipmentHours: number
  defrostKW: number
  defrostMinutesPerDay: number
  defrostHeatFraction: number // 0–1 fração do calor do degelo que entra na câmara
}

export interface DirectLoad {
  id: string
  name: string
  kW: number
  hours: number // h/dia
}

export interface Ventilation {
  airflowM3h: number // m³/h de ar externo (renovação)
}

export interface CascadeInput {
  refrigerantHT: string
  tCascade: number // °C condensação do estágio de baixa (LT)
  dtCascade: number // K aproximação no trocador cascata
}

export interface TranscriticalInput {
  tGasCoolerOut: number // °C saída do gas cooler
  pGasCooler: number | null // bar(a); null = pressão ótima estimada
}

export interface CycleInput {
  refrigerant: string
  system: SystemType
  tEvap: number // °C (orvalho)
  tCond: number // °C (orvalho) — ignorado em transcrítico
  superheat: number // K
  subcooling: number // K
  compressorType: CompressorType
  etaIsOverride: number | null
  etaVolOverride: number | null
  motorEff: number // 0–1
  tInter: number | null // °C intermediária (duplo estágio); null = automática
  cascade: CascadeInput
  transcritical: TranscriticalInput
}

export interface PlantInput {
  nCompressors: number // em operação
  standby: boolean // N+1
  condenserType: CondenserType
  powerFactor: number
  voltage: number // V (trifásico)
  chargeKgPerKW: number | null // null = padrão do fluido / sistema
  machineRoomArea: number | null // m²; null = estimada
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

// ---------- Resultados ----------

/** Aviso com chave i18n e valor numérico opcional. */
export interface Warning {
  key: string
  value?: number
}

export type LoadGroup = 'transmission' | 'infiltration' | 'product' | 'internal' | 'ventilation' | 'direct'

export interface LoadItem {
  key: string
  labelKey: string // chave i18n
  label?: string // nome livre (produto / carga direta)
  group: LoadGroup
  kWhDay: number
  kWAvg: number // kWh/dia ÷ 24
  kWSizing: number // kWh/dia ÷ horas efetivas (dimensionamento)
  detail?: string
}

export interface LoadResult {
  items: LoadItem[]
  byGroup: Record<LoadGroup, number> // kWh/dia
  kWhDay: number
  kWAvg24: number
  kWEquipmentBase: number // kWh/dia ÷ horas de funcionamento
  kWEquipment: number // com fator de segurança
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
  Vsuction: number // m³/h real aspirado
  Vdisplacement: number // m³/h deslocamento necessário
  Tdischarge: number // K
  Psuction: number // kPa
  Pdischarge: number // kPa
}

export interface CycleResult {
  system: SystemType
  fluid: string
  points: StatePoint[]
  path: StatePoint[] // polilinha para o diagrama p-h
  stages: StageResult[]
  Qevap: number // kW
  Wtotal: number // kW (eixo)
  Qcond: number // kW (rejeição total, incluindo HT na cascata)
  COP: number
  COPCarnot: number
  secondLawEff: number
  glideEvap: number // K
  glideCond: number // K
  Pevap: number
  Pcond: number
  Tevap: number // K orvalho
  Tcond: number // K orvalho (ou saída do gas cooler no transcrítico)
  warnings: Warning[]
  ht?: CycleResult // estágio de alta da cascata (outro fluido)
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
    specificPower: number // kW_el / kW_frio
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

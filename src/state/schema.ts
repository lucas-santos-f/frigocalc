// Validação estrita de cenários (importação de arquivo, links de compartilhamento e localStorage).
// Toda entrada externa passa por aqui antes de chegar ao motor de cálculo.
import { z } from 'zod'
import type { Scenario } from '../engine/types'

const num = (min: number, max: number) => z.number().finite().min(min).max(max)
const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/)
const shortText = z.string().max(120)

const insulation = z.object({
  enabled: z.boolean(),
  k: num(0.005, 5),
  thickness: num(0, 1000),
  rSurfaces: num(0, 2),
  tExtOverride: num(-80, 80).nullable(),
  solarAdd: num(-20, 40),
})

export const scenarioSchema = z.object({
  id,
  name: shortText.min(1),
  application: z.enum(['camara_resfriados', 'camara_congelados', 'tunel_congelamento', 'frigorifico_carcacas', 'sala_processo', 'supermercado', 'industria_quimica', 'data_center', 'personalizado']),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  notes: z.string().max(4000),
  room: z.object({
    length: num(0.5, 500),
    width: num(0.5, 500),
    height: num(1, 60),
    tInt: num(-80, 60),
    rhInt: num(0, 100),
    tExt: num(-50, 60),
    rhExt: num(0, 100),
    tGround: num(-40, 60),
    runHours: num(1, 24),
    safetyFactor: num(0, 100),
  }),
  envelope: z.object({ walls: insulation, roof: insulation, floor: insulation }),
  infiltration: z.object({
    method: z.enum(['air_change', 'door']),
    airChangesPerDay: num(0, 500).nullable(),
    doorCount: num(0, 100),
    doorWidth: num(0, 20),
    doorHeight: num(0, 20),
    doorOpenMinutesPerDay: num(0, 1440),
    protectionEffectiveness: num(0, 1),
  }),
  products: z
    .array(
      z.object({
        id,
        name: shortText,
        massPerDay: num(0, 1e7),
        tIn: num(-80, 120),
        tOut: num(-80, 120),
        cpAbove: num(0, 10),
        cpBelow: num(0, 10),
        latent: num(0, 600),
        tFreeze: num(-60, 10),
        respiration: num(0, 5),
        storedMass: num(0, 1e8),
        pulldownHours: num(0.1, 240),
        packagingFraction: num(0, 5),
        packagingCp: num(0, 10),
      }),
    )
    .max(40),
  internal: z.object({
    people: num(0, 5000),
    peopleHours: num(0, 24),
    lightingWPerM2: num(0, 500),
    lightingHours: num(0, 24),
    evapFanKW: num(0, 5000).nullable(),
    evapFanHours: num(0, 24),
    forklifts: num(0, 500),
    forkliftKW: num(0, 100),
    forkliftHours: num(0, 24),
    otherEquipmentKW: num(0, 50000),
    otherEquipmentHours: num(0, 24),
    defrostKW: num(0, 5000),
    defrostMinutesPerDay: num(0, 1440),
    defrostHeatFraction: num(0, 1),
  }),
  ventilation: z.object({ airflowM3h: num(0, 1e6) }),
  directLoads: z.array(z.object({ id, name: shortText, kW: num(0, 1e6), hours: num(0, 24) })).max(60),
  cycle: z.object({
    refrigerant: z.string().regex(/^R[0-9A-Za-z()]{1,12}$/),
    system: z.enum(['single', 'two_stage', 'cascade', 'transcritical']),
    tEvap: num(-90, 40),
    tCond: num(-40, 90),
    superheat: num(0, 60),
    subcooling: num(0, 60),
    compressorType: z.enum(['reciprocating', 'screw', 'scroll']),
    etaIsOverride: num(0.2, 1).nullable(),
    etaVolOverride: num(0.2, 1).nullable(),
    motorEff: num(0.5, 1),
    tInter: num(-80, 60).nullable(),
    cascade: z.object({ refrigerantHT: z.string().regex(/^R[0-9A-Za-z()]{1,12}$/), tCascade: num(-60, 30), dtCascade: num(0, 20) }),
    transcritical: z.object({ tGasCoolerOut: num(-20, 70), pGasCooler: num(60, 160).nullable() }),
  }),
  plant: z.object({
    nCompressors: num(1, 40),
    standby: z.boolean(),
    condenserType: z.enum(['evaporative', 'air', 'water']),
    powerFactor: num(0.6, 1),
    voltage: num(100, 15000),
    chargeKgPerKW: num(0, 50).nullable(),
    machineRoomArea: num(0, 10000).nullable(),
  }),
})

export const envelopeSchema = z.object({ v: z.literal(1), s: scenarioSchema })

export function parseScenario(data: unknown): Scenario | null {
  const direct = scenarioSchema.safeParse(data)
  if (direct.success) return direct.data as Scenario
  const env = envelopeSchema.safeParse(data)
  if (env.success) return env.data.s as Scenario
  return null
}

export const MAX_IMPORT_BYTES = 256 * 1024

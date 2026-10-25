// Refrigerant metadata. Safety classes per ASHRAE 34; GWP100 from IPCC AR4 (the usual regulatory basis), AR5 for reference.
export type SafetyClass = 'A1' | 'A2L' | 'A2' | 'A3' | 'B1' | 'B2L' | 'B2' | 'B3'
export type FluidFamily = 'natural' | 'HFC' | 'HFO' | 'HCFC' | 'blend_HFC' | 'blend_HFO'

export interface RefrigerantMeta {
  id: string
  name: string
  family: FluidFamily
  safety: SafetyClass
  gwpAR4: number
  gwpAR5: number
  odp: number
  color: string
  /** typical applications */
  uses: ('LT' | 'MT' | 'HT' | 'industrial' | 'commercial' | 'chiller' | 'cascade_LT' | 'transcritical')[]
  /** typical charge in kg per kW of refrigerating capacity, as a first estimate */
  chargeKgPerKW: number
  legacy?: boolean
  notesKey: string
}

export const REFRIGERANTS: RefrigerantMeta[] = [
  { id: 'R717', name: 'R-717 Ammonia (NH₃)', family: 'natural', safety: 'B2L', gwpAR4: 0, gwpAR5: 0, odp: 0, color: '#1b7f3b', uses: ['LT', 'MT', 'industrial', 'chiller'], chargeKgPerKW: 1.2, notesKey: 'R717' },
  { id: 'R744', name: 'R-744 Carbon dioxide (CO₂)', family: 'natural', safety: 'A1', gwpAR4: 1, gwpAR5: 1, odp: 0, color: '#2b6cb0', uses: ['LT', 'MT', 'commercial', 'industrial', 'cascade_LT', 'transcritical'], chargeKgPerKW: 1.5, notesKey: 'R744' },
  { id: 'R290', name: 'R-290 Propane', family: 'natural', safety: 'A3', gwpAR4: 3, gwpAR5: 3, odp: 0, color: '#d97706', uses: ['MT', 'HT', 'commercial', 'chiller'], chargeKgPerKW: 0.8, notesKey: 'R290' },
  { id: 'R1270', name: 'R-1270 Propylene', family: 'natural', safety: 'A3', gwpAR4: 2, gwpAR5: 2, odp: 0, color: '#b45309', uses: ['LT', 'MT', 'industrial', 'chiller'], chargeKgPerKW: 0.8, notesKey: 'R1270' },
  { id: 'R600a', name: 'R-600a Isobutane', family: 'natural', safety: 'A3', gwpAR4: 3, gwpAR5: 3, odp: 0, color: '#92400e', uses: ['HT', 'commercial'], chargeKgPerKW: 0.6, notesKey: 'R600a' },
  { id: 'R134a', name: 'R-134a', family: 'HFC', safety: 'A1', gwpAR4: 1430, gwpAR5: 1300, odp: 0, color: '#6b7280', uses: ['MT', 'HT', 'chiller', 'commercial'], chargeKgPerKW: 3.0, notesKey: 'R134a' },
  { id: 'R22', name: 'R-22 (HCFC, legacy)', family: 'HCFC', safety: 'A1', gwpAR4: 1810, gwpAR5: 1760, odp: 0.055, color: '#9ca3af', uses: ['LT', 'MT', 'HT'], chargeKgPerKW: 3.0, legacy: true, notesKey: 'R22' },
  { id: 'R32', name: 'R-32', family: 'HFC', safety: 'A2L', gwpAR4: 675, gwpAR5: 677, odp: 0, color: '#7c3aed', uses: ['HT', 'chiller'], chargeKgPerKW: 2.0, notesKey: 'R32' },
  { id: 'R404A', name: 'R-404A', family: 'blend_HFC', safety: 'A1', gwpAR4: 3922, gwpAR5: 3943, odp: 0, color: '#dc2626', uses: ['LT', 'MT', 'commercial'], chargeKgPerKW: 3.0, legacy: true, notesKey: 'R404A' },
  { id: 'R507A', name: 'R-507A', family: 'blend_HFC', safety: 'A1', gwpAR4: 3985, gwpAR5: 3985, odp: 0, color: '#b91c1c', uses: ['LT', 'MT', 'commercial', 'industrial'], chargeKgPerKW: 3.0, legacy: true, notesKey: 'R507A' },
  { id: 'R407C', name: 'R-407C', family: 'blend_HFC', safety: 'A1', gwpAR4: 1774, gwpAR5: 1624, odp: 0, color: '#f87171', uses: ['MT', 'HT', 'chiller'], chargeKgPerKW: 3.0, notesKey: 'R407C' },
  { id: 'R407F', name: 'R-407F', family: 'blend_HFC', safety: 'A1', gwpAR4: 1825, gwpAR5: 1674, odp: 0, color: '#ef4444', uses: ['LT', 'MT', 'commercial'], chargeKgPerKW: 3.0, notesKey: 'R407F' },
  { id: 'R410A', name: 'R-410A', family: 'blend_HFC', safety: 'A1', gwpAR4: 2088, gwpAR5: 1924, odp: 0, color: '#a855f7', uses: ['HT', 'chiller'], chargeKgPerKW: 2.5, notesKey: 'R410A' },
  { id: 'R448A', name: 'R-448A', family: 'blend_HFO', safety: 'A1', gwpAR4: 1387, gwpAR5: 1273, odp: 0, color: '#0891b2', uses: ['LT', 'MT', 'commercial'], chargeKgPerKW: 3.0, notesKey: 'R448A' },
  { id: 'R449A', name: 'R-449A', family: 'blend_HFO', safety: 'A1', gwpAR4: 1397, gwpAR5: 1282, odp: 0, color: '#0e7490', uses: ['LT', 'MT', 'commercial'], chargeKgPerKW: 3.0, notesKey: 'R449A' },
  { id: 'R450A', name: 'R-450A', family: 'blend_HFO', safety: 'A1', gwpAR4: 605, gwpAR5: 547, odp: 0, color: '#14b8a6', uses: ['MT', 'HT', 'chiller'], chargeKgPerKW: 3.0, notesKey: 'R450A' },
  { id: 'R452A', name: 'R-452A', family: 'blend_HFO', safety: 'A1', gwpAR4: 2140, gwpAR5: 1945, odp: 0, color: '#f97316', uses: ['LT', 'MT', 'commercial'], chargeKgPerKW: 3.0, notesKey: 'R452A' },
  { id: 'R454B', name: 'R-454B', family: 'blend_HFO', safety: 'A2L', gwpAR4: 466, gwpAR5: 467, odp: 0, color: '#8b5cf6', uses: ['HT', 'chiller'], chargeKgPerKW: 2.0, notesKey: 'R454B' },
  { id: 'R454C', name: 'R-454C', family: 'blend_HFO', safety: 'A2L', gwpAR4: 148, gwpAR5: 146, odp: 0, color: '#06b6d4', uses: ['LT', 'MT', 'commercial'], chargeKgPerKW: 2.5, notesKey: 'R454C' },
  { id: 'R455A', name: 'R-455A', family: 'blend_HFO', safety: 'A2L', gwpAR4: 148, gwpAR5: 146, odp: 0, color: '#22d3ee', uses: ['LT', 'MT', 'commercial'], chargeKgPerKW: 2.5, notesKey: 'R455A' },
  { id: 'R513A', name: 'R-513A', family: 'blend_HFO', safety: 'A1', gwpAR4: 631, gwpAR5: 573, odp: 0, color: '#2dd4bf', uses: ['MT', 'HT', 'chiller'], chargeKgPerKW: 3.0, notesKey: 'R513A' },
  { id: 'R1234yf', name: 'R-1234yf', family: 'HFO', safety: 'A2L', gwpAR4: 4, gwpAR5: 1, odp: 0, color: '#65a30d', uses: ['MT', 'HT', 'chiller'], chargeKgPerKW: 3.0, notesKey: 'R1234yf' },
  { id: 'R1234ze(E)', name: 'R-1234ze(E)', family: 'HFO', safety: 'A2L', gwpAR4: 7, gwpAR5: 1, odp: 0, color: '#4d7c0f', uses: ['HT', 'chiller'], chargeKgPerKW: 3.0, notesKey: 'R1234zeE' },
]

export const REFRIGERANT_BY_ID: Record<string, RefrigerantMeta> = Object.fromEntries(REFRIGERANTS.map((r) => [r.id, r]))

export function refrigerantMeta(id: string): RefrigerantMeta {
  return REFRIGERANT_BY_ID[id] ?? REFRIGERANTS[5]
}

export const SAFETY_DESCRIPTION: Record<SafetyClass, { toxicity: 'A' | 'B'; flammability: '1' | '2L' | '2' | '3' }> = {
  A1: { toxicity: 'A', flammability: '1' },
  A2L: { toxicity: 'A', flammability: '2L' },
  A2: { toxicity: 'A', flammability: '2' },
  A3: { toxicity: 'A', flammability: '3' },
  B1: { toxicity: 'B', flammability: '1' },
  B2L: { toxicity: 'B', flammability: '2L' },
  B2: { toxicity: 'B', flammability: '2' },
  B3: { toxicity: 'B', flammability: '3' },
}

// Display unit conversion. Everything is SI internally.
export type UnitSystem = 'SI' | 'IP'

export type Quantity = 'power' | 'temp' | 'dtemp' | 'length' | 'area' | 'volume' | 'mass' | 'massflow' | 'pressure' | 'airflow' | 'waterflow' | 'enthalpy' | 'energy' | 'density' | 'uvalue' | 'kgperkw' | 'wpm2'

interface UnitDef {
  SI: { label: string; f: (v: number) => number; inv: (v: number) => number }
  IP: { label: string; f: (v: number) => number; inv: (v: number) => number }
}

const id = (v: number) => v

export const UNITS: Record<Quantity, UnitDef> = {
  power: { SI: { label: 'kW', f: id, inv: id }, IP: { label: 'TR', f: (v) => v / 3.51685, inv: (v) => v * 3.51685 } },
  temp: { SI: { label: '°C', f: id, inv: id }, IP: { label: '°F', f: (v) => (v * 9) / 5 + 32, inv: (v) => ((v - 32) * 5) / 9 } },
  dtemp: { SI: { label: 'K', f: id, inv: id }, IP: { label: '°F', f: (v) => (v * 9) / 5, inv: (v) => (v * 5) / 9 } },
  length: { SI: { label: 'm', f: id, inv: id }, IP: { label: 'ft', f: (v) => v / 0.3048, inv: (v) => v * 0.3048 } },
  area: { SI: { label: 'm²', f: id, inv: id }, IP: { label: 'ft²', f: (v) => v / 0.09290304, inv: (v) => v * 0.09290304 } },
  volume: { SI: { label: 'm³', f: id, inv: id }, IP: { label: 'ft³', f: (v) => v / 0.0283168, inv: (v) => v * 0.0283168 } },
  mass: { SI: { label: 'kg', f: id, inv: id }, IP: { label: 'lb', f: (v) => v / 0.45359237, inv: (v) => v * 0.45359237 } },
  massflow: { SI: { label: 'kg/s', f: id, inv: id }, IP: { label: 'lb/min', f: (v) => (v / 0.45359237) * 60, inv: (v) => (v * 0.45359237) / 60 } },
  pressure: { SI: { label: 'bar', f: (v) => v / 100, inv: (v) => v * 100 }, IP: { label: 'psia', f: (v) => v / 6.894757, inv: (v) => v * 6.894757 } },
  airflow: { SI: { label: 'm³/h', f: id, inv: id }, IP: { label: 'cfm', f: (v) => v / 1.699, inv: (v) => v * 1.699 } },
  waterflow: { SI: { label: 'm³/h', f: id, inv: id }, IP: { label: 'gpm', f: (v) => v * 4.40287, inv: (v) => v / 4.40287 } },
  enthalpy: { SI: { label: 'kJ/kg', f: id, inv: id }, IP: { label: 'Btu/lb', f: (v) => v / 2.326, inv: (v) => v * 2.326 } },
  energy: { SI: { label: 'kWh/d', f: id, inv: id }, IP: { label: 'kBtu/d', f: (v) => v * 3.412142, inv: (v) => v / 3.412142 } },
  density: { SI: { label: 'kg/m³', f: id, inv: id }, IP: { label: 'lb/ft³', f: (v) => v / 16.01846, inv: (v) => v * 16.01846 } },
  uvalue: { SI: { label: 'W/m²K', f: id, inv: id }, IP: { label: 'Btu/h·ft²·°F', f: (v) => v / 5.678263, inv: (v) => v * 5.678263 } },
  kgperkw: { SI: { label: 'kg/kW', f: id, inv: id }, IP: { label: 'lb/TR', f: (v) => (v / 0.45359237) * 3.51685, inv: (v) => (v * 0.45359237) / 3.51685 } },
  wpm2: { SI: { label: 'W/m²', f: id, inv: id }, IP: { label: 'W/ft²', f: (v) => v * 0.09290304, inv: (v) => v / 0.09290304 } },
}

export function toDisplay(q: Quantity, v: number, sys: UnitSystem): number {
  return UNITS[q][sys].f(v)
}
export function fromDisplay(q: Quantity, v: number, sys: UnitSystem): number {
  return UNITS[q][sys].inv(v)
}
export function unitLabel(q: Quantity, sys: UnitSystem): string {
  return UNITS[q][sys].label
}

/** Refrigerating capacity in other common units, for secondary display. */
export function powerAlternatives(kW: number): { TR: number; kcalh: number; BTUh: number } {
  return { TR: kW / 3.51685, kcalh: kW * 859.845, BTUh: kW * 3412.142 }
}

export function fmt(v: number, digits = 1, locale = 'pt-BR'): string {
  if (!Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  const d = abs >= 1000 ? 0 : abs >= 100 ? Math.min(digits, 1) : digits
  return v.toLocaleString(locale, { maximumFractionDigits: d, minimumFractionDigits: d })
}

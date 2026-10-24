// Propriedades termodinâmicas dos refrigerantes por interpolação em tabelas geradas com CoolProp
// (tools/gen_tables.py). Unidades: P kPa, T K, h kJ/kg, s kJ/(kg·K), rho kg/m³.
import type { Region, StatePoint } from './types'

export interface SatTable {
  P: number[]
  Tb: number[]
  Td: number[]
  hl: number[]
  hv: number[]
  sl: number[]
  sv: number[]
  rl: number[]
  rv: number[]
}
export interface ShRow {
  T: number[]
  h: number[]
  s: number[]
  r: number[]
}
export interface FluidTable {
  id: string
  Tcrit: number
  Pcrit: number
  critExact: boolean
  Tmin: number
  M: number | null
  sat: SatTable
  sh: { P: number[]; rows: ShRow[] }
}

export interface SatState {
  P: number
  Tb: number
  Td: number
  hl: number
  hv: number
  sl: number
  sv: number
  rl: number
  rv: number
}
export interface VaporState {
  T: number
  h: number
  s: number
  rho: number
  x?: number
  clamped?: boolean
}

// ---------- utilidades numéricas ----------

/** Índices e fator de interpolação para x em xs (crescente). Fora da faixa: fixa nas bordas. */
function bracket(xs: number[], x: number): [number, number, number] {
  const n = xs.length
  if (n < 2) return [0, 0, 0]
  if (x <= xs[0]) return [0, 1, 0]
  if (x >= xs[n - 1]) return [n - 2, n - 1, 1]
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= x) lo = mid
    else hi = mid
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo])
  return [lo, hi, t]
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpLog = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(Math.max(a, 1e-9)), Math.log(Math.max(b, 1e-9)), t))

function interp(xs: number[], ys: number[], x: number): number {
  const [i0, i1, t] = bracket(xs, x)
  return lerp(ys[i0], ys[i1], t)
}

/** Interpolação inversa em uma linha monotônica crescente (ys → xs). */
function invRow(ys: number[], xs: number[], y: number): number | 'below' | 'above' {
  if (y < ys[0]) return 'below'
  if (y > ys[ys.length - 1]) return 'above'
  const [i0, i1, t] = bracket(ys, y)
  return lerp(xs[i0], xs[i1], t)
}

interface RowPt {
  dT: number // T − T[0]
  dh: number // h − h[0]
  ds: number // s − s[0]
  rr: number // rho / rho[0]
  clamped: boolean
}

/** Avalia uma linha (pressão fixa) em coordenadas relativas ao primeiro ponto, por T, s ou h. */
function rowEval(row: ShRow, by: 'T' | 's' | 'h', value: number): RowPt {
  const n = row.T.length
  const xs = by === 'T' ? row.T : by === 's' ? row.s : row.h
  let i0: number
  let i1: number
  let t: number
  let clamped = false
  if (value <= xs[0]) {
    i0 = 0
    i1 = 1
    t = (value - xs[0]) / (xs[1] - xs[0]) // extrapolação leve abaixo (≈ saturação)
    if (t < -0.05) {
      t = 0
      clamped = true
    }
  } else if (value >= xs[n - 1]) {
    i0 = n - 2
    i1 = n - 1
    t = (value - xs[i0]) / (xs[i1] - xs[i0])
    clamped = t > 1.5
    if (clamped) t = 1.5
  } else {
    ;[i0, i1, t] = bracket(xs, value)
  }
  const T = lerp(row.T[i0], row.T[i1], t)
  const h = lerp(row.h[i0], row.h[i1], t)
  const s = lerp(row.s[i0], row.s[i1], t)
  const r = t >= 0 && t <= 1 ? lerpLog(row.r[i0], row.r[i1], t) : Math.max(1e-6, lerp(row.r[i0], row.r[i1], t))
  return { dT: T - row.T[0], dh: h - row.h[0], ds: s - row.s[0], rr: r / row.r[0], clamped }
}

// ---------- classe Fluid ----------

export class Fluid {
  readonly id: string
  readonly Tcrit: number
  readonly Pcrit: number
  readonly critExact: boolean
  readonly Tmin: number
  readonly M: number | null
  readonly PminSat: number
  readonly PmaxSat: number
  private readonly sat: SatTable
  private readonly satLogP: number[]
  private readonly sh: { P: number[]; rows: ShRow[] }
  private readonly shLogP: number[]

  constructor(table: FluidTable) {
    this.id = table.id
    this.Tcrit = table.Tcrit
    this.Pcrit = table.Pcrit
    this.critExact = table.critExact
    this.Tmin = table.Tmin
    this.M = table.M
    this.sat = table.sat
    this.sh = table.sh
    this.satLogP = table.sat.P.map(Math.log)
    this.shLogP = table.sh.P.map(Math.log)
    this.PminSat = table.sat.P[0]
    this.PmaxSat = table.sat.P[table.sat.P.length - 1]
  }

  /** Faixa útil de temperatura de orvalho (K). */
  get TdMin(): number {
    return this.sat.Td[0]
  }
  get TdMax(): number {
    return this.sat.Td[this.sat.Td.length - 1]
  }

  /** Estado de saturação a uma pressão (kPa). null se fora da faixa de saturação (super/crítico). */
  satAtP(P: number): SatState | null {
    if (P > this.PmaxSat || P < this.PminSat * 0.999) return null
    const lp = Math.log(P)
    const [i0, i1, t] = bracket(this.satLogP, lp)
    const s = this.sat
    return {
      P,
      Tb: lerp(s.Tb[i0], s.Tb[i1], t),
      Td: lerp(s.Td[i0], s.Td[i1], t),
      hl: lerp(s.hl[i0], s.hl[i1], t),
      hv: lerp(s.hv[i0], s.hv[i1], t),
      sl: lerp(s.sl[i0], s.sl[i1], t),
      sv: lerp(s.sv[i0], s.sv[i1], t),
      rl: lerp(s.rl[i0], s.rl[i1], t),
      rv: lerpLog(s.rv[i0], s.rv[i1], t),
    }
  }

  /** Pressão de orvalho (kPa) para T (K). */
  pDew(T: number): number {
    return Math.exp(interp(this.sat.Td, this.satLogP, T))
  }
  /** Pressão de bolha (kPa) para T (K). */
  pBubble(T: number): number {
    return Math.exp(interp(this.sat.Tb, this.satLogP, T))
  }
  tDew(P: number): number {
    return interp(this.satLogP, this.sat.Td, Math.log(P))
  }
  tBubble(P: number): number {
    return interp(this.satLogP, this.sat.Tb, Math.log(P))
  }
  /** Deslizamento de temperatura (K) à pressão P. */
  glide(P: number): number {
    const s = this.satAtP(P)
    return s ? Math.max(0, s.Td - s.Tb) : 0
  }

  /** Líquido (sub-resfriado) a T (K): entalpia de bolha em T + correção de pressão. */
  liquid(T: number, P?: number): VaporState {
    const Tb = Math.min(Math.max(T, this.sat.Tb[0]), this.sat.Tb[this.sat.Tb.length - 1])
    const h0 = interp(this.sat.Tb, this.sat.hl, Tb)
    const s0 = interp(this.sat.Tb, this.sat.sl, Tb)
    const rho = interp(this.sat.Tb, this.sat.rl, Tb)
    const Pb = this.pBubble(Tb)
    const dh = P !== undefined && P > Pb ? (P - Pb) / rho : 0 // kPa·m³/kg = kJ/kg
    return { T, h: h0 + dh, s: s0, rho, clamped: Tb !== T }
  }

  /** Combina duas linhas vizinhas em pressão; ancora na saturação quando ambas são subcríticas. */
  private combine(P: number, by: 'T' | 's' | 'h', value: number): VaporState {
    const lp = Math.log(P)
    const [i0, i1, t] = bracket(this.shLogP, lp)
    const r0 = this.sh.rows[i0]
    const r1 = this.sh.rows[i1]
    const sat = this.sh.P[i1] <= this.PmaxSat ? this.satAtP(P) : null
    if (sat) {
      // coordenadas relativas à saturação (ΔT, Δh, Δs) variam suavemente com P
      const rel = by === 'T' ? value - sat.Td : by === 's' ? value - sat.sv : value - sat.hv
      const a = rowEval(r0, by, (by === 'T' ? r0.T[0] : by === 's' ? r0.s[0] : r0.h[0]) + rel)
      const b = rowEval(r1, by, (by === 'T' ? r1.T[0] : by === 's' ? r1.s[0] : r1.h[0]) + rel)
      return {
        T: sat.Td + lerp(a.dT, b.dT, t),
        h: sat.hv + lerp(a.dh, b.dh, t),
        s: sat.sv + lerp(a.ds, b.ds, t),
        rho: sat.rv * lerpLog(a.rr, b.rr, t),
        clamped: a.clamped || b.clamped,
      }
    }
    // região supercrítica (ou acima da faixa de saturação): coordenadas absolutas
    const a = rowEval(r0, by, value)
    const b = rowEval(r1, by, value)
    return {
      T: lerp(r0.T[0] + a.dT, r1.T[0] + b.dT, t),
      h: lerp(r0.h[0] + a.dh, r1.h[0] + b.dh, t),
      s: lerp(r0.s[0] + a.ds, r1.s[0] + b.ds, t),
      rho: lerpLog(r0.r[0] * a.rr, r1.r[0] * b.rr, t),
      clamped: a.clamped || b.clamped,
    }
  }

  /** Vapor superaquecido / fluido supercrítico a (P, T). */
  vapor(P: number, T: number): VaporState {
    const v = this.combine(P, 'T', T)
    return { ...v, T }
  }

  /** Estado a (P, s): superaquecido, ou bifásico se s < s_vapor saturado. */
  stateFromPS(P: number, s: number): VaporState {
    const sat = this.satAtP(P)
    if (sat && s <= sat.sv) {
      const x = Math.max(0, (s - sat.sl) / (sat.sv - sat.sl))
      const h = sat.hl + x * (sat.hv - sat.hl)
      const rho = 1 / (1 / sat.rl + x * (1 / sat.rv - 1 / sat.rl))
      return { T: lerp(sat.Tb, sat.Td, x), h, s, rho, x }
    }
    const v = this.combine(P, 's', s)
    return { ...v, s }
  }

  /** Estado a (P, h): líquido, bifásico ou vapor. */
  stateFromPH(P: number, h: number): VaporState & { region: Region } {
    const sat = this.satAtP(P)
    if (sat) {
      if (h <= sat.hl) {
        const T = invRow(this.sat.hl, this.sat.Tb, h)
        const Tl = typeof T === 'number' ? T : this.sat.Tb[0]
        const liq = this.liquid(Tl, P)
        return { ...liq, h, region: 'liq' }
      }
      if (h < sat.hv) {
        const x = (h - sat.hl) / (sat.hv - sat.hl)
        const rho = 1 / (1 / sat.rl + x * (1 / sat.rv - 1 / sat.rl))
        return { T: lerp(sat.Tb, sat.Td, x), h, s: sat.sl + x * (sat.sv - sat.sl), rho, x, region: 'two_phase' }
      }
    }
    const v = this.combine(P, 'h', h)
    return { ...v, h, region: sat ? 'sh' : 'sc' }
  }

  /** Cria um ponto de estado padronizado. */
  point(id: string, P: number, st: VaporState, region: Region): StatePoint {
    return { id, P, T: st.T, h: st.h, s: st.s, rho: st.rho, x: st.x, region }
  }

  /** Curvas de saturação para o diagrama p-h: [h, P] líquido e vapor. */
  dome(): { liquid: [number, number][]; vapor: [number, number][] } {
    const s = this.sat
    const liquid: [number, number][] = s.P.map((P, i) => [s.hl[i], P])
    const vapor: [number, number][] = s.P.map((P, i) => [s.hv[i], P])
    return { liquid, vapor }
  }

  /** Isoterma (K) no diagrama p-h: pontos [h, P] da região de líquido, bifásica e vapor. */
  isotherm(T: number): [number, number][] {
    const pts: [number, number][] = []
    const subcritical = T < this.Tcrit - 0.5 && T >= this.sat.Td[0] && T <= this.TdMax
    if (subcritical) {
      const Pd = this.pDew(T)
      const Pb = this.pBubble(T)
      for (const P of this.sh.P) {
        if (P >= Pd * 0.98) break
        pts.push([this.vapor(P, T).h, P])
      }
      const sd = this.satAtP(Pd)
      const sb = this.satAtP(Pb)
      if (sd && sb) {
        pts.push([sd.hv, Pd])
        pts.push([sb.hl, Pb])
      }
      const liq = this.liquid(T, Pb)
      pts.push([liq.h, Math.min(Pb * 6, this.sh.P[this.sh.P.length - 1])])
    } else {
      for (const P of this.sh.P) pts.push([this.vapor(P, T).h, P])
    }
    return pts
  }

  /** Grade de pressões da tabela (para desenhar curvas). */
  get pressureGrid(): number[] {
    return this.sh.P
  }
}

// ---------- carregamento preguiçoso das tabelas ----------

const modules = import.meta.glob<{ default: FluidTable }>('../data/tables/R*.json')
const cache = new Map<string, Promise<Fluid>>()
const resolved = new Map<string, Fluid>()

export function fluidFileKey(id: string): string {
  return `../data/tables/${id.replace('(', '_').replace(')', '')}.json`
}

export function availableFluidIds(): string[] {
  return Object.keys(modules)
    .map((k) => k.replace('../data/tables/', '').replace('.json', '').replace('_E', '(E)'))
    .sort()
}

export function loadFluid(id: string): Promise<Fluid> {
  const key = fluidFileKey(id)
  let p = cache.get(key)
  if (!p) {
    const loader = modules[key]
    if (!loader) return Promise.reject(new Error(`Fluido sem tabela: ${id}`))
    p = loader().then((m) => {
      const f = new Fluid(m.default)
      resolved.set(id, f)
      return f
    })
    cache.set(key, p)
  }
  return p
}

export function getFluidSync(id: string): Fluid | undefined {
  return resolved.get(id)
}

export async function loadFluids(ids: string[]): Promise<Record<string, Fluid>> {
  const list = await Promise.all(ids.map((id) => loadFluid(id)))
  return Object.fromEntries(ids.map((id, i) => [id, list[i]]))
}

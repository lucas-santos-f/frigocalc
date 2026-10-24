// Ciclo de refrigeração por compressão de vapor: estágio simples, duplo estágio com resfriador intermediário
// de injeção total (flash intercooler), cascata (dois fluidos) e CO₂ transcrítico.
import type { CompressorType, CycleInput, CycleResult, StageResult, StatePoint, Warning } from './types'
import type { Fluid } from './props'

const K0 = 273.15

export interface Efficiencies {
  etaIs: number
  etaVol: number
}

/** Estimativa de rendimento isentrópico e volumétrico em função do tipo de compressor e da razão de pressões. */
export function compressorEfficiencies(type: CompressorType, pr: number, etaIsOverride: number | null, etaVolOverride: number | null): Efficiencies {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  let etaIs: number
  let etaVol: number
  switch (type) {
    case 'screw':
      etaIs = clamp(0.76 - 0.008 * pr, 0.55, 0.75)
      etaVol = clamp(0.95 - 0.012 * pr, 0.6, 0.93)
      break
    case 'scroll':
      etaIs = clamp(0.74 - 0.012 * pr, 0.5, 0.72)
      etaVol = clamp(0.96 - 0.02 * pr, 0.55, 0.93)
      break
    default:
      etaIs = clamp(0.8 - 0.015 * pr, 0.5, 0.78)
      etaVol = clamp(0.97 - 0.04 * pr, 0.45, 0.92)
  }
  if (etaIsOverride !== null && etaIsOverride > 0.2 && etaIsOverride <= 1) etaIs = etaIsOverride
  if (etaVolOverride !== null && etaVolOverride > 0.2 && etaVolOverride <= 1) etaVol = etaVolOverride
  return { etaIs, etaVol }
}

/** Pressão ótima de gas cooler (bar abs) para CO₂ transcrítico — correlação de Liao, Zhao & Jakobsen (2000). */
export function optimalGasCoolerPressureBar(tEvapC: number, tGcOutC: number): number {
  const p = (2.778 - 0.0157 * tEvapC) * tGcOutC + 0.381 * tEvapC - 9.34
  return Math.min(140, Math.max(75, p))
}

interface StageOpts {
  fluid: Fluid
  Pe: number // kPa
  Pc: number // kPa
  superheat: number
  subcooling: number
  type: CompressorType
  etaIsOverride: number | null
  etaVolOverride: number | null
  Q: number // kW
  name: string
  idPrefix: string
  transcritical?: { Tgc: number } // K — saída do gas cooler
  suctionState?: StatePoint // estado de sucção imposto (duplo estágio HP)
  liquidState?: StatePoint // estado do líquido antes da expansão imposto
}

interface StageOut {
  points: StatePoint[]
  path: StatePoint[]
  stage: StageResult
  Qcond: number
  W: number
  mdot: number
  warnings: Warning[]
  s1: StatePoint
  s2: StatePoint
  s3: StatePoint
  s4: StatePoint
}

function stageCore(o: StageOpts): StageOut {
  const f = o.fluid
  const warnings: Warning[] = []
  const satE = f.satAtP(o.Pe)
  if (!satE) throw new Error('evap_out_of_range')

  // 1 — sucção
  let s1: StatePoint
  if (o.suctionState) s1 = { ...o.suctionState, id: `${o.idPrefix}1` }
  else if (o.superheat <= 0.01) s1 = { id: `${o.idPrefix}1`, P: o.Pe, T: satE.Td, h: satE.hv, s: satE.sv, rho: satE.rv, region: 'sat_v' }
  else {
    const v = f.vapor(o.Pe, satE.Td + o.superheat)
    s1 = f.point(`${o.idPrefix}1`, o.Pe, v, 'sh')
  }

  const pr = o.Pc / o.Pe
  const eff = compressorEfficiencies(o.type, pr, o.etaIsOverride, o.etaVolOverride)

  // 2 — descarga (isentrópica corrigida pelo rendimento)
  const s2s = f.stateFromPS(o.Pc, s1.s)
  const h2 = s1.h + (s2s.h - s1.h) / eff.etaIs
  const st2 = f.stateFromPH(o.Pc, h2)
  const s2 = f.point(`${o.idPrefix}2`, o.Pc, st2, st2.region)
  if (st2.x !== undefined && st2.x < 1) warnings.push({ key: 'warn.wet_compression' })

  // 3 — líquido na saída do condensador / gas cooler
  let s3: StatePoint
  if (o.liquidState) s3 = { ...o.liquidState, id: `${o.idPrefix}3` }
  else if (o.transcritical) {
    const v = f.vapor(o.Pc, o.transcritical.Tgc)
    if (v.clamped) warnings.push({ key: 'warn.table_clamped' })
    s3 = f.point(`${o.idPrefix}3`, o.Pc, v, 'sc')
  } else {
    const satC = f.satAtP(o.Pc)
    if (!satC) throw new Error('cond_above_critical')
    if (o.subcooling <= 0.01) s3 = { id: `${o.idPrefix}3`, P: o.Pc, T: satC.Tb, h: satC.hl, s: satC.sl, rho: satC.rl, region: 'sat_l' }
    else {
      const liq = f.liquid(satC.Tb - o.subcooling, o.Pc)
      s3 = f.point(`${o.idPrefix}3`, o.Pc, liq, 'liq')
    }
  }

  // 4 — após expansão isentálpica
  const st4 = f.stateFromPH(o.Pe, s3.h)
  const s4 = f.point(`${o.idPrefix}4`, o.Pe, st4, st4.region)

  const dhEvap = s1.h - s4.h
  if (dhEvap <= 1) throw new Error('no_cooling_effect')
  const mdot = o.Q / dhEvap
  const W = mdot * (s2.h - s1.h)
  const Qcond = mdot * (s2.h - s3.h)
  const Vsuction = (mdot / s1.rho) * 3600
  const stage: StageResult = {
    name: o.name,
    pressureRatio: pr,
    etaIs: eff.etaIs,
    etaVol: eff.etaVol,
    mdot,
    Wshaft: W,
    Vsuction,
    Vdisplacement: Vsuction / eff.etaVol,
    Tdischarge: s2.T,
    Psuction: o.Pe,
    Pdischarge: o.Pc,
  }
  if (s2.T - K0 > (f.id === 'R717' ? 130 : 120)) warnings.push({ key: 'warn.discharge_high', value: s2.T - K0 })
  if (pr > 9) warnings.push({ key: 'warn.pr_high', value: pr })
  return { points: [s1, s2, s3, s4], path: [s1, s2, s3, s4, s1], stage, Qcond, W, mdot, warnings, s1, s2, s3, s4 }
}

function carnot(Te: number, Tc: number): number {
  return Tc > Te ? Te / (Tc - Te) : Infinity
}

export interface CycleFluids {
  main: Fluid
  ht?: Fluid
}

/** Calcula o ciclo completo para a carga Q (kW) no evaporador. Lança Error com chave i18n em caso de entrada inválida. */
export function computeCycle(input: CycleInput, Q: number, fluids: CycleFluids): CycleResult {
  const f = fluids.main
  const Te = input.tEvap + K0
  if (Te < f.TdMin || Te > f.TdMax - 1) throw new Error('evap_out_of_range')
  const Pe = f.pDew(Te)
  const warnings: Warning[] = []
  const common = { fluid: f, Pe, superheat: input.superheat, subcooling: input.subcooling, type: input.compressorType, etaIsOverride: input.etaIsOverride, etaVolOverride: input.etaVolOverride }

  // ---------- CO₂ transcrítico ----------
  if (input.system === 'transcritical') {
    const Tgc = input.transcritical.tGasCoolerOut + K0
    if (!f.critExact || f.Tcrit > 320) warnings.push({ key: 'warn.transcritical_fluid' })
    let Pc = (input.transcritical.pGasCooler ?? optimalGasCoolerPressureBar(input.tEvap, input.transcritical.tGasCoolerOut)) * 100
    let transcritical: StageOpts['transcritical'] | undefined = { Tgc }
    if (Tgc < f.Tcrit - 2 && input.transcritical.pGasCooler === null) {
      // ambiente frio: opera subcrítico, condensando ~2 K acima da saída
      Pc = f.pDew(Tgc + 2)
      transcritical = undefined
      warnings.push({ key: 'warn.co2_subcritical_mode' })
    } else if (Pc <= f.Pcrit) {
      Pc = f.Pcrit * 1.02
    }
    const st = stageCore({ ...common, Pc, Q, name: 'single', idPrefix: '', transcritical })
    const Tcond = transcritical ? Tgc : f.tDew(Pc)
    const cop = Q / st.W
    const carn = carnot(Te, Tcond)
    return {
      system: input.system,
      fluid: f.id,
      points: st.points,
      path: st.path,
      stages: [st.stage],
      Qevap: Q,
      Wtotal: st.W,
      Qcond: st.Qcond,
      COP: cop,
      COPCarnot: carn,
      secondLawEff: cop / carn,
      glideEvap: f.glide(Pe),
      glideCond: 0,
      Pevap: Pe,
      Pcond: Pc,
      Tevap: Te,
      Tcond,
      warnings: [...warnings, ...st.warnings],
    }
  }

  // ---------- cascata (a condensação pertence ao fluido de alta) ----------
  const Tc = input.tCond + K0
  if (input.system === 'cascade') return computeCascade(input, Q, fluids, Te, Pe, Tc, warnings)

  // ---------- pressão de condensação ----------
  if (Tc <= Te + 2) throw new Error('cond_below_evap')
  if (Tc > f.TdMax - 0.5) throw new Error('cond_above_critical')
  const Pc = f.pDew(Tc)
  if (f.id === 'R744' && input.tCond > 22) warnings.push({ key: 'warn.co2_needs_transcritical' })

  // ---------- estágio simples ----------
  if (input.system === 'single') {
    const st = stageCore({ ...common, Pc, Q, name: 'single', idPrefix: '' })
    const cop = Q / st.W
    const carn = carnot(Te, Tc)
    return {
      system: input.system,
      fluid: f.id,
      points: st.points,
      path: st.path,
      stages: [st.stage],
      Qevap: Q,
      Wtotal: st.W,
      Qcond: st.Qcond,
      COP: cop,
      COPCarnot: carn,
      secondLawEff: cop / carn,
      glideEvap: f.glide(Pe),
      glideCond: f.glide(Pc),
      Pevap: Pe,
      Pcond: Pc,
      Tevap: Te,
      Tcond: Tc,
      warnings: [...warnings, ...st.warnings],
    }
  }

  // ---------- duplo estágio (resfriador intermediário de injeção total) ----------
  {
    const Pint = input.tInter !== null ? f.pDew(input.tInter + K0) : Math.sqrt(Pe * Pc)
    if (Pint <= Pe * 1.05 || Pint >= Pc * 0.95) throw new Error('inter_out_of_range')
    const satI = f.satAtP(Pint)
    if (!satI) throw new Error('inter_out_of_range')
    const satC = f.satAtP(Pc)
    if (!satC) throw new Error('cond_above_critical')

    // líquido do condensador (5) → expansão para o intermediário (6) → líquido saturado intermediário (7)
    const liq5 = input.subcooling > 0.01 ? f.liquid(satC.Tb - input.subcooling, Pc) : { T: satC.Tb, h: satC.hl, s: satC.sl, rho: satC.rl }
    const p5: StatePoint = { id: '5', P: Pc, T: liq5.T, h: liq5.h, s: liq5.s, rho: liq5.rho, region: input.subcooling > 0.01 ? 'liq' : 'sat_l' }
    const st6 = f.stateFromPH(Pint, p5.h)
    const p6: StatePoint = f.point('6', Pint, st6, st6.region)
    const p7: StatePoint = { id: '7', P: Pint, T: satI.Tb, h: satI.hl, s: satI.sl, rho: satI.rl, region: 'sat_l' }

    // baixa pressão: 1 → 2 (Pint), líquido imposto = 7
    const lp = stageCore({ ...common, Pc: Pint, Q, name: 'LP', idPrefix: '', liquidState: p7 })
    const p1 = lp.s1
    const p2 = lp.s2
    const p8 = { ...lp.s4, id: '8' }
    // alta pressão: sucção = vapor saturado no intermediário (3)
    const p3: StatePoint = { id: '3', P: Pint, T: satI.Td, h: satI.hv, s: satI.sv, rho: satI.rv, region: 'sat_v' }
    const mdotHP = (lp.mdot * (p2.h - p7.h)) / (p3.h - p6.h)
    if (!(mdotHP > 0)) throw new Error('inter_out_of_range')
    const hpQ = mdotHP * (p3.h - p6.h) // "capacidade" fictícia para reaproveitar stageCore
    const hp = stageCore({ ...common, Pe: Pint, Pc, Q: hpQ, name: 'HP', idPrefix: 'h', suctionState: p3, liquidState: p5 })
    const p4 = { ...hp.s2, id: '4' }
    // recalcula HP com a vazão correta (stageCore usou Q/(h3-h6) = mdotHP, consistente)
    const stageHP: StageResult = { ...hp.stage, mdot: mdotHP, Wshaft: mdotHP * (p4.h - p3.h), Vsuction: (mdotHP / p3.rho) * 3600, Vdisplacement: (mdotHP / p3.rho) * 3600 / hp.stage.etaVol }
    const W = lp.W + stageHP.Wshaft
    const Qcond = mdotHP * (p4.h - p5.h)
    const cop = Q / W
    const carn = carnot(Te, Tc)
    const points = [p1, p2, p3, p4, p5, p6, p7, p8]
    const path = [p1, p2, p3, p4, p5, p6, p7, p8, p1]
    return {
      system: input.system,
      fluid: f.id,
      points,
      path,
      stages: [lp.stage, stageHP],
      Qevap: Q,
      Wtotal: W,
      Qcond,
      COP: cop,
      COPCarnot: carn,
      secondLawEff: cop / carn,
      glideEvap: f.glide(Pe),
      glideCond: f.glide(Pc),
      Pevap: Pe,
      Pcond: Pc,
      Tevap: Te,
      Tcond: Tc,
      warnings: [...warnings, ...lp.warnings, ...hp.warnings.filter((w) => w.key !== 'warn.pr_high')],
    }
  }

}

function computeCascade(input: CycleInput, Q: number, fluids: CycleFluids, Te: number, Pe: number, Tc: number, warnings: Warning[]): CycleResult {
  const f = fluids.main
  const common = { fluid: f, Pe, superheat: input.superheat, subcooling: input.subcooling, type: input.compressorType, etaIsOverride: input.etaIsOverride, etaVolOverride: input.etaVolOverride }
  // ---------- cascata ----------
  const ht = fluids.ht
  if (!ht) throw new Error('cascade_fluid_missing')
  const Tcasc = input.cascade.tCascade + K0
  if (Tcasc <= Te + 3) throw new Error('cascade_out_of_range')
  if (Tcasc > f.TdMax - 0.5) throw new Error('cascade_out_of_range')
  const PcLT = f.pDew(Tcasc)
  const lt = stageCore({ ...common, Pc: PcLT, Q, name: 'LT', idPrefix: '' })
  const TeHT = Tcasc - input.cascade.dtCascade
  if (TeHT < ht.TdMin || Tc > ht.TdMax - 0.5) throw new Error('cascade_out_of_range')
  const PeHT = ht.pDew(TeHT)
  const PcHT = ht.pDew(Tc)
  const htSt = stageCore({ fluid: ht, Pe: PeHT, Pc: PcHT, superheat: input.superheat, subcooling: input.subcooling, type: input.compressorType, etaIsOverride: input.etaIsOverride, etaVolOverride: input.etaVolOverride, Q: lt.Qcond, name: 'HT', idPrefix: 'h' })
  const W = lt.W + htSt.W
  const cop = Q / W
  const carn = carnot(Te, Tc)
  const htCop = lt.Qcond / htSt.W
  const htResult: CycleResult = {
    system: 'single',
    fluid: ht.id,
    points: htSt.points,
    path: htSt.path,
    stages: [htSt.stage],
    Qevap: lt.Qcond,
    Wtotal: htSt.W,
    Qcond: htSt.Qcond,
    COP: htCop,
    COPCarnot: carnot(TeHT, Tc),
    secondLawEff: htCop / carnot(TeHT, Tc),
    glideEvap: ht.glide(PeHT),
    glideCond: ht.glide(PcHT),
    Pevap: PeHT,
    Pcond: PcHT,
    Tevap: TeHT,
    Tcond: Tc,
    warnings: htSt.warnings,
  }
  return {
    system: input.system,
    fluid: f.id,
    points: lt.points,
    path: lt.path,
    stages: [lt.stage, htSt.stage],
    Qevap: Q,
    Wtotal: W,
    Qcond: htSt.Qcond,
    COP: cop,
    COPCarnot: carn,
    secondLawEff: cop / carn,
    glideEvap: f.glide(Pe),
    glideCond: f.glide(PcLT),
    Pevap: Pe,
    Pcond: PcLT,
    Tevap: Te,
    Tcond: Tcasc,
    warnings: [...warnings, ...lt.warnings],
    ht: htResult,
  }
}

/** Varredura de sensibilidade: COP e potência em função de uma temperatura. */
export function sweep(input: CycleInput, Q: number, fluids: CycleFluids, param: 'tEvap' | 'tCond', values: number[]): { x: number; COP: number; W: number; Tdis: number }[] {
  const out: { x: number; COP: number; W: number; Tdis: number }[] = []
  for (const v of values) {
    try {
      const r = computeCycle({ ...input, [param]: v }, Q, fluids)
      out.push({ x: v, COP: r.COP, W: r.Wtotal, Tdis: Math.max(...r.stages.map((s) => s.Tdischarge)) - K0 })
    } catch {
      // ponto fora da faixa — ignora
    }
  }
  return out
}

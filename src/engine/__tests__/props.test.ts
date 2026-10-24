import { describe, expect, it } from 'vitest'
import { loadFluid } from '../props'
import reference from '../../data/tables/_reference.json'

type Ref = Record<string, { Te: number; Tc: number; Pe_kPa: number; Pc_kPa: number; h1: number; s1: number; v1: number; h2s: number; T2s: number; Tb_cond: number; hl_cond: number; hv_evap: number; sv_evap: number; hl_evap: number; h3_sc5: number; COP_ideal_SC5: number }>
const REF = reference as Ref

describe('interpolação das tabelas CoolProp', () => {
  for (const [id, r] of Object.entries(REF)) {
    it(`${id}: pressões de saturação`, async () => {
      const f = await loadFluid(id)
      expect(f.pDew(r.Te)).toBeCloseTo(r.Pe_kPa, -0.5) // ±0,3 %
      expect(Math.abs(f.pDew(r.Te) / r.Pe_kPa - 1)).toBeLessThan(0.004)
      expect(Math.abs(f.pDew(r.Tc) / r.Pc_kPa - 1)).toBeLessThan(0.004)
    })
    it(`${id}: estado de sucção superaquecido 5 K`, async () => {
      const f = await loadFluid(id)
      const v = f.vapor(r.Pe_kPa, r.Te + 5)
      expect(Math.abs(v.h - r.h1)).toBeLessThan(0.6)
      expect(Math.abs(v.s - r.s1)).toBeLessThan(0.0025)
      expect(Math.abs(1 / v.rho / r.v1 - 1)).toBeLessThan(0.01)
    })
    it(`${id}: compressão isentrópica e líquido sub-resfriado`, async () => {
      const f = await loadFluid(id)
      const s2 = f.stateFromPS(r.Pc_kPa, r.s1)
      expect(Math.abs(s2.h - r.h2s)).toBeLessThan(Math.max(1.0, 0.001 * Math.abs(r.h2s)))
      expect(Math.abs(s2.T - r.T2s)).toBeLessThan(1.0)
      const liq = f.liquid(r.Tb_cond - 5, r.Pc_kPa)
      expect(Math.abs(liq.h - r.h3_sc5)).toBeLessThan(Math.max(1.0, 0.001 * Math.abs(r.h3_sc5)))
      const sat = f.satAtP(r.Pe_kPa)!
      expect(Math.abs(sat.hv - r.hv_evap)).toBeLessThan(0.5)
      expect(Math.abs(sat.hl - r.hl_evap)).toBeLessThan(0.5)
    })
  }

  it('R744: região supercrítica (gas cooler 90 bar, 35 °C)', async () => {
    const f = await loadFluid('R744')
    const v = f.vapor(9000, 308.15)
    // CoolProp: h ≈ 300–330 kJ/kg nessa condição (referência IIR), densidade ~ 560–700 kg/m³
    expect(v.rho).toBeGreaterThan(400)
    expect(v.rho).toBeLessThan(800)
    expect(v.clamped).toBeFalsy()
  })

  it('bifásico a partir de (P, h)', async () => {
    const f = await loadFluid('R134a')
    const sat = f.satAtP(300)!
    const st = f.stateFromPH(300, (sat.hl + sat.hv) / 2)
    expect(st.region).toBe('two_phase')
    expect(st.x).toBeCloseTo(0.5, 2)
  })
})

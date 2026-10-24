import { describe, expect, it } from 'vitest'
import { computeCycle, optimalGasCoolerPressureBar } from '../cycle'
import { loadFluid } from '../props'
import { createScenario } from '../presets'
import reference from '../../data/tables/_reference.json'

const REF = reference as Record<string, { COP_ideal_SC5: number }>

describe('ciclo de compressão de vapor', () => {
  it('R134a −10/40 °C, rendimento 100 %: COP ≈ referência CoolProp', async () => {
    const f = await loadFluid('R134a')
    const sc = createScenario('camara_resfriados', 't')
    const r = computeCycle({ ...sc.cycle, refrigerant: 'R134a', system: 'single', tEvap: -10, tCond: 40, superheat: 5, subcooling: 5, etaIsOverride: 1 }, 100, { main: f })
    expect(Math.abs(r.COP / REF.R134a.COP_ideal_SC5 - 1)).toBeLessThan(0.02)
    expect(r.Qcond).toBeCloseTo(r.Qevap + r.Wtotal, 3)
    expect(r.points.map((p) => p.id)).toEqual(['1', '2', '3', '4'])
  })

  it('R717 duplo estágio −35/35 °C tem COP maior que estágio simples', async () => {
    const f = await loadFluid('R717')
    const sc = createScenario('camara_congelados', 't')
    const single = computeCycle({ ...sc.cycle, refrigerant: 'R717', system: 'single', tEvap: -35, tCond: 35 }, 200, { main: f })
    const two = computeCycle({ ...sc.cycle, refrigerant: 'R717', system: 'two_stage', tEvap: -35, tCond: 35 }, 200, { main: f })
    expect(two.COP).toBeGreaterThan(single.COP)
    expect(two.stages).toHaveLength(2)
    expect(two.stages[1].mdot).toBeGreaterThan(two.stages[0].mdot)
    // descarga do simples muito alta → aviso
    expect(single.warnings.some((w) => w.key === 'warn.discharge_high')).toBe(true)
    expect(Math.abs(two.Qcond - (two.Qevap + two.Wtotal))).toBeLessThan(0.5)
  })

  it('cascata CO₂ / NH₃', async () => {
    const lt = await loadFluid('R744')
    const ht = await loadFluid('R717')
    const sc = createScenario('camara_congelados', 't')
    const r = computeCycle({ ...sc.cycle, refrigerant: 'R744', system: 'cascade', tEvap: -40, tCond: 35, cascade: { refrigerantHT: 'R717', tCascade: -8, dtCascade: 5 } }, 300, { main: lt, ht })
    expect(r.ht).toBeDefined()
    expect(r.ht!.Qevap).toBeGreaterThan(300)
    expect(r.COP).toBeGreaterThan(1.2)
    expect(r.COP).toBeLessThan(3)
  })

  it('CO₂ transcrítico: pressão ótima e balanço', async () => {
    const f = await loadFluid('R744')
    const sc = createScenario('supermercado', 't')
    const pOpt = optimalGasCoolerPressureBar(-8, 35)
    expect(pOpt).toBeGreaterThan(80)
    expect(pOpt).toBeLessThan(100)
    const r = computeCycle({ ...sc.cycle, refrigerant: 'R744', system: 'transcritical', tEvap: -8, transcritical: { tGasCoolerOut: 35, pGasCooler: null } }, 100, { main: f })
    expect(r.Pcond).toBeCloseTo(pOpt * 100, -1)
    expect(r.COP).toBeGreaterThan(1.5)
    expect(r.COP).toBeLessThan(3.5)
    expect(r.points[2].region).toBe('sc')
  })

  it('misturas com deslizamento informam glide', async () => {
    const f = await loadFluid('R448A')
    const sc = createScenario('camara_resfriados', 't')
    const r = computeCycle({ ...sc.cycle, refrigerant: 'R448A', tEvap: -8, tCond: 40 }, 50, { main: f })
    expect(r.glideEvap).toBeGreaterThan(3)
    expect(r.COP).toBeGreaterThan(2)
  })

  it('erros de faixa são sinalizados', async () => {
    const f = await loadFluid('R134a')
    const sc = createScenario('camara_resfriados', 't')
    expect(() => computeCycle({ ...sc.cycle, refrigerant: 'R134a', tEvap: 30, tCond: 20 }, 10, { main: f })).toThrow('cond_below_evap')
    expect(() => computeCycle({ ...sc.cycle, refrigerant: 'R134a', tEvap: -10, tCond: 120 }, 10, { main: f })).toThrow('cond_above_critical')
  })
})

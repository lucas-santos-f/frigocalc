import { describe, expect, it } from 'vitest'
import { autoAirChanges, computeLoad, personHeat, productEnthalpyChange } from '../load'
import { createScenario } from '../presets'
import { moistAir, pws } from '../psychro'

describe('psicrometria', () => {
  it('pressão de saturação a 20 °C ≈ 2,339 kPa', () => {
    expect(pws(20)).toBeCloseTo(2.339, 2)
  })
  it('ar a 25 °C / 50 %: W ≈ 0,00988, h ≈ 50,3 kJ/kg', () => {
    const a = moistAir(25, { rh: 0.5 })
    expect(a.W).toBeCloseTo(0.00988, 4)
    expect(a.h).toBeCloseTo(50.3, 0)
    expect(a.Tdp).toBeCloseTo(13.9, 0)
    expect(a.Twb).toBeCloseTo(17.9, 0)
  })
})

describe('carga térmica', () => {
  it('entalpia do produto com congelamento', () => {
    const dh = productEnthalpyChange({ tIn: 5, tOut: -18, tFreeze: -2.8, cpAbove: 3.3, cpBelow: 1.8, latent: 247 })
    expect(dh).toBeCloseTo(3.3 * 7.8 + 247 + 1.8 * 15.2, 1)
    expect(productEnthalpyChange({ tIn: 2, tOut: 5, tFreeze: -1, cpAbove: 3, cpBelow: 1.5, latent: 200 })).toBe(0)
  })
  it('renovações de ar e calor por pessoa', () => {
    expect(autoAirChanges(283, 2)).toBeCloseTo(9.6, 0)
    expect(personHeat(0)).toBe(270)
    expect(personHeat(-20)).toBe(390)
  })
  it('câmara de resfriados: total plausível e soma dos grupos', () => {
    const sc = createScenario('camara_resfriados', 't')
    const r = computeLoad(sc)
    expect(r.kWEquipment).toBeGreaterThan(10)
    expect(r.kWEquipment).toBeLessThan(80)
    const sum = Object.values(r.byGroup).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(r.kWhDay, 6)
    expect(r.items.find((i) => i.key === 'fans')).toBeDefined()
    expect(r.kWEquipment).toBeCloseTo(r.kWEquipmentBase * 1.1, 6)
  })
  it('túnel de congelamento: produto domina e usa tempo de pulldown', () => {
    const sc = createScenario('tunel_congelamento', 't')
    const r = computeLoad(sc)
    const prod = r.items.find((i) => i.group === 'product')!
    expect(prod.kWSizing).toBeCloseTo(prod.kWhDay / 8, 6)
    expect(r.byGroup.product / r.kWhDay).toBeGreaterThan(0.5)
  })
  it('data center: só cargas diretas', () => {
    const sc = createScenario('data_center', 't')
    const r = computeLoad(sc)
    expect(r.byGroup.transmission).toBe(0)
    expect(r.kWEquipmentBase).toBeCloseTo(540, 0)
  })
})

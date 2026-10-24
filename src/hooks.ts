import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from './state/store'
import { translate } from './i18n'
import { fmt, toDisplay, unitLabel, type Quantity } from './units'
import { loadFluid, type Fluid } from './engine/props'
import { computeLoad } from './engine/load'
import { computeCycle } from './engine/cycle'
import { computePlant } from './engine/plant'
import type { CycleResult, LoadResult, PlantResult, Scenario } from './engine/types'

export type TFn = (key: string, value?: number | string) => string

export function useT(): TFn {
  const lang = useStore((s) => s.lang)
  return useCallback((key: string, value?: number | string) => translate(lang, key, value), [lang])
}

export function useUnits() {
  const sys = useStore((s) => s.units)
  const lang = useStore((s) => s.lang)
  return useMemo(
    () => ({
      sys,
      /** valor formatado + unidade */
      show: (q: Quantity, v: number, digits = 1) => `${fmt(toDisplay(q, v, sys), digits, lang)} ${unitLabel(q, sys)}`,
      /** só o número convertido */
      val: (q: Quantity, v: number, digits = 1) => fmt(toDisplay(q, v, sys), digits, lang),
      label: (q: Quantity) => unitLabel(q, sys),
      n: (v: number, digits = 1) => fmt(v, digits, lang),
    }),
    [sys, lang],
  )
}

interface FluidsState {
  fluids: Record<string, Fluid> | null
  error: string | null
}

/** Carrega (preguiçosamente) as tabelas dos fluidos pedidos. */
export function useFluids(ids: string[]): FluidsState {
  const key = ids.slice().sort().join('|')
  const [state, setState] = useState<FluidsState>({ fluids: null, error: null })
  useEffect(() => {
    let alive = true
    const list = key ? key.split('|') : []
    Promise.all(list.map((id) => loadFluid(id)))
      .then((fs) => alive && setState({ fluids: Object.fromEntries(list.map((id, i) => [id, fs[i]])), error: null }))
      .catch((e: unknown) => alive && setState({ fluids: null, error: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [key])
  return state
}

export interface Computed {
  load: LoadResult
  cycle: CycleResult | null
  cycleError: string | null
  plant: PlantResult | null
  loading: boolean
  fluids: Record<string, Fluid> | null
}

export function computeAll(sc: Scenario, fluids: Record<string, Fluid> | null): Omit<Computed, 'loading' | 'fluids'> {
  const load = computeLoad(sc)
  if (!fluids) return { load, cycle: null, cycleError: null, plant: null }
  const main = fluids[sc.cycle.refrigerant]
  const ht = sc.cycle.system === 'cascade' ? fluids[sc.cycle.cascade.refrigerantHT] : undefined
  if (!main || (sc.cycle.system === 'cascade' && !ht)) return { load, cycle: null, cycleError: null, plant: null }
  try {
    const cycle = computeCycle(sc.cycle, Math.max(load.kWEquipment, 0.1), { main, ht })
    const plant = computePlant(sc, load, cycle)
    return { load, cycle, cycleError: null, plant }
  } catch (e) {
    return { load, cycle: null, cycleError: e instanceof Error ? e.message : 'generic', plant: null }
  }
}

export function useComputed(sc: Scenario): Computed {
  const ids = useMemo(() => (sc.cycle.system === 'cascade' ? [sc.cycle.refrigerant, sc.cycle.cascade.refrigerantHT] : [sc.cycle.refrigerant]), [sc.cycle.refrigerant, sc.cycle.system, sc.cycle.cascade.refrigerantHT])
  const { fluids, error } = useFluids(ids)
  return useMemo(() => {
    const r = computeAll(sc, fluids)
    return { ...r, cycleError: r.cycleError ?? error, loading: !fluids && !error, fluids }
  }, [sc, fluids, error])
}

/** Tema atual (claro/escuro) para gráficos. */
export function useTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => currentTheme())
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setTheme(currentTheme())
    mq.addEventListener('change', update)
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', update)
      obs.disconnect()
    }
  }, [])
  return theme
}

export function currentTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark' || attr === 'light') return attr
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import LZString from 'lz-string'
import type { ApplicationId, Scenario } from '../engine/types'
import { createScenario, uid } from '../engine/presets'
import { translate, type Lang } from '../i18n'
import type { UnitSystem } from '../units'
import { MAX_IMPORT_BYTES, parseScenario, scenarioSchema } from './schema'

export type Tab = 'load' | 'cycle' | 'plant' | 'compare' | 'about'

interface AppState {
  scenarios: Scenario[]
  currentId: string
  lang: Lang
  units: UnitSystem
  tab: Tab
  toast: string | null
  setLang: (l: Lang) => void
  setUnits: (u: UnitSystem) => void
  setTab: (t: Tab) => void
  select: (id: string) => void
  createNew: (app: ApplicationId, name?: string) => void
  duplicate: (id: string) => void
  remove: (id: string) => void
  update: (mutator: (draft: Scenario) => void) => void
  importScenario: (sc: Scenario, nameSuffix?: string) => void
  showToast: (msg: string | null) => void
}

const MAX_SCENARIOS = 60

function cloneScenario(sc: Scenario): Scenario {
  return structuredClone(sc)
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      const first = createScenario('chilled_storage', translate('en', 'scenario.example_name'))
      return {
        scenarios: [first],
        currentId: first.id,
        lang: 'en',
        units: 'SI',
        tab: 'load',
        toast: null,
        setLang: (lang) => set({ lang }),
        setUnits: (units) => set({ units }),
        setTab: (tab) => set({ tab }),
        select: (id) => set((s) => (s.scenarios.some((x) => x.id === id) ? { currentId: id } : {})),
        createNew: (app, name) =>
          set((s) => {
            const sc = createScenario(app, name ?? `${app} ${s.scenarios.length + 1}`)
            return { scenarios: [...s.scenarios, sc].slice(-MAX_SCENARIOS), currentId: sc.id }
          }),
        duplicate: (id) =>
          set((s) => {
            const src = s.scenarios.find((x) => x.id === id)
            if (!src) return {}
            const copy = cloneScenario(src)
            copy.id = uid()
            copy.name = `${src.name} (${translate(s.lang, 'scenario.copy_suffix')})`
            copy.createdAt = copy.updatedAt = new Date().toISOString()
            return { scenarios: [...s.scenarios, copy].slice(-MAX_SCENARIOS), currentId: copy.id }
          }),
        remove: (id) =>
          set((s) => {
            let rest = s.scenarios.filter((x) => x.id !== id)
            if (rest.length === 0) rest = [createScenario('chilled_storage', translate(s.lang, 'scenario.untitled'))]
            const currentId = s.currentId === id ? rest[rest.length - 1].id : s.currentId
            return { scenarios: rest, currentId }
          }),
        update: (mutator) =>
          set((s) => {
            const idx = s.scenarios.findIndex((x) => x.id === s.currentId)
            if (idx < 0) return {}
            const draft = cloneScenario(s.scenarios[idx])
            mutator(draft)
            draft.updatedAt = new Date().toISOString()
            const scenarios = s.scenarios.slice()
            scenarios[idx] = draft
            return { scenarios }
          }),
        importScenario: (sc, nameSuffix) =>
          set((s) => {
            const copy = cloneScenario(sc)
            copy.id = uid()
            if (nameSuffix) copy.name = `${copy.name} ${nameSuffix}`.slice(0, 120)
            copy.updatedAt = new Date().toISOString()
            return { scenarios: [...s.scenarios, copy].slice(-MAX_SCENARIOS), currentId: copy.id }
          }),
        showToast: (toast) => {
          set({ toast })
          if (toast) setTimeout(() => get().toast === toast && set({ toast: null }), 4000)
        },
      }
    },
    {
      name: 'frigocalc:v2',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ scenarios: s.scenarios, currentId: s.currentId, lang: s.lang, units: s.units }),
      merge: (persisted, current) => {
        // localStorage can be edited by hand, so only scenarios that pass the schema survive
        const p = (persisted ?? {}) as Partial<AppState>
        const valid = Array.isArray(p.scenarios) ? p.scenarios.map((x) => scenarioSchema.safeParse(x)).filter((r) => r.success).map((r) => r.data as Scenario) : []
        const scenarios = valid.length ? valid.slice(-MAX_SCENARIOS) : current.scenarios
        const currentId = scenarios.some((x) => x.id === p.currentId) ? (p.currentId as string) : scenarios[0].id
        return {
          ...current,
          scenarios,
          currentId,
          lang: p.lang === 'en' || p.lang === 'pt-BR' ? p.lang : current.lang,
          units: p.units === 'IP' || p.units === 'SI' ? p.units : current.units,
        }
      },
    },
  ),
)

export function useCurrentScenario(): Scenario {
  return useStore((s) => s.scenarios.find((x) => x.id === s.currentId) ?? s.scenarios[0])
}

export function encodeShare(sc: Scenario): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify({ v: 1, s: sc }))
}

export function decodeShare(fragment: string): Scenario | null {
  if (!fragment || fragment.length > 60000) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(fragment)
    if (!json || json.length > MAX_IMPORT_BYTES) return null
    return parseScenario(JSON.parse(json))
  } catch {
    return null
  }
}

export function exportJson(sc: Scenario): void {
  const blob = new Blob([JSON.stringify({ v: 1, s: sc }, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `${safeFileName(sc.name)}.frigocalc.json`)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFileName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) || 'scenario'
}

export async function importJsonFile(file: File): Promise<Scenario | null> {
  if (file.size > MAX_IMPORT_BYTES) return null
  try {
    const text = await file.text()
    return parseScenario(JSON.parse(text))
  } catch {
    return null
  }
}

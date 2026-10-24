import { useRef } from 'react'
import { encodeShare, exportJson, importJsonFile, useStore } from '../state/store'
import { useT, type Computed } from '../hooks'
import type { ApplicationId, Scenario } from '../engine/types'
import { APPLICATIONS } from '../engine/presets'
import { exportCsv } from '../export'

export function ScenarioBar({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const { scenarios, select, createNew, duplicate, remove, update, importScenario, showToast } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${encodeShare(sc)}`
    try {
      await navigator.clipboard.writeText(url)
      showToast(t('scenario.link_copied'))
    } catch {
      location.hash = `s=${encodeShare(sc)}`
      showToast(t('scenario.link_failed'))
    }
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    const parsed = await importJsonFile(file)
    if (parsed) {
      importScenario(parsed, `(${t('scenario.imported').toLowerCase()})`)
      showToast(t('scenario.imported'))
    } else showToast(t('scenario.invalid_file'))
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="scenario-bar no-print">
      <div className="grow">
        <select value={sc.id} onChange={(e) => select(e.target.value)} aria-label={t('scenario.list')} style={{ maxWidth: 260 }}>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input type="text" value={sc.name} maxLength={120} aria-label={t('scenario.name')} onChange={(e) => update((d) => (d.name = e.target.value || '—'))} />
      </div>
      <div className="btn-row">
        <select
          value=""
          aria-label={t('scenario.new_from')}
          onChange={(e) => {
            const app = e.target.value as ApplicationId
            if (app) createNew(app, t(`application.${app}`))
          }}
        >
          <option value="">+ {t('scenario.new')}…</option>
          {APPLICATIONS.map((a) => (
            <option key={a} value={a}>
              {t(`application.${a}`)}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={() => duplicate(sc.id)}>
          {t('scenario.duplicate')}
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (confirm(t('scenario.confirm_delete'))) remove(sc.id)
          }}
        >
          {t('scenario.delete')}
        </button>
        <button type="button" className="btn" onClick={share}>
          {t('scenario.share')}
        </button>
        <button type="button" className="btn" onClick={() => exportJson(sc)}>
          {t('scenario.export_json')}
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          {t('scenario.import_json')}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => onImport(e.target.files?.[0])} />
        <button type="button" className="btn" onClick={() => exportCsv(sc, computed, t)}>
          {t('scenario.export_csv')}
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          {t('scenario.print')}
        </button>
      </div>
    </div>
  )
}

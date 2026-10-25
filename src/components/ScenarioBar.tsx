import { useEffect, useRef } from 'react'
import { ChevronDown, Copy, Download, FileJson, FileSpreadsheet, Link2, Printer, Trash2, Upload } from 'lucide-react'
import { encodeShare, exportJson, importJsonFile, useStore } from '../state/store'
import { useT, type Computed } from '../hooks'
import type { ApplicationId, Scenario } from '../engine/types'
import { APPLICATIONS } from '../engine/presets'
import { exportCsv } from '../export'

export function ScenarioBar({ sc, computed }: { sc: Scenario; computed: Computed }) {
  const t = useT()
  const { scenarios, lang, select, createNew, duplicate, remove, update, importScenario, showToast } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const close = (e: Event) => {
      const menu = menuRef.current
      if (!menu?.open) return
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menu.contains(e.target as Node)) menu.open = false
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [])

  const fromMenu = (action: () => void) => () => {
    if (menuRef.current) menuRef.current.open = false
    action()
  }

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
    <section className="scenario-head no-print">
      <div className="scenario-title">
        <label className="eyebrow" htmlFor="scenario-name">
          {t('scenario.title')}
        </label>
        <input id="scenario-name" className="title-input" type="text" value={sc.name} maxLength={120} onChange={(e) => update((d) => (d.name = e.target.value || '—'))} />
        <div className="scenario-meta">
          {t(`application.${sc.application}`)} · {t('scenario.saved')}
        </div>
      </div>

      <div className="scenario-actions">
        <select className="btn-select" value={sc.id} onChange={(e) => select(e.target.value)} aria-label={t('scenario.list')} title={t('scenario.list')}>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="btn-select"
          value=""
          aria-label={t('scenario.new_from')}
          title={t('scenario.new_from')}
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
        <button type="button" className="btn" onClick={() => duplicate(sc.id)} title={t('scenario.duplicate')}>
          <Copy size={16} />
          <span className="btn-label">{t('scenario.duplicate')}</span>
        </button>
        <button type="button" className="btn" onClick={share} title={t('scenario.share')}>
          <Link2 size={16} />
          <span className="btn-label">{t('scenario.share')}</span>
        </button>
        <details className="menu" ref={menuRef}>
          <summary className="btn" title={t('scenario.export')}>
            <Download size={16} />
            <span className="btn-label">{t('scenario.export')}</span>
            <ChevronDown size={14} />
          </summary>
          <div className="menu-pop">
            <button type="button" className="menu-item" onClick={fromMenu(() => exportJson(sc))}>
              <FileJson size={16} />
              {t('scenario.export_json')}
            </button>
            <button type="button" className="menu-item" onClick={fromMenu(() => fileRef.current?.click())}>
              <Upload size={16} />
              {t('scenario.import_json')}
            </button>
            <button type="button" className="menu-item" onClick={fromMenu(() => exportCsv(sc, computed, t, lang))}>
              <FileSpreadsheet size={16} />
              {t('scenario.export_csv')}
            </button>
            <button type="button" className="menu-item" onClick={fromMenu(() => window.print())}>
              <Printer size={16} />
              {t('scenario.print')}
            </button>
          </div>
        </details>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        <button
          type="button"
          className="btn icon danger"
          aria-label={t('scenario.delete')}
          title={t('scenario.delete')}
          onClick={() => {
            if (confirm(t('scenario.confirm_delete'))) remove(sc.id)
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </section>
  )
}

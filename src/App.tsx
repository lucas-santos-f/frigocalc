import { useEffect, useState } from 'react'
import { decodeShare, useCurrentScenario, useStore, type Tab } from './state/store'
import { useComputed, useT } from './hooks'
import { LANGS } from './i18n'
import { ScenarioBar } from './components/ScenarioBar'
import { LoadPanel } from './components/panels/LoadPanel'
import { CyclePanel } from './components/panels/CyclePanel'
import { PlantPanel } from './components/panels/PlantPanel'
import { ComparePanel } from './components/panels/ComparePanel'
import { AboutPanel } from './components/panels/AboutPanel'

type ThemePref = 'auto' | 'light' | 'dark'
const THEME_KEY = 'frigocalc:theme'

function readTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export default function App() {
  const t = useT()
  const sc = useCurrentScenario()
  const computed = useComputed(sc)
  const { lang, setLang, units, setUnits, tab, setTab, toast, importScenario, showToast } = useStore()
  const [theme, setTheme] = useState<ThemePref>(readTheme)

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* armazenamento indisponível */
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // importa cenário vindo de link de compartilhamento (#s=...)
  useEffect(() => {
    const m = /^#s=([A-Za-z0-9+\-$_.!*'(),%]+)$/.exec(location.hash)
    if (!m) return
    const parsed = decodeShare(m[1])
    history.replaceState(null, '', location.pathname + location.search)
    if (parsed) {
      importScenario(parsed, '(link)')
      showToast(t('scenario.imported'))
    } else showToast(t('scenario.invalid_link'))
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'load', label: t('nav.load') },
    { id: 'cycle', label: t('nav.cycle') },
    { id: 'plant', label: t('nav.plant') },
    { id: 'compare', label: t('nav.compare') },
    { id: 'about', label: t('nav.about') },
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="rgba(255,255,255,0.15)" />
            <path d="M32 10v44M12 20l40 24M12 44l40-24" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <circle cx="32" cy="32" r="6" fill="#7fd1ff" />
          </svg>
          <h1>
            {t('app.title')}
            <small>{t('app.subtitle')}</small>
          </h1>
        </div>
        <div className="header-controls">
          <div className="seg" role="group" aria-label={t('app.lang')}>
            {LANGS.map((l) => (
              <button key={l.id} type="button" className={lang === l.id ? 'active' : ''} onClick={() => setLang(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label={t('app.units')}>
            {(['SI', 'IP'] as const).map((s) => (
              <button key={s} type="button" className={units === s ? 'active' : ''} onClick={() => setUnits(s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label={t('app.theme')}>
            {(['auto', 'light', 'dark'] as const).map((th) => (
              <button key={th} type="button" className={theme === th ? 'active' : ''} onClick={() => setTheme(th)} title={th}>
                {th === 'auto' ? 'A' : th === 'light' ? '☀' : '☾'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <ScenarioBar sc={sc} computed={computed} />

      <nav className="tabs no-print" aria-label="Seções">
        {tabs.map((tb) => (
          <button key={tb.id} type="button" className={tab === tb.id ? 'active' : ''} onClick={() => setTab(tb.id)}>
            {tb.label}
          </button>
        ))}
      </nav>

      <main className="main">
        <div className="print-only" style={{ marginBottom: 12 }}>
          <h1>
            {t('app.title')} — {sc.name}
          </h1>
          <div className="muted">
            {t(`application.${sc.application}`)} · {new Date(sc.updatedAt).toLocaleString(lang)}
          </div>
        </div>
        {tab === 'load' && <LoadPanel sc={sc} computed={computed} />}
        {tab === 'cycle' && <CyclePanel sc={sc} computed={computed} />}
        {tab === 'plant' && <PlantPanel sc={sc} computed={computed} />}
        {tab === 'compare' && <ComparePanel sc={sc} computed={computed} />}
        {tab === 'about' && <AboutPanel />}
      </main>

      <footer className="footer">
        {t('app.footer')} · {t('scenario.saved')} · v{__APP_VERSION__}
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { fromDisplay, toDisplay, unitLabel, type Quantity } from '../../units'
import { useStore } from '../../state/store'
import { useT } from '../../hooks'
import type { Warning } from '../../engine/types'

interface TipPos {
  left: number
  width: number
  top?: number
  bottom?: number
}

// Small "?" button with a plain-language explanation. The bubble is fixed-positioned
// on document.body so cards and scrolling panels can't clip it.
export function Help({ text }: { text: string }) {
  const t = useT()
  const id = useId()
  const ref = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<TipPos | null>(null)

  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(300, window.innerWidth - 16)
    const left = Math.min(Math.max(8, r.left - 12), window.innerWidth - width - 8)
    setPos(r.bottom + 140 < window.innerHeight ? { left, width, top: r.bottom + 6 } : { left, width, bottom: window.innerHeight - r.top + 6 })
  }
  const hide = () => setPos(null)

  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="help no-print"
        aria-label={t('common.help')}
        aria-describedby={id}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        onKeyDown={(e) => e.key === 'Escape' && hide()}
      >
        ?
      </button>
      <span id={id} className="sr-only">
        {text}
      </span>
      {pos &&
        createPortal(
          <div className="tooltip" aria-hidden="true" style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}>
            {text}
          </div>,
          document.body,
        )}
    </>
  )
}

interface NumberFieldProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  quantity?: Quantity
  unit?: string
  step?: number
  min?: number
  max?: number
  digits?: number
  nullable?: boolean
  autoHint?: string
  title?: string
  help?: string
}

function roundTo(v: number, digits: number): number {
  const p = Math.pow(10, digits)
  return Math.round(v * p) / p
}

// Values are stored in SI; the field converts to and from the selected unit system.
export function NumberField({ label, value, onChange, quantity, unit, step, min, max, digits = 2, nullable, autoHint, title, help }: NumberFieldProps) {
  const sys = useStore((s) => s.units)
  const t = useT()
  const id = useId()
  const disp = value === null ? '' : String(roundTo(quantity ? toDisplay(quantity, value, sys) : value, digits + (quantity && sys === 'IP' ? 1 : 0)))
  const [text, setText] = useState(disp)
  useEffect(() => setText(disp), [disp])
  const unitText = unit ?? (quantity ? unitLabel(quantity, sys) : '')

  const commit = (raw: string) => {
    const s = raw.replace(',', '.').trim()
    if (s === '') {
      if (nullable) onChange(null)
      else setText(disp)
      return
    }
    const n = Number(s)
    if (!Number.isFinite(n)) {
      setText(disp)
      return
    }
    let si = quantity ? fromDisplay(quantity, n, sys) : n
    if (min !== undefined) si = Math.max(min, si)
    if (max !== undefined) si = Math.min(max, si)
    onChange(roundTo(si, 6))
  }

  return (
    <div className="field" title={title}>
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        {help && <Help text={help} />}
        {nullable && value !== null && (
          <button type="button" className="auto-link" onClick={() => onChange(null)}>
            {t('common.auto')}
          </button>
        )}
      </div>
      <div className="control">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className={unitText ? '' : 'no-unit'}
          value={text}
          placeholder={nullable && value === null ? (autoHint ?? t('common.auto')) : undefined}
          step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
        {unitText && <span className="unit">{unitText}</span>}
      </div>
    </div>
  )
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  help?: string
}

export function SelectField<T extends string>({ label, value, onChange, options, help }: SelectFieldProps<T>) {
  const id = useId()
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        {help && <Help text={help} />}
      </div>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CheckField({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <div className="field">
      <div className="check">
        <label>
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          {label}
        </label>
        {help && <Help text={help} />}
      </div>
    </div>
  )
}

export function TextField({ label, value, onChange, maxLength = 120 }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  const id = useId()
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
      </div>
      <input id={id} type="text" value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function Card({ title, hint, right, children, className }: { title?: ReactNode; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className ? `card ${className}` : 'card'}>
      {(title || hint || right) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {hint && <div className="hint">{hint}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, big }: { label: string; value: ReactNode; sub?: ReactNode; big?: boolean }) {
  return (
    <div className={`stat ${big ? 'big' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function Alerts({ warnings, error }: { warnings?: Warning[]; error?: string | null }) {
  const t = useT()
  if (!error && (!warnings || warnings.length === 0)) return null
  return (
    <div className="alerts">
      {error && <div className="alert error">{t(`err.${error}`) === `err.${error}` ? t('err.generic') : t(`err.${error}`)}</div>}
      {warnings?.map((w, i) => (
        <div key={`${w.key}-${i}`} className="alert">
          {t(w.key, w.value !== undefined ? Math.round(w.value * 10) / 10 : undefined)}
        </div>
      ))}
    </div>
  )
}

export function SafetyChip({ cls }: { cls: string }) {
  return <span className={`chip ${cls}`}>{cls}</span>
}

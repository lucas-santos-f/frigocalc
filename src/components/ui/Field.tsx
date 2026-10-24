import { useEffect, useState, type ReactNode } from 'react'
import { fromDisplay, toDisplay, unitLabel, type Quantity } from '../../units'
import { useStore } from '../../state/store'
import { useT } from '../../hooks'
import type { Warning } from '../../engine/types'

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
}

function roundTo(v: number, digits: number): number {
  const p = Math.pow(10, digits)
  return Math.round(v * p) / p
}

/** Campo numérico com conversão automática de unidades (valor interno sempre em SI). */
export function NumberField({ label, value, onChange, quantity, unit, step, min, max, digits = 2, nullable, autoHint, title }: NumberFieldProps) {
  const sys = useStore((s) => s.units)
  const t = useT()
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
      <label>
        <span>{label}</span>
        {nullable && value !== null && (
          <button type="button" className="auto-link" onClick={() => onChange(null)}>
            {t('common.auto')}
          </button>
        )}
      </label>
      <div className="control">
        <input
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
}

export function SelectField<T extends string>({ label, value, onChange, options }: SelectFieldProps<T>) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="field">
      <label>
        <span>&nbsp;</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    </div>
  )
}

export function TextField({ label, value, onChange, maxLength = 120 }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
      </label>
      <input type="text" value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function Card({ title, hint, right, children, className }: { title?: ReactNode; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {title && (
        <h2>
          <span>{title}</span>
          {right}
        </h2>
      )}
      {hint && <div className="hint">{hint}</div>}
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

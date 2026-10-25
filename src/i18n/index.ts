import en, { type I18nKey } from './en'
import ptBR from './pt-BR'

export type Lang = 'en' | 'pt-BR'
export type { I18nKey }

const DICTS: Record<Lang, Record<I18nKey, string>> = { en, 'pt-BR': ptBR }

export function translate(lang: Lang, key: string, value?: number | string): string {
  const dict = DICTS[lang] ?? en
  const raw = (dict as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key
  if (value === undefined) return raw
  const v = typeof value === 'number' ? value.toLocaleString(lang, { maximumFractionDigits: 1 }) : value
  return raw.replace('{v}', v)
}

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'pt-BR', label: 'PT' },
]

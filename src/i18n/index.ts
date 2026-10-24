import ptBR, { type I18nKey } from './pt-BR'
import en from './en'

export type Lang = 'pt-BR' | 'en'
export type { I18nKey }

const DICTS: Record<Lang, Record<I18nKey, string>> = { 'pt-BR': ptBR, en }

export function translate(lang: Lang, key: string, value?: number | string): string {
  const dict = DICTS[lang] ?? ptBR
  const raw = (dict as Record<string, string>)[key] ?? (ptBR as Record<string, string>)[key] ?? key
  if (value === undefined) return raw
  const v = typeof value === 'number' ? value.toLocaleString(lang, { maximumFractionDigits: 1 }) : value
  return raw.replace('{v}', v)
}

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'pt-BR', label: 'PT-BR' },
  { id: 'en', label: 'EN' },
]

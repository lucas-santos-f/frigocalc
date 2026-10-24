import type { TFn } from './hooks'

/** Nomes de produtos/cargas podem ser chaves i18n (modelos) ou texto livre do usuário. */
export function labelText(label: string | undefined, fallbackKey: string, t: TFn): string {
  if (!label) return t(fallbackKey)
  if (label.startsWith('prod.') || label.startsWith('direct.')) return t(label)
  return label
}

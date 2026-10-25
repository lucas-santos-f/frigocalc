import type { TFn } from './hooks'
import type { RefrigerantMeta } from './engine/refrigerants'

// Product and load names are either i18n keys (from templates) or free text typed by the user.
export function labelText(label: string | undefined, fallbackKey: string, t: TFn): string {
  if (!label) return t(fallbackKey)
  if (label.startsWith('prod.') || label.startsWith('direct.')) return t(label)
  return label
}

// Fluids with a common name (ammonia, propane...) get it in the UI language; the rest are just R-numbers.
export function fluidName(meta: RefrigerantMeta, t: TFn): string {
  const key = `fluid.${meta.id}`
  const name = t(key)
  return name === key ? meta.name : name
}

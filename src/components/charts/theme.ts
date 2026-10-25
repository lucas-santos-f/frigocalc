// Charts read the CSS custom properties so they follow the active theme and each app's brand colors.
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function chartColors(theme: 'light' | 'dark') {
  const dark = theme === 'dark'
  return {
    text: cssVar('--text', dark ? '#e6eaf0' : '#0f172a'),
    muted: cssVar('--muted', dark ? '#8b95a5' : '#64748b'),
    grid: cssVar('--border', dark ? '#232b38' : '#e6e8ec'),
    surface: cssVar('--surface', dark ? '#11161f' : '#ffffff'),
    primary: cssVar('--accent', '#2563eb'),
    accent: cssVar('--accent-2', '#06b6d4'),
  }
}

export const PALETTE = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#84cc16', '#f97316', '#64748b']

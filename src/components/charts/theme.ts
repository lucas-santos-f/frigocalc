// Cores dos gráficos por tema (fora dos componentes para o Fast Refresh).
export function chartColors(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? { text: '#e6edf7', muted: '#9fb0c5', grid: '#273449', surface: '#111a2b', primary: '#4f8df7', accent: '#38bdf8' }
    : { text: '#0f172a', muted: '#526071', grid: '#d6dee8', surface: '#ffffff', primary: '#0b3d91', accent: '#0ea5e9' }
}

export const PALETTE = ['#0b3d91', '#0ea5e9', '#15803d', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#b45309', '#6b7280']

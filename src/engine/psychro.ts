// Psicrometria do ar úmido — ASHRAE Handbook Fundamentals, cap. 1 (Hyland & Wexler).
// T em °C, P em kPa, W em kg_água/kg_ar_seco, h em kJ/kg_ar_seco, v em m³/kg_ar_seco.

export const P_ATM = 101.325

/** Pressão de saturação do vapor d'água (kPa) sobre água (T ≥ 0) ou gelo (T < 0). */
export function pws(tC: number): number {
  const T = tC + 273.15
  let lnP: number
  if (tC >= 0) {
    lnP =
      -5.8002206e3 / T +
      1.3914993 -
      4.8640239e-2 * T +
      4.1764768e-5 * T * T -
      1.4452093e-8 * T * T * T +
      6.5459673 * Math.log(T)
  } else {
    lnP =
      -5.6745359e3 / T +
      6.3925247 -
      9.677843e-3 * T +
      6.2215701e-7 * T * T +
      2.0747825e-9 * T * T * T -
      9.484024e-13 * T * T * T * T +
      4.1635019 * Math.log(T)
  }
  return Math.exp(lnP) / 1000
}

/** Umidade absoluta a partir da pressão parcial de vapor. */
export function wFromPw(pw: number, p = P_ATM): number {
  return (0.621945 * pw) / (p - pw)
}

/** Umidade absoluta a partir de T (°C) e UR (0–1). */
export function wFromRh(tC: number, rh: number, p = P_ATM): number {
  return wFromPw(Math.max(0, Math.min(1, rh)) * pws(tC), p)
}

export function pwFromW(w: number, p = P_ATM): number {
  return (p * w) / (0.621945 + w)
}

export function rhFromW(tC: number, w: number, p = P_ATM): number {
  return Math.max(0, Math.min(1, pwFromW(w, p) / pws(tC)))
}

/** Entalpia específica do ar úmido (kJ/kg_ar_seco). */
export function enthalpy(tC: number, w: number): number {
  return 1.006 * tC + w * (2501 + 1.86 * tC)
}

/** Volume específico (m³/kg_ar_seco). */
export function specificVolume(tC: number, w: number, p = P_ATM): number {
  return (0.287042 * (tC + 273.15) * (1 + 1.607858 * w)) / p
}

/** Densidade do ar úmido (kg/m³ de mistura). */
export function density(tC: number, w: number, p = P_ATM): number {
  return (1 + w) / specificVolume(tC, w, p)
}

/** Ponto de orvalho (°C) a partir de W. */
export function dewPoint(w: number, p = P_ATM): number {
  const pw = Math.max(pwFromW(w, p), 1e-6)
  const a = Math.log(pw)
  const td = 6.54 + 14.526 * a + 0.7389 * a * a + 0.09486 * a * a * a + 0.4569 * Math.pow(pw, 0.1984)
  if (td >= 0) return td
  return 6.09 + 12.608 * a + 0.4959 * a * a
}

/** Umidade absoluta de saturação a uma dada temperatura. */
export function wSat(tC: number, p = P_ATM): number {
  return wFromPw(pws(tC), p)
}

/** Temperatura de bulbo úmido (°C) por bissecção na equação psicrométrica (ASHRAE eq. 35/37). */
export function wetBulb(tC: number, w: number, p = P_ATM): number {
  const f = (twb: number) => {
    const ws = wSat(twb, p)
    const wCalc =
      twb >= 0
        ? ((2501 - 2.326 * twb) * ws - 1.006 * (tC - twb)) / (2501 + 1.86 * tC - 4.186 * twb)
        : ((2830 - 0.24 * twb) * ws - 1.006 * (tC - twb)) / (2830 + 1.86 * tC - 2.1 * twb)
    return wCalc - w
  }
  let lo = Math.min(tC, dewPoint(w, p)) - 1
  let hi = tC
  if (f(hi) < 0) return tC
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi)
    if (f(mid) > 0) hi = mid
    else lo = mid
  }
  return 0.5 * (lo + hi)
}

/** Umidade absoluta a partir de T e bulbo úmido. */
export function wFromWetBulb(tC: number, twb: number, p = P_ATM): number {
  const ws = wSat(twb, p)
  return twb >= 0
    ? ((2501 - 2.326 * twb) * ws - 1.006 * (tC - twb)) / (2501 + 1.86 * tC - 4.186 * twb)
    : ((2830 - 0.24 * twb) * ws - 1.006 * (tC - twb)) / (2830 + 1.86 * tC - 2.1 * twb)
}

export interface MoistAir {
  T: number // °C
  W: number
  RH: number // 0–1
  h: number
  v: number
  rho: number
  Tdp: number
  Twb: number
  pw: number
  P: number
}

/** Estado completo do ar úmido a partir de T e (UR | W | Twb). */
export function moistAir(tC: number, opts: { rh?: number; w?: number; twb?: number }, p = P_ATM): MoistAir {
  let w: number
  if (opts.w !== undefined) w = Math.max(0, opts.w)
  else if (opts.twb !== undefined) w = Math.max(0, wFromWetBulb(tC, opts.twb, p))
  else w = wFromRh(tC, opts.rh ?? 0.5, p)
  const wmax = wSat(tC, p)
  if (w > wmax) w = wmax
  return {
    T: tC,
    W: w,
    RH: rhFromW(tC, w, p),
    h: enthalpy(tC, w),
    v: specificVolume(tC, w, p),
    rho: density(tC, w, p),
    Tdp: dewPoint(w, p),
    Twb: wetBulb(tC, w, p),
    pw: pwFromW(w, p),
    P: p,
  }
}

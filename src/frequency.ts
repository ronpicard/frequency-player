import { frequencyToMidi, midiToFrequency } from './audio/notes'

export const MIN_HZ = 20
export const MAX_HZ = 20000
export const SLIDER_STEPS = 10000

export function clampHz(hz: number): number {
  if (!Number.isFinite(hz)) return 440
  return Math.min(MAX_HZ, Math.max(MIN_HZ, hz))
}

/** Hearing is logarithmic, so the slider is too: equal travel = equal musical interval. */
export function sliderToHz(position: number): number {
  const t = Math.min(1, Math.max(0, position / SLIDER_STEPS))
  return MIN_HZ * (MAX_HZ / MIN_HZ) ** t
}

export function hzToSlider(hz: number): number {
  return (Math.log(clampHz(hz) / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ)) * SLIDER_STEPS
}

export function shiftSemitones(hz: number, semitones: number): number {
  return clampHz(hz * 2 ** (semitones / 12))
}

export function snapToNote(hz: number, a4: number): number {
  return clampHz(midiToFrequency(Math.round(frequencyToMidi(hz, a4)), a4))
}

/** Two decimals under 1 kHz, one under 10 kHz, whole hertz above. */
export function formatHz(hz: number): string {
  if (hz < 1000) return hz.toFixed(2)
  if (hz < 10000) return hz.toFixed(1)
  return hz.toFixed(0)
}

/** Round to the precision `formatHz` shows so steps land on clean numbers. */
export function roundHz(hz: number): number {
  return Math.round(hz * 100) / 100
}

export function parseHz(text: string): number | null {
  const cleaned = text.trim().toLowerCase().replace(/,/g, '').replace(/\s*hz$/, '')
  const khz = /^([\d.]+)\s*k$/.exec(cleaned)
  const value = khz ? Number(khz[1]) * 1000 : Number(cleaned)
  if (!cleaned || !Number.isFinite(value) || value < MIN_HZ || value > MAX_HZ) return null
  return value
}

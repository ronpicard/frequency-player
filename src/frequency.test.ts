import { describe, expect, it } from 'vitest'
import { clampHz, formatHz, hzToSlider, MAX_HZ, MIN_HZ, parseHz, roundHz, shiftSemitones, SLIDER_STEPS, sliderToHz, snapToNote } from './frequency'

describe('frequency helpers', () => {
  it('clamps to the audible range', () => {
    expect(clampHz(5)).toBe(MIN_HZ)
    expect(clampHz(50000)).toBe(MAX_HZ)
    expect(clampHz(Number.NaN)).toBe(440)
  })

  it('maps the slider logarithmically and back', () => {
    expect(sliderToHz(0)).toBeCloseTo(MIN_HZ)
    expect(sliderToHz(SLIDER_STEPS)).toBeCloseTo(MAX_HZ)
    expect(sliderToHz(SLIDER_STEPS / 2)).toBeCloseTo(Math.sqrt(MIN_HZ * MAX_HZ))
    for (const hz of [20, 100, 440, 1234, 20000]) expect(sliderToHz(hzToSlider(hz))).toBeCloseTo(hz, 6)
    expect(sliderToHz(-10)).toBeCloseTo(MIN_HZ)
  })

  it('shifts by semitones and octaves', () => {
    expect(shiftSemitones(440, 12)).toBeCloseTo(880)
    expect(shiftSemitones(440, -12)).toBeCloseTo(220)
    expect(shiftSemitones(440, 1)).toBeCloseTo(466.16, 2)
    expect(shiftSemitones(15000, 12)).toBe(MAX_HZ)
  })

  it('snaps to the nearest note for the chosen A4', () => {
    expect(snapToNote(445, 440)).toBe(440)
    expect(snapToNote(265, 440)).toBeCloseTo(261.63, 2)
    expect(snapToNote(430, 432)).toBe(432)
  })

  it('formats and rounds', () => {
    expect(formatHz(440)).toBe('440.00')
    expect(formatHz(1234.56)).toBe('1234.6')
    expect(formatHz(15000.4)).toBe('15000')
    expect(roundHz(440.123)).toBe(440.12)
  })

  it('parses typed frequencies', () => {
    expect(parseHz('440')).toBe(440)
    expect(parseHz(' 1,000 Hz ')).toBe(1000)
    expect(parseHz('2.5k')).toBe(2500)
    expect(parseHz('10')).toBeNull()
    expect(parseHz('abc')).toBeNull()
    expect(parseHz('')).toBeNull()
  })
})

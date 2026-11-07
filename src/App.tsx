import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clampA4, midiToFrequency, readNote } from './audio/notes'
import { ToneVoice, type Waveform } from './audio/tone'
import { Piano } from './components/Piano'
import { SuiteNav } from './components/SuiteNav'
import { RepeatButton } from './components/RepeatButton'
import { Ruler } from './components/Ruler'
import { clampHz, formatHz, hzToSlider, parseHz, roundHz, shiftSemitones, SLIDER_STEPS, sliderToHz, snapToNote } from './frequency'
import { load, save } from './storage'

const WAVEFORMS: { id: Waveform; label: string; path: string }[] = [
  { id: 'sine', label: 'Sine', path: 'M2 12 C 6 2, 10 2, 14 12 S 22 22, 26 12' },
  { id: 'triangle', label: 'Triangle', path: 'M2 12 L 8 3 L 20 21 L 26 12' },
  { id: 'square', label: 'Square', path: 'M2 12 V 4 H 14 V 20 H 26 V 12' },
  { id: 'sawtooth', label: 'Sawtooth', path: 'M2 20 L 14 4 V 20 L 26 4 V 12' },
]

const PRESETS = [
  { hz: 60, label: '60 Hz hum' },
  { hz: 261.63, label: 'Middle C' },
  { hz: 432, label: '432 Hz' },
  { hz: 440, label: 'A440' },
  { hz: 1000, label: '1 kHz' },
  { hz: 10000, label: '10 kHz' },
]

function loadWaveform(): Waveform {
  const saved = load('fp.wave')
  return WAVEFORMS.some((w) => w.id === saved) ? (saved as Waveform) : 'sine'
}

export function App() {
  const [hz, setHzState] = useState(() => clampHz(Number(load('fp.hz') ?? 440)))
  const [a4, setA4] = useState(() => clampA4(Number(load('fp.a4') ?? 440)))
  const [waveform, setWaveform] = useState<Waveform>(loadWaveform)
  const [volume, setVolume] = useState(() => {
    const v = Number(load('fp.volume') ?? 0.5)
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5
  })
  const [snap, setSnap] = useState(() => load('fp.snap') === '1')
  const [playing, setPlaying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const voice = useMemo(() => new ToneVoice(), [])
  const playingRef = useRef(playing)
  playingRef.current = playing

  const setHz = useCallback((next: number) => setHzState(clampHz(next)), [])

  useEffect(() => voice.setFrequency(hz), [voice, hz])
  useEffect(() => voice.setVolume(volume), [voice, volume])
  useEffect(() => voice.setWaveform(waveform), [voice, waveform])
  useEffect(() => () => voice.stop(), [voice])

  // Persist after the value settles rather than on every drag frame.
  useEffect(() => {
    const t = window.setTimeout(() => {
      save('fp.hz', String(hz))
      save('fp.a4', String(a4))
      save('fp.wave', waveform)
      save('fp.volume', String(volume))
      save('fp.snap', snap ? '1' : '0')
    }, 300)
    return () => window.clearTimeout(t)
  }, [hz, a4, waveform, volume, snap])

  const toggle = useCallback(() => {
    if (playingRef.current) {
      voice.stop()
      setPlaying(false)
    } else {
      void voice.start()
      setPlaying(true)
    }
  }, [voice])

  const pressKey = (midi: number) => {
    const target = midiToFrequency(midi, a4)
    setHz(target)
    if (!playingRef.current) void voice.pluck(target, 1.2)
  }

  const step = (fn: (h: number) => number) => setHzState((h) => clampHz(fn(h)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, select, textarea, [role="slider"]')) return
      if (e.key === ' ') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const dir = e.key === 'ArrowUp' ? 1 : -1
        step((h) => (e.shiftKey ? shiftSemitones(h, 12 * dir) : shiftSemitones(h, dir)))
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const dir = e.key === 'ArrowRight' ? 1 : -1
        step((h) => roundHz(h + (e.shiftKey ? 0.1 : 1) * dir))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  const note = readNote(hz, a4)!
  const cents = Math.round(note.cents)

  const commitDraft = () => {
    const parsed = parseHz(draft)
    if (parsed !== null) setHz(parsed)
    setEditing(false)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">
          <span className="brand__mark" aria-hidden="true">∿</span> Frequency Player
        </h1>
        <SuiteNav current="frequency-player" />
        <label className="select">
          <span className="visually-hidden">Reference pitch</span>
          <select value={a4} onChange={(e) => setA4(clampA4(Number(e.target.value)))}>
            {[415, 432, 435, 440, 442, 444].map((v) => (
              <option key={v} value={v}>
                A4 = {v} Hz
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="layout">
        <div className="layout__primary">
        <section className={`hero ${playing ? 'hero--playing' : ''}`}>
          <div className="hero__note">
            <span className="hero__label">
              {note.name}
              <sub>{note.octave}</sub>
            </span>
            <span className={`hero__cents ${cents === 0 ? 'hero__cents--zero' : ''}`}>
              {cents === 0 ? 'on pitch' : `${cents > 0 ? '+' : ''}${cents} ¢`}
            </span>
            <button type="button" className="chip" onClick={() => setHz(snapToNote(hz, a4))} disabled={Math.abs(note.cents) < 0.005}>
              Snap to {note.label}
            </button>
          </div>
          {editing ? (
            // Not a <form>: sandboxed embeds without allow-forms would swallow Enter.
            <div className="hero__edit">
              <input
                autoFocus
                inputMode="decimal"
                enterKeyHint="done"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitDraft()
                  else if (e.key === 'Escape') setEditing(false)
                }}
                aria-label="Frequency in hertz"
                aria-invalid={parseHz(draft) === null}
              />
              <span>Hz</span>
            </div>
          ) : (
            <button
              type="button"
              className="hero__hz"
              onClick={() => {
                setDraft(formatHz(hz))
                setEditing(true)
              }}
              aria-label={`${formatHz(hz)} hertz. Tap to type a frequency`}
            >
              {formatHz(hz)}
              <span>Hz</span>
            </button>
          )}
          <Ruler hz={hz} a4={a4} snap={snap} onChange={setHz} />
          <p className="hint">Drag the dial · tap the number to type · tap a key to jump</p>
        </section>

        <section className="steps" aria-label="Fine tuning">
          <RepeatButton label="Down one octave" onStep={() => step((h) => h / 2)}>
            ÷2
          </RepeatButton>
          <RepeatButton label="Down one semitone" onStep={() => step((h) => shiftSemitones(h, -1))}>
            −½
          </RepeatButton>
          <RepeatButton label="Down 1 hertz" onStep={() => step((h) => roundHz(h - 1))}>
            −1
          </RepeatButton>
          <RepeatButton label="Down 0.1 hertz" onStep={() => step((h) => roundHz(h - 0.1))}>
            −.1
          </RepeatButton>
          <RepeatButton label="Up 0.1 hertz" onStep={() => step((h) => roundHz(h + 0.1))}>
            +.1
          </RepeatButton>
          <RepeatButton label="Up 1 hertz" onStep={() => step((h) => roundHz(h + 1))}>
            +1
          </RepeatButton>
          <RepeatButton label="Up one semitone" onStep={() => step((h) => shiftSemitones(h, 1))}>
            +½
          </RepeatButton>
          <RepeatButton label="Up one octave" onStep={() => step((h) => h * 2)}>
            ×2
          </RepeatButton>
        </section>

        <section className="sweep" aria-label="Frequency range">
          <input
            type="range"
            min={0}
            max={SLIDER_STEPS}
            step={1}
            value={hzToSlider(hz)}
            onChange={(e) => setHz(roundHz(sliderToHz(Number(e.target.value))))}
            aria-label="Frequency, 20 hertz to 20 kilohertz"
            aria-valuetext={`${formatHz(hz)} hertz`}
          />
          <div className="sweep__scale" aria-hidden="true">
            {[20, 100, 1000, 10000, 20000].map((v) => (
              <span key={v} style={{ left: `${(hzToSlider(v) / SLIDER_STEPS) * 100}%` }}>
                {v >= 1000 ? `${v / 1000}k` : v}
              </span>
            ))}
          </div>
        </section>
        </div>

        <div className="transport">
          <button type="button" className={`playbtn ${playing ? 'playbtn--on' : ''}`} onClick={toggle} aria-pressed={playing}>
            <span aria-hidden="true">{playing ? '■' : '▶'}</span>
            {playing ? 'Stop' : 'Play'}
          </button>
          <div className="controls">
            <div className="waves" role="radiogroup" aria-label="Waveform">
              {WAVEFORMS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  role="radio"
                  aria-checked={waveform === w.id}
                  aria-label={w.label}
                  title={w.label}
                  className={`wave ${waveform === w.id ? 'wave--on' : ''}`}
                  onClick={() => setWaveform(w.id)}
                >
                  <svg viewBox="0 0 28 24" aria-hidden="true">
                    <path d={w.path} />
                  </svg>
                  <span className="wave__label">{w.label}</span>
                </button>
              ))}
            </div>
            <label className="volume">
              <span aria-hidden="true">🔈</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
              />
              <output>{Math.round(volume * 100)}%</output>
            </label>
          </div>
        </div>

        <section className="keyboard" aria-label="Notes">
          <div className="keyboard__head">
            <h2>Notes</h2>
            <label className="toggle">
              <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
              <span>Snap dial to notes</span>
            </label>
          </div>
          <Piano active={Math.abs(note.cents) <= 50 ? note.midi : null} a4={a4} onPress={pressKey} />
        </section>

        <section className="presets" aria-label="Presets">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className={`chip ${Math.abs(hz - p.hz) < 0.005 ? 'chip--on' : ''}`} onClick={() => setHz(p.hz)}>
              {p.label}
            </button>
          ))}
        </section>
      </main>

      <footer className="footer">
        Start quietly: high frequencies and loud volumes can damage hearing and speakers. Keyboard: Space plays, ↑/↓ semitone, ←/→ 1 Hz.{' '}
        <a href="https://github.com/ronpicard/frequency-player" target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </footer>
    </div>
  )
}

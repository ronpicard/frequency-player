import { useEffect, useRef, useState } from 'react'
import { frequencyToMidi, midiToFrequency, noteFromMidi } from '../audio/notes'
import { clampHz } from '../frequency'

const PX_PER_SEMITONE = 56
// Fastest flick, in semitones per millisecond; a hard flick glides about an octave.
const MAX_FLING = 0.045

type Props = {
  hz: number
  a4: number
  snap: boolean
  onChange: (hz: number) => void
}

/**
 * A tape of note names you drag like a tuning dial. Dragging left raises the
 * pitch, a flick keeps it gliding, and with snap on it settles on a note.
 */
export function Ruler({ hz, a4, snap, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const drag = useRef<{ x: number; midi: number; lastX: number; lastT: number; velocity: number } | null>(null)
  const anim = useRef(0)
  const hzRef = useRef(hz)
  hzRef.current = hz
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => cancelAnimationFrame(anim.current), [])

  const midi = frequencyToMidi(hz, a4)
  const setMidi = (m: number) => onChangeRef.current(clampHz(midiToFrequency(m, a4)))

  const glide = (velocity: number) => {
    // velocity is semitones per millisecond; friction brings it to rest.
    let v = velocity
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(32, now - last)
      last = now
      v *= 0.94 ** (dt / 16)
      const current = frequencyToMidi(hzRef.current, a4)
      if (Math.abs(v) < 0.0008) {
        if (snap) settle(current)
        return
      }
      setMidi(current + v * dt)
      anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }

  const settle = (from: number) => {
    const to = Math.round(from)
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 160)
      setMidi(from + (to - from) * (1 - (1 - t) ** 3))
      if (t < 1) anim.current = requestAnimationFrame(step)
    }
    anim.current = requestAnimationFrame(step)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(anim.current)
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, midi, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.velocity = 0.6 * d.velocity + 0.4 * (-(e.clientX - d.lastX) / PX_PER_SEMITONE / dt)
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    setMidi(d.midi - (e.clientX - d.x) / PX_PER_SEMITONE)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const recent = e.timeStamp - d.lastT < 80
    if (recent && Math.abs(d.velocity) > 0.002) glide(Math.max(-MAX_FLING, Math.min(MAX_FLING, d.velocity)))
    else if (snap) settle(frequencyToMidi(hzRef.current, a4))
  }

  const onWheel = (e: React.WheelEvent) => {
    cancelAnimationFrame(anim.current)
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    setMidi(midi + delta / PX_PER_SEMITONE / 4)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.01 : 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setMidi(snap && !e.shiftKey ? Math.round(midi) + 1 : midi + step)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setMidi(snap && !e.shiftKey ? Math.round(midi) - 1 : midi - step)
    else return
    e.preventDefault()
  }

  const half = width / 2 / PX_PER_SEMITONE + 1
  const ticks: number[] = []
  for (let q = Math.floor((midi - half) * 4); q <= Math.ceil((midi + half) * 4); q++) ticks.push(q / 4)

  return (
    <div
      ref={ref}
      className="ruler"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Tuning dial: drag or use arrow keys"
      aria-valuemin={20}
      aria-valuemax={20000}
      aria-valuenow={Math.round(hz * 100) / 100}
      aria-valuetext={`${hz.toFixed(2)} hertz, ${noteFromMidi(Math.round(midi), a4).label}`}
    >
      {ticks.map((t) => {
        const x = width / 2 + (t - midi) * PX_PER_SEMITONE
        const whole = Number.isInteger(t)
        const note = whole ? noteFromMidi(t, a4) : null
        return (
          <div key={t} className={`ruler__tick ${whole ? 'ruler__tick--note' : ''} ${note && note.name.length > 1 ? 'ruler__tick--sharp' : ''}`} style={{ transform: `translateX(${x}px)` }}>
            {note ? <span>{note.label}</span> : null}
          </div>
        )
      })}
      <div className="ruler__cursor" aria-hidden="true" />
    </div>
  )
}

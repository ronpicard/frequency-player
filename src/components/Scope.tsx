import { useEffect, useRef } from 'react'
import type { Waveform } from '../audio/tone'

const W = 600
const H = 80
const POINTS = 240

function shape(waveform: Waveform, x: number): number {
  const s = Math.sin(2 * Math.PI * x)
  if (waveform === 'square') return Math.sign(s) || 1
  if (waveform === 'triangle') return (2 / Math.PI) * Math.asin(s)
  if (waveform === 'sawtooth') return 2 * (x - Math.floor(x + 0.5))
  return s
}

/**
 * A stylised oscilloscope: the current wave shape, with more cycles on screen
 * the higher the pitch. It scrolls while the tone plays and rests when it stops.
 */
export function Scope({ hz, waveform, playing }: { hz: number; waveform: Waveform; playing: boolean }) {
  const pathRef = useRef<SVGPathElement>(null)
  const props = useRef({ hz, waveform, playing })
  props.current = { hz, waveform, playing }

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let phase = 0
    let last = performance.now()
    let amp = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const { hz, waveform, playing } = props.current
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      // Visible cycles grow with each octave; real cycles would be a blur.
      const cycles = Math.min(16, Math.max(1.5, 1.5 + 1.25 * Math.log2(hz / 40)))
      if (playing && !reduced) phase += dt * 0.8
      amp += ((playing ? 1 : 0.28) - amp) * Math.min(1, dt * 10)
      let d = ''
      for (let i = 0; i <= POINTS; i++) {
        const t = i / POINTS
        const y = H / 2 - shape(waveform, t * cycles + phase) * amp * (H / 2 - 6)
        d += `${i ? 'L' : 'M'}${(t * W).toFixed(1)} ${y.toFixed(1)}`
      }
      pathRef.current?.setAttribute('d', d)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg className={`scope ${playing ? 'scope--on' : ''}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="scope-ink" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-2)' }} />
        </linearGradient>
      </defs>
      <line className="scope__axis" x1="0" x2={W} y1={H / 2} y2={H / 2} />
      <path ref={pathRef} className="scope__wave" stroke="url(#scope-ink)" />
    </svg>
  )
}

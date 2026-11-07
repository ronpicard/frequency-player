import { useEffect, useRef } from 'react'
import { isBlackKey, noteFromMidi } from '../audio/notes'

const LOW = 21 // A0
const HIGH = 108 // C8
const WHITE_W = 40

const keys = Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i)
const whites = keys.filter((m) => !isBlackKey(m))

function whiteIndex(midi: number): number {
  return whites.findIndex((m) => m >= midi)
}

function reveal(el: HTMLElement, midi: number | null, behavior: ScrollBehavior) {
  if (midi === null) return
  const x = whiteIndex(midi) * WHITE_W
  const outOfView = () => x < el.scrollLeft + WHITE_W || x > el.scrollLeft + el.clientWidth - 2 * WHITE_W
  if (!outOfView()) return
  const left = x - el.clientWidth / 2 + WHITE_W / 2
  el.scrollTo({ left, behavior })
  // Some browsers skip smooth scrolling (reduced motion, background tabs); make sure we land.
  if (behavior === 'smooth') window.setTimeout(() => outOfView() && el.scrollTo({ left, behavior: 'instant' }), 700)
}

/** An 88-key piano that scrolls sideways and follows the current note. */
export function Piano({ active, a4, onPress }: { active: number | null; a4: number; onPress: (midi: number) => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  // Jump straight to the note on load and on resize; glide when it changes.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const observer = new ResizeObserver(() => reveal(el, activeRef.current, 'instant'))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (scroller.current) reveal(scroller.current, active, 'smooth')
  }, [active])

  return (
    <div className="piano" ref={scroller}>
      <div className="piano__keys" style={{ width: whites.length * WHITE_W }} role="group" aria-label="Piano keys">
        {keys.map((midi) => {
          const note = noteFromMidi(midi, a4)
          const black = isBlackKey(midi)
          const left = black ? whiteIndex(midi) * WHITE_W - WHITE_W * 0.3 : whiteIndex(midi) * WHITE_W
          return (
            <button
              key={midi}
              type="button"
              className={`pkey ${black ? 'pkey--black' : 'pkey--white'} ${midi === active ? 'pkey--on' : ''}`}
              style={{ left, width: black ? WHITE_W * 0.6 : WHITE_W }}
              onClick={() => onPress(midi)}
              aria-label={`${note.label}, ${note.frequency.toFixed(2)} hertz`}
              aria-pressed={midi === active}
            >
              {!black ? <span className={note.name === 'C' ? 'pkey__c' : ''}>{note.label}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

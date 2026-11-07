import { useEffect, useRef, type ReactNode } from 'react'

/** Fires once on press, then repeats while held, like a hardware stepper. */
export function RepeatButton({ onStep, label, children }: { onStep: () => void; label: string; children: ReactNode }) {
  const timer = useRef<number | null>(null)
  const stepRef = useRef(onStep)
  stepRef.current = onStep

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => stop, [])

  const start = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    stepRef.current()
    let delay = 380
    const tick = () => {
      stepRef.current()
      delay = Math.max(40, delay * 0.8)
      timer.current = window.setTimeout(tick, delay)
    }
    timer.current = window.setTimeout(tick, delay)
  }

  return (
    <button
      type="button"
      className="step"
      aria-label={label}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          stepRef.current()
        }
      }}
    >
      {children}
    </button>
  )
}

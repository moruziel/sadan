// useSimulation.js — מנוע הסימולציה
// מנהל שלבים, play/pause, auto-advance
// הזזת מרקרים נעשית דרך CSS transition (setLngLat + transition: transform)
import { useState, useRef, useEffect, useCallback } from 'react'
import { SIM_PHASES } from '../data/simulationData'

const TOTAL = SIM_PHASES.length

export default function useSimulation() {
  const [phase,   setPhase]   = useState(0)
  const [playing, setPlaying] = useState(false)
  const holdTimer = useRef(null)

  // ── clear any pending hold timer ──────────────────────────
  function clearHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
  }

  // ── advance to next phase ─────────────────────────────────
  const nextPhase = useCallback(() => {
    setPhase(prev => {
      if (prev >= TOTAL - 1) { setPlaying(false); return prev }
      return prev + 1
    })
  }, [])

  const prevPhase = useCallback(() => {
    clearHold()
    setPlaying(false)
    setPhase(prev => Math.max(0, prev - 1))
  }, [])

  const gotoPhase = useCallback((n) => {
    clearHold()
    setPhase(Math.max(0, Math.min(n, TOTAL - 1)))
  }, [])

  const play = useCallback(() => {
    if (phase >= TOTAL - 1) setPhase(0)   // restart from beginning
    setPlaying(true)
  }, [phase])

  const pause = useCallback(() => {
    clearHold()
    setPlaying(false)
  }, [])

  const togglePlay = useCallback(() => {
    if (playing) pause(); else play()
  }, [playing, play, pause])

  // ── auto-advance while playing ────────────────────────────
  useEffect(() => {
    if (!playing) return
    if (phase >= TOTAL - 1) { setPlaying(false); return }

    const hold = SIM_PHASES[phase].holdMs
    holdTimer.current = setTimeout(() => {
      nextPhase()
    }, hold)

    return clearHold
  }, [playing, phase, nextPhase])

  // ── listen for SADAN sim tool events ──────────────────────
  useEffect(() => {
    const onPause   = ()    => pause()
    const onResume  = ()    => play()
    const onGoto    = (e)   => gotoPhase(Number(e.detail?.phase ?? 0))

    window.addEventListener('sadan:sim_pause',      onPause)
    window.addEventListener('sadan:sim_resume',     onResume)
    window.addEventListener('sadan:sim_goto_phase', onGoto)

    return () => {
      window.removeEventListener('sadan:sim_pause',      onPause)
      window.removeEventListener('sadan:sim_resume',     onResume)
      window.removeEventListener('sadan:sim_goto_phase', onGoto)
    }
  }, [pause, play, gotoPhase])

  return {
    phase,
    playing,
    total: TOTAL,
    currentData: SIM_PHASES[phase],
    isFirst: phase === 0,
    isLast:  phase === TOTAL - 1,
    play,
    pause,
    togglePlay,
    nextPhase,
    prevPhase,
    gotoPhase,
  }
}

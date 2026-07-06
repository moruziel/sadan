/**
 * VoiceStatusOrb — floating voice status indicator, top-right corner.
 *
 * 3 CSS-only states (no canvas):
 *   idle      → 3 breathing blue dots (voice not connected)
 *   listening → 5 green waveform bars (connected, waiting for speech)
 *   speaking  → gold ring slow pulse   (Gemini is speaking)
 *
 * Click → opens SadanChat transcript panel.
 * Listens to `sadan:voice_state` events dispatched by SadanChat.
 */
import { useState, useEffect } from 'react'

const KEYFRAMES = `
  @keyframes orbBreath {
    0%, 100% { transform: scale(0.75); opacity: 0.35; }
    50%       { transform: scale(1.15); opacity: 0.9;  }
  }
  @keyframes orbBar1 { 0%,100%{height:4px}  40%{height:20px} }
  @keyframes orbBar2 { 0%,100%{height:10px} 40%{height:26px} }
  @keyframes orbBar3 { 0%,100%{height:16px} 40%{height:10px} }
  @keyframes orbBar4 { 0%,100%{height:6px}  40%{height:22px} }
  @keyframes orbBar5 { 0%,100%{height:8px}  40%{height:18px} }
  @keyframes orbRingPulse {
    0%        { box-shadow: 0 0 0 0   rgba(198,149,59,0.65); }
    70%       { box-shadow: 0 0 0 12px rgba(198,149,59,0);   }
    100%      { box-shadow: 0 0 0 0   rgba(198,149,59,0);    }
  }
`

const BAR_DURATIONS = ['0.55s', '0.70s', '0.60s', '0.75s', '0.65s']
const BAR_DELAYS    = ['0s', '0.1s', '0.05s', '0.2s', '0.15s']
const ANIM_NAMES    = ['orbBar1','orbBar2','orbBar3','orbBar4','orbBar5']

export default function VoiceStatusOrb({ visible = true }) {
  const [voiceState, setVoiceState] = useState('idle') // 'idle' | 'listening' | 'speaking'

  useEffect(() => {
    function onVoiceState(e) {
      const { connected, speaking } = e.detail ?? {}
      if (!connected) setVoiceState('idle')
      else if (speaking) setVoiceState('speaking')
      else setVoiceState('listening')
    }
    window.addEventListener('sadan:voice_state', onVoiceState)
    return () => window.removeEventListener('sadan:voice_state', onVoiceState)
  }, [])

  if (!visible) return null

  const isConnected = voiceState !== 'idle'

  function handleClick() {
    // Toggle voice: connect (+ open panel) when idle, disconnect when active
    window.dispatchEvent(new CustomEvent('sadanVoiceToggle'))
  }

  // ── orb base style ─────────────────────────────────────────
  const baseStyle = {
    position:       'fixed',
    top:            '14px',
    right:          '14px',
    zIndex:         45,
    width:          '42px',
    height:         '42px',
    borderRadius:   '50%',
    border:         '1px solid transparent',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    transition:     'background 0.4s ease, border-color 0.4s ease',
  }

  const stateStyle = voiceState === 'idle'
    ? { background: 'rgba(59,130,246,0.10)', borderColor: 'rgba(59,130,246,0.25)' }
    : voiceState === 'listening'
    ? { background: 'rgba(34,197,94,0.10)',  borderColor: 'rgba(34,197,94,0.30)'  }
    : {
        background:  'rgba(198,149,59,0.14)',
        borderColor: 'rgba(198,149,59,0.45)',
        animation:   'orbRingPulse 1.8s ease-out infinite',
      }

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Mobile: orb sits inside the header strip (Header/ProgressBar reserve
          pr-14/16 for it) with no label. Desktop: orb + state label below. */}
      <div className="fixed top-1 md:top-2.5 right-3 z-[45] flex flex-col items-center gap-1">

      <button
        onClick={handleClick}
        style={{ ...baseStyle, ...stateStyle, position: 'relative', top: 'auto', right: 'auto', zIndex: 'auto' }}
        title={isConnected ? 'פתח את פאנל סדן' : 'פתח שיחה עם סדן'}
      >
        {/* ── idle: 3 breathing blue dots ── */}
        {voiceState === 'idle' && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[0, 0.35, 0.7].map((delay, i) => (
              <div key={i} style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#3b82f6',
                animation: `orbBreath 2.2s ${delay}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        )}

        {/* ── listening: 5 green waveform bars ── */}
        {voiceState === 'listening' && (
          <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '28px', paddingBottom: '2px' }}>
            {ANIM_NAMES.map((name, i) => (
              <div key={i} style={{
                width: '3px',
                height: '8px',
                background: '#22c55e',
                borderRadius: '2px',
                animation: `${name} ${BAR_DURATIONS[i]} ${BAR_DELAYS[i]} ease-in-out infinite`,
              }} />
            ))}
          </div>
        )}

        {/* ── speaking: gold filled circle ── */}
        {voiceState === 'speaking' && (
          <div style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'radial-gradient(circle, #c6953b 30%, #b5842a 100%)',
          }} />
        )}
      </button>

      {/* Label below the orb — real mic state so the user knows when SADAN
          actually hears them ('speaking' covers the post-speech mute window) */}
      <span className="hidden md:inline" style={{
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '0.04em',
        color: isConnected ? (voiceState === 'speaking' ? '#c6953b' : '#22c55e') : 'rgba(156,163,175,0.8)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        {voiceState === 'speaking' ? 'סדן מדבר' : voiceState === 'listening' ? '🎙️ מקשיב' : 'סדן'}
      </span>

      </div>
    </>
  )
}

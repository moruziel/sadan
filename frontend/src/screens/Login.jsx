import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ChevronLeft, Loader2 } from 'lucide-react'

const VALID_CODE = '5236521'

// ── gold waveform bars (CSS animation, no <style> tag) ─────
const WAVE_H = [0.4, 0.75, 1, 0.85, 0.6, 0.9, 0.5, 0.8, 0.45]
function VoiceWaveform() {
  return (
    <div className="flex items-end justify-center gap-0.5" style={{ height: 32, width: 40 }}>
      {WAVE_H.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            height: Math.round(h * 28),
            background: '#c6953b',
            animation: `sadanWave 0.65s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

// ── manual login form ──────────────────────────────────────
function ManualLoginForm({ onBack }) {
  const navigate  = useNavigate()
  const [code, setCode]       = useState('')
  const [error, setError]     = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e?.preventDefault()
    if (code === VALID_CODE) {
      setLoading(true)
      setTimeout(() => navigate('/field-selection'), 800)
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="w-full max-w-sm px-6 flex flex-col items-center gap-8">
      {/* logo small */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#c6953b,#b5842a)', boxShadow: '0 0 24px rgba(198,149,59,0.4)' }}>
          <span className="text-3xl font-black text-black">ס</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest">SADAN</h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#111827', border: '1px solid #374151' }}>
        <div>
          <label className="text-gray-400 text-sm font-medium block mb-2">מספר אישי</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="הכנס מספר אישי"
            maxLength={10}
            autoFocus
            dir="ltr"
            className={`w-full rounded-xl px-4 py-3 text-white text-lg font-bold text-center
              tracking-widest outline-none transition-all
              ${error ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-yellow-500'}`}
            style={{ background: '#1f2937', border: error ? '1px solid #ef4444' : '1px solid #374151' }}
          />
          {error && <p className="text-red-400 text-xs text-center mt-2 font-medium">מספר אישי שגוי</p>}
        </div>

        <button
          type="submit"
          disabled={!code || loading}
          className="w-full py-3 rounded-xl font-bold text-base text-black transition-opacity disabled:opacity-40"
          style={{ background: 'linear-gradient(to right,#c6953b,#eab308)' }}
        >
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />מתחבר...
              </span>
            : 'כניסה למערכת'}
        </button>
      </form>

      <button onClick={onBack}
        className="text-yellow-600 text-sm hover:text-yellow-400 transition-colors flex items-center gap-1">
        <ChevronLeft size={14} className="rotate-180" />
        חזרה לכניסה קולית
      </button>
    </div>
  )
}

// ── main ───────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('voice')  // voice | connecting | listening | manual
  const [code, setCode] = useState('')
  const codeRef = useRef(code)
  const modeRef = useRef(mode)

  useEffect(() => { codeRef.current = code  }, [code])
  useEffect(() => { modeRef.current = mode  }, [mode])

  function doLogin(val) {
    if (val === VALID_CODE) {
      setMode('connecting')
      setTimeout(() => navigate('/field-selection'), 900)
    }
  }

  function handleMicClick() {
    setMode('connecting')
    window.dispatchEvent(new CustomEvent('sadanVoiceConnect'))
  }

  // SadanChat voice status → update mode
  useEffect(() => {
    function onStatus(e) {
      const { status } = e.detail ?? {}
      if (status === 'connected'    && modeRef.current === 'connecting') setMode('listening')
      if (status === 'disconnected' && modeRef.current !== 'manual')     setMode('voice')
    }
    window.addEventListener('sadan:voice_status', onStatus)
    return () => window.removeEventListener('sadan:voice_status', onStatus)
  }, [])

  // SADAN voice: fill ID + auto-login
  useEffect(() => {
    function onFill(e) {
      const { field_id, value } = e.detail ?? {}
      if (field_id !== 'login_id') return
      setCode(value); codeRef.current = value
      setTimeout(() => doLogin(value), 600)
    }
    function onAction(e) {
      const { action } = e.detail ?? {}
      if (action === 'login') doLogin(codeRef.current)
    }
    window.addEventListener('fillField', onFill)
    window.addEventListener('sadan:action', onAction)
    return () => {
      window.removeEventListener('fillField', onFill)
      window.removeEventListener('sadan:action', onAction)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── manual mode ──
  if (mode === 'manual') {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', background: '#0c1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <ManualLoginForm onBack={() => setMode('voice')} />
        <p className="text-gray-700 text-xs mt-6">מערכת מאובטחת — לשימוש מורשים בלבד</p>
      </div>
    )
  }

  // ── voice / connecting / listening ──
  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: '#0c1117',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {/* diagonal pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(45deg,#c6953b 0,#c6953b 1px,transparent 0,transparent 50%)',
        backgroundSize: '20px 20px',
      }} />
      {/* center glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 55% 45% at 50% 42%, rgba(198,149,59,0.08) 0%, transparent 70%)',
      }} />

      {/* content */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>

        {/* ── Logo ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 112, height: 112, borderRadius: '50%',
            background: 'linear-gradient(135deg,#c6953b,#b5842a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 60px rgba(198,149,59,0.4), 0 8px 40px rgba(0,0,0,0.6)',
          }}>
            <span style={{ fontSize: 52, fontWeight: 900, color: '#000', lineHeight: 1 }}>ס</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: '0.12em', margin: 0, textShadow: '0 0 40px rgba(198,149,59,0.25)' }}>SADAN</h1>
            <p style={{ color: '#c6953b', fontSize: 14, fontWeight: 500, marginTop: 4 }}>מערכת תכנון ותיאום אימונים</p>
            <p style={{ color: '#4b5563', fontSize: 11, marginTop: 2 }}>גרסה 1.0 — סודי</p>
          </div>
        </div>

        {/* ── Mic / spinner / waveform ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

          {mode === 'voice' && (
            <button
              onClick={handleMicClick}
              style={{
                position: 'relative', width: 140, height: 140, borderRadius: '50%',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {/* pulse rings */}
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '2px solid rgba(198,149,59,0.3)',
                animation: 'loginPing1 2.2s cubic-bezier(0,0,0.2,1) infinite',
              }} />
              <span style={{
                position: 'absolute', inset: 12, borderRadius: '50%',
                border: '1px solid rgba(198,149,59,0.2)',
                animation: 'loginPing1 2.8s cubic-bezier(0,0,0.2,1) 0.4s infinite',
              }} />
              {/* main circle */}
              <span style={{
                position: 'absolute', inset: 8, borderRadius: '50%',
                background: 'linear-gradient(135deg,#c6953b,#b5842a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 50px rgba(198,149,59,0.55), 0 4px 24px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s',
              }}>
                <Mic size={44} color="#000" strokeWidth={2.5} />
              </span>
              <style>{`
                @keyframes loginPing1 {
                  0%   { transform: scale(1);    opacity: 0.7; }
                  80%  { transform: scale(1.45); opacity: 0; }
                  100% { transform: scale(1.45); opacity: 0; }
                }
                @keyframes sadanWave {
                  from { transform: scaleY(0.25); }
                  to   { transform: scaleY(1); }
                }
              `}</style>
            </button>
          )}

          {mode === 'connecting' && (
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              border: '2px solid rgba(198,149,59,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(198,149,59,0.15)',
              animation: 'loginPulse 1.5s ease-in-out infinite',
            }}>
              <div style={{
                width: 110, height: 110, borderRadius: '50%',
                background: 'rgba(198,149,59,0.06)',
                border: '1px solid rgba(198,149,59,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={40} color="#c6953b" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <style>{`
                @keyframes loginPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
                @keyframes spin { to { transform:rotate(360deg) } }
              `}</style>
            </div>
          )}

          {mode === 'listening' && (
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              border: '2px solid #c6953b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 45px rgba(198,149,59,0.4)',
            }}>
              <div style={{
                width: 110, height: 110, borderRadius: '50%',
                background: 'rgba(198,149,59,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <VoiceWaveform />
              </div>
            </div>
          )}

          {/* status text */}
          <div style={{ textAlign: 'center', minHeight: 52 }}>
            {mode === 'voice' && (
              <>
                <p style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>לחץ כדי לדבר עם סדן</p>
                <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>זיהוי קולי אוטומטי</p>
              </>
            )}
            {mode === 'connecting' && (
              <>
                <p style={{ color: '#c6953b', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>סדן מייד מתפנה אליך...</p>
                <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>מתחברת לשיחה קולית</p>
              </>
            )}
            {mode === 'listening' && (
              <>
                <p style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>דבר עכשיו</p>
                <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>אמור את הקוד האישי שלך</p>
              </>
            )}
          </div>
        </div>

        {/* manual link */}
        {mode !== 'connecting' && (
          <button
            onClick={() => setMode('manual')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#4b5563', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#9ca3af'}
            onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
          >
            כניסה ידנית
            <ChevronLeft size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

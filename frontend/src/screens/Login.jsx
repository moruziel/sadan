import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ChevronLeft, Loader2 } from 'lucide-react'

const VALID_CODE = '5236521'

// ── gold waveform bars (CSS animation, no <style> tag) ─────
const WAVE_H = [0.4, 0.75, 1, 0.85, 0.6, 0.9, 0.5, 0.8, 0.45]
function VoiceWaveform() {
  const [bars, setBars] = useState(Array(WAVE_H.length).fill(3))

  useEffect(() => {
    function onLevel(e) {
      const lvl = Math.min(1, e.detail.level * 2.5)   // boost sensitivity
      setBars(WAVE_H.map(h => Math.max(3, Math.round(lvl * h * 30))))
    }
    window.addEventListener('sadan:audio_level', onLevel)
    return () => window.removeEventListener('sadan:audio_level', onLevel)
  }, [])

  return (
    <div className="flex items-end justify-center gap-0.5" style={{ height: 32, width: 40 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            height: h,
            background: '#c6953b',
            transition: 'height 0.05s ease',
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
const MAX_ATTEMPTS = 3

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('voice')  // voice | connecting | listening | manual | success
  const [sadanSpeaking, setSadanSpeaking] = useState(false)
  const [code, setCode] = useState('')
  const [loginError, setLoginError] = useState('')   // '' | 'wrong' | 'locked'
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const codeRef      = useRef(code)
  const modeRef      = useRef(mode)
  const attemptsRef  = useRef(MAX_ATTEMPTS)

  useEffect(() => { codeRef.current = code  }, [code])
  useEffect(() => { modeRef.current = mode  }, [mode])

  // מחיקת auth state בכל כניסה לדף ההתחברות (F5, יציאה, ניווט חזרה)
  useEffect(() => {
    sessionStorage.removeItem('sadan_authenticated')
  }, [])

  function doLogin(val) {
    if (val === VALID_CODE) {
      attemptsRef.current = MAX_ATTEMPTS
      setLoginError('')
      setMode('success')
      // Persist auth so reopening voice doesn't ask again in the same session
      sessionStorage.setItem('sadan_authenticated', 'true')
      sessionStorage.setItem('sadan_skip_greeting', 'true')   // Gemini already greeted on login screen
      window.dispatchEvent(new CustomEvent('sadan:authenticated'))
      setTimeout(() => navigate('/field-selection'), 2500)
    } else {
      const left = attemptsRef.current - 1
      attemptsRef.current = left
      setAttemptsLeft(left)
      setCode('')
      codeRef.current = ''
      if (left <= 0) {
        setLoginError('locked')
      } else {
        setLoginError('wrong')
        // Clear error highlight after 2s
        setTimeout(() => setLoginError(prev => prev === 'wrong' ? '' : prev), 2000)
      }
    }
  }

  function handleMicClick() {
    setMode('connecting')
    window.dispatchEvent(new CustomEvent('sadanVoiceConnect'))
  }

  // SadanChat voice status → update mode + waveform
  useEffect(() => {
    let waveTimer = null
    function onStatus(e) {
      const { status } = e.detail ?? {}
      if (status === 'connected' && modeRef.current === 'connecting') {
        // Spinner → waveform after ~2s (Gemini needs time to start speaking)
        waveTimer = setTimeout(() => {
          if (modeRef.current === 'connecting') {
            setMode('listening')
            setSadanSpeaking(true)
          }
        }, 2000)
      }
      if (status === 'sadan_speaking') {
        clearTimeout(waveTimer)
        setMode('listening')
        setSadanSpeaking(true)
      }
      if (status === 'sadan_idle')    setSadanSpeaking(false)
      if (status === 'disconnected' && modeRef.current !== 'manual') {
        clearTimeout(waveTimer)
        setMode('voice')
        setSadanSpeaking(false)
      }
    }
    window.addEventListener('sadan:voice_status', onStatus)
    return () => {
      window.removeEventListener('sadan:voice_status', onStatus)
      clearTimeout(waveTimer)
    }
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

  // ── success mode — greeting before navigation ──
  if (mode === 'success') {
    return (
      <div dir="rtl" style={{
        minHeight: '100vh', background: '#0c1117',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 32, position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 45% at 50% 42%, rgba(34,197,94,0.07) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          {/* green check */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)',
            border: '2px solid #22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(34,197,94,0.25)',
            animation: 'successPop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <span style={{ fontSize: 44, lineHeight: 1 }}>✓</span>
          </div>
          {/* greeting */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#22c55e', fontSize: 14, fontWeight: 500, margin: '0 0 8px', letterSpacing: '0.05em' }}>
              הזדהות הצליחה
            </p>
            <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>
              צהריים טובים, רס״ן כהן
            </h2>
            <p style={{ color: '#c6953b', fontSize: 15, margin: 0 }}>
              איך אוכל לעזור לך?
            </p>
          </div>
          {/* loading dots */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: '#c6953b',
                animation: `orbBreath 1.2s ${d}s ease-in-out infinite`,
              }} />
            ))}
            <span style={{ color: '#6b7280', fontSize: 13, marginRight: 6 }}>מתחבר למערכת...</span>
          </div>
        </div>
        <style>{`
          @keyframes successPop { from { transform: scale(0.4); opacity:0 } to { transform: scale(1); opacity:1 } }
          @keyframes orbBreath  { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        `}</style>
      </div>
    )
  }

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
      {/* Always-rendered keyframes so sadanWave survives mode changes */}
      <style>{`
        @keyframes sadanWave {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1); }
        }
        @keyframes loginPing1 {
          0%   { transform: scale(1);    opacity: 0.7; }
          80%  { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes loginPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>
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

        {/* ── Logo — horizontal, clearly not a button ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, userSelect: 'none', pointerEvents: 'none' }}>
          {/* icon square — rooster silhouette */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg,#c6953b,#b5842a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 28px rgba(198,149,59,0.45), 0 4px 16px rgba(0,0,0,0.5)',
            flexShrink: 0,
          }}>
            {/* crowing rooster head */}
            <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              {/* head + comb + upper beak + throat — one closed shape */}
              <path fill="#000" d="
                M 20,94
                C 8,88 4,74 5,60
                C 5,46 10,33 17,27
                C 14,20 15,11 19,6
                C 22,2 28,3 27,11
                C 26,16 24,21 25,25
                C 28,17 33,11 38,13
                C 43,16 42,24 38,28
                C 40,23 46,18 51,21
                C 57,25 54,33 49,36
                C 54,33 60,36 64,42
                L 97,20
                L 66,56
                C 62,66 56,78 50,86
                C 43,92 32,96 24,94
                Z
              "/>
              {/* lower beak — separate, gap above = open mouth */}
              <path fill="#000" d="M 67,64 L 92,92 L 63,76 Z"/>
              {/* eye */}
              <circle cx="40" cy="52" r="7" fill="#c6953b"/>
              <circle cx="42" cy="50" r="3" fill="#000"/>
            </svg>
          </div>
          {/* text block */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 38, fontWeight: 900, color: '#fff',
              letterSpacing: '0.14em', lineHeight: 1,
              textShadow: '0 0 32px rgba(198,149,59,0.3)',
            }}>SADAN</div>
            <div style={{ color: '#c6953b', fontSize: 12, fontWeight: 500, marginTop: 4, letterSpacing: '0.04em' }}>
              מערכת תכנון ותיאום אימונים
            </div>
            <div style={{ color: '#374151', fontSize: 10, marginTop: 2 }}>גרסה 1.0 — סודי</div>
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
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: 0 }}>לחץ כדי לדבר עם סדן</p>
            )}
            {mode === 'connecting' && (
              <>
                <p style={{ color: '#c6953b', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>סדן מייד מתפנה אליך...</p>
                <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>מתחבר לממשק קולי</p>
              </>
            )}
            {mode === 'listening' && null}
          </div>
        </div>

        {/* ── Code input — visible in voice + listening modes ── */}
        {(mode === 'voice' || mode === 'listening') && (
          <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* error / locked feedback */}
            {loginError === 'wrong' && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                <span style={{ color: '#f87171', fontSize: 14, fontWeight: 600 }}>
                  קוד שגוי — {attemptsLeft} ניסיון{attemptsLeft !== 1 ? 'ות' : ''} נותר{attemptsLeft !== 1 ? 'ו' : ''}
                </span>
              </div>
            )}
            {loginError === 'locked' && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: '#f87171', fontSize: 15, fontWeight: 700 }}>🔒 גישה נחסמה</div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>3 ניסיונות נכשלו — פנה למנהל המערכת</div>
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              value={code}
              disabled={loginError === 'locked'}
              onChange={e => { const v = e.target.value; setCode(v); codeRef.current = v }}
              onKeyDown={e => e.key === 'Enter' && code && doLogin(code)}
              placeholder="הזן מספר אישי"
              maxLength={10}
              dir="ltr"
              autoComplete="off"
              style={{
                width: '100%',
                background: loginError === 'locked' ? '#111' : '#111827',
                border: `1px solid ${loginError === 'wrong' ? '#ef4444' : loginError === 'locked' ? '#374151' : code.length >= 7 ? '#c6953b' : '#374151'}`,
                borderRadius: 12,
                padding: '12px 16px',
                color: loginError === 'locked' ? '#374151' : '#fff',
                fontSize: 20,
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '0.22em',
                outline: 'none',
                transition: 'border-color 0.2s',
                cursor: loginError === 'locked' ? 'not-allowed' : 'text',
              }}
            />
            <button
              onClick={() => doLogin(code)}
              disabled={!code || loginError === 'locked'}
              style={{
                width: '100%',
                padding: '11px 0',
                background: (!code || loginError === 'locked') ? '#1f2937' : 'linear-gradient(to right,#c6953b,#eab308)',
                color: (!code || loginError === 'locked') ? '#4b5563' : '#000',
                fontWeight: 700,
                fontSize: 15,
                borderRadius: 12,
                border: 'none',
                cursor: code ? 'pointer' : 'default',
                transition: 'background 0.2s',
              }}
            >
              כניסה למערכת
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

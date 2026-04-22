/**
 * DemoChecklist — מסך הכנה לדמו (פנימי, /demo-check).
 * לא מוצג בניווט הרגיל — רק למור.
 */
import { useState, useCallback } from 'react'

const CHECKLIST_ITEMS = [
  { id: 'qr',       label: 'QR ווצאפ נסרק' },
  { id: 'wa_test',  label: 'הודעת טסט נשלחה לרז' },
  { id: 'projector',label: 'מקרן / מסך מחובר' },
  { id: 'res',      label: 'רזולוציה תקינה (1920×1080 / 1366×768)' },
  { id: 'console',  label: 'אין שגיאות ב-console' },
  { id: 'mock',     label: 'Mock data טעון — 3 מתווים נראים' },
  { id: 'noscroll', label: 'כל המסכים עוברים בלי גלילה' },
  { id: 'wa_live',  label: 'הודעה קולית נשלחה ונקלטה ברז' },
]

const INITIAL_SERVERS = [
  { id: 'frontend', label: 'Frontend',        url: null,                 port: 5173 },
  { id: 'backend',  label: 'Backend API',     url: 'http://localhost:8000/health', port: 8000 },
  { id: 'whatsapp', label: 'WhatsApp Server', url: 'http://localhost:3001/status', port: 3001 },
  { id: 'tts',      label: 'ElevenLabs TTS',  url: 'http://localhost:8000/api/voice/health', port: null },
]

const STATUS_COLORS = {
  unknown: 'text-gray-500 bg-gray-800/40 border-gray-700',
  ok:      'text-green-400 bg-green-900/20 border-green-600/40',
  error:   'text-red-400   bg-red-900/20   border-red-600/40',
  checking:'text-yellow-400 bg-yellow-900/20 border-yellow-600/40',
}

const STATUS_ICONS = {
  unknown:  '⬜',
  ok:       '🟢',
  error:    '🔴',
  checking: '🟡',
}

export default function DemoChecklist() {
  const [checked,     setChecked]     = useState({})
  const [phones,      setPhones]      = useState({ raz: '', coordinator: '' })
  const [serverStatus, setServerStatus] = useState(
    Object.fromEntries(INITIAL_SERVERS.map(s => [s.id, 'unknown']))
  )
  const [running, setRunning]   = useState(false)
  const [runLog,  setRunLog]    = useState([])
  const [savedMsg, setSavedMsg] = useState('')

  // ── Check logic ───────────────────────────────────────────
  const runChecks = useCallback(async () => {
    setRunning(true)
    setRunLog([])
    const log = []

    function addLog(msg) {
      log.push(msg)
      setRunLog([...log])
    }

    // Front-end is always "ok" since we're running
    setServerStatus(prev => ({ ...prev, frontend: 'ok' }))
    addLog('✅ Frontend — פועל')

    // Check backend
    try {
      setServerStatus(prev => ({ ...prev, backend: 'checking' }))
      const r = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(3000) })
      if (r.ok) {
        setServerStatus(prev => ({ ...prev, backend: 'ok' }))
        addLog('✅ Backend API — פועל')
      } else {
        throw new Error(`status ${r.status}`)
      }
    } catch (e) {
      setServerStatus(prev => ({ ...prev, backend: 'error' }))
      addLog(`❌ Backend API — לא פעיל (${e.message})`)
    }

    // Check WhatsApp server
    try {
      setServerStatus(prev => ({ ...prev, whatsapp: 'checking' }))
      const r = await fetch('http://localhost:3001/status', { signal: AbortSignal.timeout(3000) })
      if (r.ok) {
        const data = await r.json()
        const isReady = data?.status === 'ready' || data?.connected === true
        setServerStatus(prev => ({ ...prev, whatsapp: isReady ? 'ok' : 'checking' }))
        addLog(isReady ? '✅ WhatsApp Server — מחובר' : '🟡 WhatsApp Server — פועל אך לא מחובר (נדרש QR)')
      } else {
        throw new Error(`status ${r.status}`)
      }
    } catch (e) {
      setServerStatus(prev => ({ ...prev, whatsapp: 'error' }))
      addLog(`❌ WhatsApp Server — לא פעיל (${e.message})`)
    }

    // Check TTS (ElevenLabs via voice/health)
    try {
      setServerStatus(prev => ({ ...prev, tts: 'checking' }))
      const r = await fetch('http://localhost:8000/api/voice/health', { signal: AbortSignal.timeout(3000) })
      if (r.ok) {
        const data = await r.json()
        const ttsOk = data?.tts === 'ok'
        setServerStatus(prev => ({ ...prev, tts: ttsOk ? 'ok' : 'checking' }))
        addLog(ttsOk ? '✅ ElevenLabs TTS — מפתח מוגדר ✅' : '🟡 ElevenLabs TTS — מפתח חסר (ב-.env)')
      } else {
        throw new Error(`status ${r.status}`)
      }
    } catch (e) {
      setServerStatus(prev => ({ ...prev, tts: 'error' }))
      addLog(`❌ TTS — לא נגיש (${e.message})`)
    }

    addLog('─────────────────────────')
    const ok = Object.values(serverStatus).filter(s => s === 'ok').length
    addLog(`סיכום: ${ok + 1}/4 שרתים פועלים`)
    setRunning(false)
  }, [serverStatus])

  function toggleCheck(id) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function savePhones() {
    localStorage.setItem('sadan_phones', JSON.stringify(phones))
    setSavedMsg('✅ נשמר')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  // Load saved phones on mount
  useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sadan_phones') || '{}')
      if (saved.raz || saved.coordinator) setPhones(saved)
    } catch {}
  })

  const doneCount = CHECKLIST_ITEMS.filter(i => checked[i.id]).length

  return (
    <div className="min-h-screen bg-demo-bg text-white p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Title */}
        <div className="text-center">
          <div className="text-4xl mb-2">🔧</div>
          <h1 className="text-2xl font-black text-white">הכנה לדמו — SADAN</h1>
          <p className="text-gray-500 text-sm mt-1">פנימי בלבד — לא חלק מהדמו</p>
        </div>

        {/* Server status */}
        <section className="bg-demo-surface border border-demo-border rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-bold text-base mb-3">🖥️ שרתים</h2>
          {INITIAL_SERVERS.map(srv => {
            const status = serverStatus[srv.id] || 'unknown'
            return (
              <div key={srv.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm ${STATUS_COLORS[status]}`}>
                <div className="flex items-center gap-2">
                  <span>{STATUS_ICONS[status]}</span>
                  <span className="font-semibold">{srv.label}</span>
                  {srv.port && <span className="text-[11px] opacity-60">localhost:{srv.port}</span>}
                </div>
                <span className="text-xs capitalize">
                  {status === 'unknown' ? 'לא נבדק' : status === 'checking' ? 'בודק...' : status === 'ok' ? 'פעיל' : 'שגיאה'}
                </span>
              </div>
            )
          })}
        </section>

        {/* Phone numbers */}
        <section className="bg-demo-surface border border-demo-border rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-bold text-base mb-3">📱 מספרי טלפון</h2>
          {[
            { key: 'raz',         label: 'רז (מקבל הודעה בדמו)' },
            { key: 'coordinator', label: 'מתא"ם / חמ"ל' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-gray-300 text-sm w-44 flex-shrink-0">{label}:</label>
              <input
                type="tel"
                placeholder="+972-5X-XXX-XXXX"
                value={phones[key]}
                onChange={e => setPhones(p => ({ ...p, [key]: e.target.value }))}
                className="flex-1 bg-demo-card border border-demo-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-demo-gold/60"
                dir="ltr"
              />
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={savePhones}
              className="px-4 py-1.5 bg-demo-gold text-black text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              שמור
            </button>
            {savedMsg && <span className="text-green-400 text-sm">{savedMsg}</span>}
          </div>
        </section>

        {/* Checklist */}
        <section className="bg-demo-surface border border-demo-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">✅ בדיקות ידניות</h2>
            <span className="text-demo-gold font-bold text-sm">{doneCount}/{CHECKLIST_ITEMS.length}</span>
          </div>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
              <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-all
                    ${checked[item.id]
                      ? 'bg-demo-success border-demo-success text-black'
                      : 'border-demo-border group-hover:border-demo-gold/50'
                    }`}
                  onClick={() => toggleCheck(item.id)}
                >
                  {checked[item.id] && <span className="text-xs font-black">✓</span>}
                </div>
                <span
                  className={`text-sm transition-colors ${checked[item.id] ? 'line-through text-gray-500' : 'text-gray-300 group-hover:text-white'}`}
                  onClick={() => toggleCheck(item.id)}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Auto-check button */}
        <section className="bg-demo-surface border border-demo-border rounded-2xl p-5">
          <button
            onClick={runChecks}
            disabled={running}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all
              ${running
                ? 'bg-demo-card text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90'
              }`}
          >
            {running ? '⏳ בודק...' : '🚀 הרץ בדיקה אוטומטית'}
          </button>

          {runLog.length > 0 && (
            <div className="mt-4 bg-demo-bg rounded-xl p-4 font-mono text-xs text-green-300 space-y-1 max-h-48 overflow-y-auto">
              {runLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </section>

        {/* Go to demo */}
        <div className="text-center pb-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-demo-card border border-demo-border rounded-xl text-gray-300 hover:text-white text-sm transition-colors"
          >
            ← חזור לדמו
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * DemoChecklist — מסך הכנה לדמו (פנימי, /demo-check).
 * לא מוצג בניווט הרגיל — רק למור.
 */
import { useState, useCallback, useEffect } from 'react'

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
  { id: 'backend',  label: 'Backend API',     url: '/health', port: 8000 },
  { id: 'whatsapp', label: 'WhatsApp Server', url: '/wa/status', port: 3001 },
  { id: 'tts',      label: 'ElevenLabs TTS',  url: '/api/voice/health', port: null },
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

  // ── Speaker verification state ────────────────────────────
  const [spkData,    setSpkData]    = useState({ speakers: [], enabled: false, count: 0 })
  const [spkMsg,     setSpkMsg]     = useState('')
  const [enrollName, setEnrollName] = useState('')
  const [enrollSt,   setEnrollSt]   = useState('idle') // idle|recording|sending|done|error

  const fetchSpeakers = useCallback(async () => {
    try {
      const r = await fetch('/api/speaker/list', { signal: AbortSignal.timeout(3000) })
      if (r.ok) setSpkData(await r.json())
    } catch {}
  }, [])

  useEffect(() => { fetchSpeakers() }, [fetchSpeakers])

  async function toggleSpeakerVerify(enabled) {
    try {
      await fetch('/api/speaker/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      fetchSpeakers()
      showSpkMsg(enabled ? '✅ זיהוי קולי הופעל' : '⬜ זיהוי קולי כובה')
    } catch { showSpkMsg('❌ שגיאת חיבור לשרת') }
  }

  async function removeSpeaker(name) {
    try {
      await fetch(`/api/speaker/${encodeURIComponent(name)}`, { method: 'DELETE' })
      fetchSpeakers()
      showSpkMsg(`🗑️ "${name}" הוסר`)
    } catch { showSpkMsg('❌ שגיאה בהסרה') }
  }

  async function resetAllSpeakers() {
    for (const name of spkData.speakers) {
      try {
        await fetch(`/api/speaker/${encodeURIComponent(name)}`, { method: 'DELETE' })
      } catch {}
    }
    fetchSpeakers()
    showSpkMsg('🗑️ כל הרמקולים נמחקו')
  }

  function showSpkMsg(msg) {
    setSpkMsg(msg)
    setTimeout(() => setSpkMsg(''), 3000)
  }

  async function startEnrollment() {
    if (!enrollName.trim() || enrollSt === 'recording' || enrollSt === 'sending') return
    setEnrollSt('recording')
    setSpkMsg('🎙️ מקליט 5 שניות — דבר בבירור...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      })
      const ctx = new AudioContext({ sampleRate: 16000 })
      const source = ctx.createMediaStreamSource(stream)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      const chunks = []

      source.connect(processor)
      processor.connect(ctx.destination)
      processor.onaudioprocess = (e) => {
        const f32 = e.inputBuffer.getChannelData(0)
        const i16 = new Int16Array(f32.length)
        for (let j = 0; j < f32.length; j++) {
          i16[j] = Math.max(-32768, Math.min(32767, f32[j] * 32768))
        }
        chunks.push(i16.buffer.slice())
      }

      await new Promise(resolve => setTimeout(resolve, 5000))

      processor.disconnect(); source.disconnect()
      await ctx.close()
      stream.getTracks().forEach(t => t.stop())

      setEnrollSt('sending')
      setSpkMsg('📤 שולח לשרת...')

      // Combine PCM chunks → Uint8Array → base64
      const total = chunks.reduce((a, b) => a + b.byteLength, 0)
      const combined = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) {
        combined.set(new Uint8Array(chunk), offset)
        offset += chunk.byteLength
      }
      let binary = ''
      for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i])
      const b64 = btoa(binary)

      const r = await fetch('/api/speaker/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: enrollName.trim(), audio_base64: b64 }),
      })

      if (r.ok) {
        const data = await r.json()
        setEnrollSt('done')
        setEnrollName('')
        showSpkMsg(`✅ ${data.message}`)
        fetchSpeakers()
      } else {
        const err = await r.json().catch(() => ({}))
        setEnrollSt('error')
        showSpkMsg(`❌ ${err.detail || 'שגיאה בהרשמה'}`)
      }
    } catch (e) {
      setEnrollSt('error')
      showSpkMsg(`❌ ${e.message?.includes('media') ? 'אין גישה למיקרופון' : e.message}`)
    } finally {
      setTimeout(() => setEnrollSt('idle'), 1500)
    }
  }

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
      const r = await fetch('/health', { signal: AbortSignal.timeout(3000) })
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
      const r = await fetch('/wa/status', { signal: AbortSignal.timeout(3000) })
      if (r.ok) {
        const data = await r.json()
        const isReady = data?.ready === true
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
      const r = await fetch('/api/voice/health', { signal: AbortSignal.timeout(3000) })
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
    <div className="min-h-dvh bg-demo-bg text-white p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Title */}
        <div className="text-center">
          <div className="text-4xl mb-2">🔧</div>
          <h1 className="text-2xl font-black text-white">הכנה לדמו — SADAN</h1>
          <p className="text-gray-500 text-sm mt-1">פנימי בלבד — לא חלק מהדמו</p>
        </div>

        {/* ── Speaker Verification ───────────────────────────── */}
        <section className="bg-demo-surface border border-demo-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white font-bold text-base">🎙️ זיהוי קולי (SpeechBrain)</h2>
            <button onClick={fetchSpeakers} className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-white/5">
              ↻ רענן
            </button>
          </div>

          {/* Toggle enabled */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-demo-border bg-demo-card">
            <div>
              <div className="text-sm text-gray-200 font-medium">אימות דובר</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {spkData.enabled ? 'פעיל — רק קולות מורשים יתקבלו' : 'כבוי — כל קול מתקבל'}
              </div>
            </div>
            <button
              onClick={() => toggleSpeakerVerify(!spkData.enabled)}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${spkData.enabled ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${spkData.enabled ? 'right-1' : 'right-7'}`} />
            </button>
          </div>

          {/* Enrolled speakers list */}
          {spkData.count === 0 ? (
            <div className="text-center py-3 text-gray-600 text-sm">אין רמקולים רשומים</div>
          ) : (
            <div className="space-y-1.5">
              {spkData.speakers.map(name => (
                <div key={name} className="flex items-center justify-between px-4 py-2 rounded-xl border border-demo-border bg-demo-card text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-base">👤</span>
                    <span className="text-white font-medium">{name}</span>
                  </div>
                  <button
                    onClick={() => removeSpeaker(name)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded border border-red-800/40 hover:border-red-600/40 transition-colors"
                  >
                    הסר
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Enroll new speaker */}
          <div className="pt-1 border-t border-demo-border/50">
            <div className="text-xs text-gray-500 mb-2">הרשמת רמקול חדש (5 שניות הקלטה)</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="שם הרמקול..."
                value={enrollName}
                onChange={e => setEnrollName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startEnrollment()}
                className="flex-1 bg-demo-card border border-demo-border rounded-xl px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-demo-gold/60"
                dir="rtl"
              />
              <button
                onClick={startEnrollment}
                disabled={!enrollName.trim() || enrollSt === 'recording' || enrollSt === 'sending'}
                className={`px-3 py-1.5 text-sm font-bold rounded-xl transition-all flex-shrink-0 ${
                  enrollSt === 'recording'
                    ? 'bg-red-500/20 text-red-400 border border-red-600/40 animate-pulse'
                    : enrollSt === 'sending'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-600/40'
                    : 'bg-demo-gold/20 text-demo-gold border border-demo-gold/40 hover:bg-demo-gold/30 disabled:opacity-40'
                }`}
              >
                {enrollSt === 'recording' ? '🔴 מקליט' : enrollSt === 'sending' ? '⏳' : '+ הרשם'}
              </button>
            </div>
          </div>

          {/* Reset all */}
          {spkData.count > 0 && (
            <div className="flex justify-end pt-1">
              <button
                onClick={resetAllSpeakers}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-lg border border-red-800/40 hover:border-red-600/40 transition-colors"
              >
                🗑️ מחק הכל
              </button>
            </div>
          )}

          {/* Status message */}
          {spkMsg && (
            <div className="text-sm text-center py-1 text-gray-300 bg-demo-card rounded-xl px-3">
              {spkMsg}
            </div>
          )}
        </section>

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

/**
 * Wall — the command-center display ("החמ"ל על הקיר").
 *
 * A passive narrator screen shown on the big display while the commander
 * drives the demo from the phone. Subscribes to /api/wall/ws and renders:
 *   - progress rail (where the commander is in the flow)
 *   - per-screen live panels (questionnaire params, plan reasoning, approvals)
 *   - live call transcript during phone calls
 *   - in-app voice conversation feed
 *
 * One-way by design: if this screen dies, the phone demo is unaffected.
 * Open at /wall on the desktop. Auto-reconnects.
 */
import { useState, useEffect, useRef } from 'react'
import { PLANS } from '../data/mockData'
import { CRITERIA, PLAN_REASONING } from '../data/planReasoning'

const WS_URL = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/api/wall/ws'

const STEPS = [
  { key: 'field-selection', label: 'בחירת שטח' },
  { key: 'area',            label: 'מפת שטח' },
  { key: 'calendar',        label: 'יומן' },
  { key: 'questionnaire',   label: 'תכנון תרגיל' },
  { key: 'plans',           label: 'מתווים' },
  { key: 'exercise',        label: 'תיק תרגיל' },
  { key: 'quiz',            label: 'בוחן' },
  { key: 'approvals',       label: 'אישורים' },
  { key: 'simulation',      label: 'סימולציה' },
]

const GOLD = '#c6953b'

export default function Wall() {
  const [connected, setConnected] = useState(false)
  const [screen, setScreen] = useState('')
  const [ctx, setCtx] = useState({})
  const [callLines, setCallLines] = useState([])   // {role, text}
  const [chatLines, setChatLines] = useState([])   // {role, text}
  const [thinking, setThinking] = useState(0)      // plans: criteria reveal step
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const callEndRef = useRef(null)

  // ── WS subscribe with auto-reconnect ──
  useEffect(() => {
    let closed = false
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => setConnected(true)
      ws.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data)
          if (ev.type === 'context') {
            if (ev.screen && ev.screen !== screen) setCallLinesIfLeftApprovals(ev.screen)
            setScreen(ev.screen || '')
            setCtx(ev.state || {})
          } else if (ev.type === 'call_transcript') {
            setCallLines(prev => [...prev.slice(-30), { role: ev.role, text: ev.text }])
          } else if (ev.type === 'transcript') {
            setChatLines(prev => [...prev.slice(-6), { role: ev.role, text: ev.text }])
          }
        } catch (_) {}
      }
      ws.onclose = () => {
        setConnected(false)
        if (!closed) reconnectRef.current = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws.close()
    }
    function setCallLinesIfLeftApprovals(newScreen) {
      if (newScreen !== 'approvals') setCallLines([])
    }
    connect()
    return () => { closed = true; clearTimeout(reconnectRef.current); wsRef.current?.close() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── plans: staged "thinking" reveal ──
  useEffect(() => {
    if (screen !== 'plans') { setThinking(0); return }
    setThinking(0)
    const timers = []
    for (let i = 1; i <= CRITERIA.length + 1; i++) {
      timers.push(setTimeout(() => setThinking(i), 700 * i))
    }
    return () => timers.forEach(clearTimeout)
  }, [screen])

  // auto-scroll call feed
  useEffect(() => { callEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [callLines])

  const stepIdx = STEPS.findIndex(s => s.key === screen)

  return (
    <div dir="rtl" style={{ height: '100vh', background: '#0c1117', color: '#e5e7eb', fontFamily: 'Heebo, Arial, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: `1px solid ${GOLD}33`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: 20 }}>ס</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>סדן — חמ"ל תכנון</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>תצוגת מפקדה — זמן אמת</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: connected ? '#22c55e' : '#ef4444' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
          {connected ? 'מחובר' : 'מתחבר...'}
        </div>
      </div>

      {/* Progress rail */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 28px', borderBottom: '1px solid #1f2937', flexShrink: 0 }}>
        {STEPS.map((s, i) => {
          const active = i === stepIdx, done = stepIdx >= 0 && i < stepIdx
          return (
            <div key={s.key} style={{
              flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10, fontSize: 15, fontWeight: 700,
              background: active ? GOLD : done ? '#14532d' : '#111827',
              color: active ? '#000' : done ? '#86efac' : '#6b7280',
              border: `1px solid ${active ? GOLD : done ? '#22c55e44' : '#1f2937'}`,
              transition: 'all 0.4s ease',
            }}>{s.label}</div>
          )
        })}
      </div>

      {/* Main panel */}
      <div style={{ flex: 1, minHeight: 0, padding: 28, display: 'flex', flexDirection: 'column' }}>
        {screen === 'plans' ? <PlansPanel thinking={thinking} />
          : screen === 'approvals' ? <ApprovalsPanel ctx={ctx} callLines={callLines} callEndRef={callEndRef} />
          : screen === 'simulation' ? <SimulationPanel ctx={ctx} />
          : <ContextPanel screen={screen} ctx={ctx} />}
      </div>

      {/* Conversation ticker */}
      {chatLines.length > 0 && screen !== 'approvals' && (
        <div style={{ padding: '12px 28px', borderTop: '1px solid #1f2937', flexShrink: 0, maxHeight: 120, overflow: 'hidden' }}>
          {chatLines.slice(-3).map((l, i) => (
            <div key={i} style={{ fontSize: 16, marginBottom: 4, color: l.role === 'assistant' ? GOLD : '#e5e7eb' }}>
              <b>{l.role === 'assistant' ? 'סדן: ' : 'מפקד: '}</b>{l.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Generic context panel — big readable key/values ──
function ContextPanel({ screen, ctx }) {
  const entries = Object.entries(ctx)
  const title = STEPS.find(s => s.key === screen)?.label || (screen ? screen : 'ממתין לחיבור מהנייד...')
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ fontSize: 44, fontWeight: 900, margin: '0 0 24px', color: '#fff' }}>{title}</h1>
      {entries.length === 0 ? (
        <div style={{ color: '#4b5563', fontSize: 22 }}>המפקד מנווט במסך — נתונים יופיעו כאן בזמן אמת</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, alignContent: 'start' }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ background: '#111827', border: '1px solid #374151', borderRadius: 14, padding: '18px 22px' }}>
              <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 6 }}>{k}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Plans: "SADAN thinking" + score breakdown (W3) ──
function PlansPanel({ thinking }) {
  const revealed = thinking > CRITERIA.length
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h1 style={{ fontSize: 38, fontWeight: 900, margin: '0 0 18px', color: '#fff' }}>
        סדן מנתחת מתווים
        {!revealed && <span style={{ color: GOLD }}> ...</span>}
      </h1>

      {/* criteria reveal */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
        {CRITERIA.map((c, i) => (
          <div key={c.id} style={{
            flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 16, fontWeight: 700, textAlign: 'center',
            background: thinking > i ? '#14532d' : '#111827',
            color: thinking > i ? '#86efac' : '#374151',
            border: `1px solid ${thinking > i ? '#22c55e55' : '#1f2937'}`,
            transition: 'all 0.5s ease',
          }}>
            {thinking > i ? '✓ ' : ''}{c.label} <span style={{ opacity: 0.7, fontSize: 13 }}>({Math.round(c.weight * 100)}%)</span>
          </div>
        ))}
      </div>

      {/* plan cards with breakdown */}
      <div style={{ display: 'flex', gap: 18, flex: 1, minHeight: 0, opacity: revealed ? 1 : 0.15, transition: 'opacity 0.8s ease' }}>
        {PLANS.map(p => {
          const r = PLAN_REASONING[p.id]
          const best = p.id === 'plan_1'
          return (
            <div key={p.id} style={{
              flex: 1, background: '#111827', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column',
              border: `2px solid ${best ? GOLD : '#374151'}`, boxShadow: best ? `0 0 30px ${GOLD}33` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: best ? GOLD : '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: best ? GOLD : '#9ca3af' }}>{p.score}</div>
              </div>
              {best && <div style={{ fontSize: 13, color: GOLD, fontWeight: 700, marginBottom: 8 }}>★ המלצת סדן</div>}
              {/* criteria bars */}
              <div style={{ margin: '10px 0 12px' }}>
                {CRITERIA.map(c => (
                  <div key={c.id} style={{ marginBottom: 7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>
                      <span>{c.label}</span><span>{r.scores[c.id]}</span>
                    </div>
                    <div style={{ height: 6, background: '#1f2937', borderRadius: 3 }}>
                      <div style={{ width: `${r.scores[c.id]}%`, height: '100%', borderRadius: 3, background: best ? GOLD : '#4b5563', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e5e7eb', marginBottom: 6 }}>{r.headline}</div>
              <ul style={{ margin: 0, paddingRight: 18, fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>
                {r.reasons.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Approvals: statuses + live call transcript (W4) ──
function ApprovalsPanel({ ctx, callLines, callEndRef }) {
  return (
    <div style={{ flex: 1, display: 'flex', gap: 24, minHeight: 0 }}>
      {/* status side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontSize: 38, fontWeight: 900, margin: '0 0 20px', color: '#fff' }}>מסלול אישורים</h1>
        {Object.entries(ctx).map(([k, v]) => (
          <div key={k} style={{ background: '#111827', border: '1px solid #374151', borderRadius: 14, padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 4 }}>{k}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: String(v).includes('GO') || String(v).includes('אושר') ? '#22c55e' : '#fff' }}>{String(v)}</div>
          </div>
        ))}
      </div>
      {/* live call */}
      <div style={{ flex: 1.2, background: '#111827', border: `1px solid ${GOLD}44`, borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: GOLD, marginBottom: 14, flexShrink: 0 }}>
          📞 שיחה חיה {callLines.length > 0 && <span className="wall-pulse" style={{ color: '#ef4444' }}>●</span>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {callLines.length === 0 ? (
            <div style={{ color: '#4b5563', fontSize: 18 }}>ממתין לשיחה — התמלול יופיע כאן בזמן אמת</div>
          ) : callLines.map((l, i) => (
            <div key={i} style={{ marginBottom: 10, fontSize: 19, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 800, color: l.role === 'sadan' ? GOLD : '#60a5fa' }}>
                {l.role === 'sadan' ? 'סדן: ' : 'גורם מאשר: '}
              </span>
              <span>{l.text}</span>
            </div>
          ))}
          <div ref={callEndRef} />
        </div>
      </div>
    </div>
  )
}

// ── Simulation: phase display (W5) ──
function SimulationPanel({ ctx }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 18, color: '#9ca3af', marginBottom: 10 }}>סימולציה טקטית — שטח 309ה</div>
      <div style={{ fontSize: 54, fontWeight: 900, color: GOLD, marginBottom: 18 }}>{ctx['שלב'] || '—'}</div>
      <div style={{ display: 'flex', gap: 30, fontSize: 22 }}>
        <div>מצב: <b style={{ color: ctx['מצב'] === 'רץ' ? '#22c55e' : '#f59e0b' }}>{ctx['מצב'] || '—'}</b></div>
        <div>תצוגה: <b>{ctx['תצוגה'] || '—'}</b></div>
        {ctx['יחידה בפוקוס'] && <div>בפוקוס: <b style={{ color: GOLD }}>{ctx['יחידה בפוקוס']}</b></div>}
      </div>
    </div>
  )
}

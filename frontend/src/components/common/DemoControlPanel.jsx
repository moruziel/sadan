/**
 * DemoControlPanel — hidden operator panel for jumping between demo steps live.
 *
 * Invisible by default — no button, no UI footprint. Toggled with Ctrl+Shift+→.
 * Everything it does goes through the SAME window CustomEvents the voice
 * assistant already uses (sadan:navigate / sadan:action / fillField) — no new
 * navigation logic, just a thin UI layer over the existing mechanism.
 *
 * Intentionally does NOT include "approve all" for Approvals — that's the
 * live WhatsApp moment of the demo and stays manual.
 */
import { useState, useEffect } from 'react'

function nav(path) {
  window.dispatchEvent(new CustomEvent('sadan:navigate', { detail: { path } }))
}
function action(action, extra = {}) {
  window.dispatchEvent(new CustomEvent('sadan:action', { detail: { action, ...extra } }))
}
function fill(field_id, value) {
  window.dispatchEvent(new CustomEvent('fillField', { detail: { field_id, value } }))
}

const SCREENS = [
  { label: 'כניסה',     path: '/' },
  { label: 'שטח מוקצה', path: '/field-selection' },
  { label: 'מפת שטח',   path: '/area' },
  { label: 'שאלון',     path: '/questionnaire' },
  { label: 'מתווים',    path: '/plans' },
  { label: 'תיק תרגיל', path: '/exercise' },
  { label: 'בוחן',      path: '/quiz' },
  { label: 'אישורים',   path: '/approvals' },
  { label: 'סימולציה',  path: '/simulation' },
]

function fillQuestionnaireDefaults() {
  fill('readiness', 'aleph')
  fill('objective', 'תרגול הסתערות מחלקתית בשטח בנוי')
  fill('topic', 'הסתערות ומחסה')
  fill('ammo', '5.56 + חבלה')
  fill('date', '05/05/2026')
  fill('forceSize', '30')
  fill('composition', 'חי"ר')
}

export default function DemoControlPanel() {
  const [open, setOpen] = useState(false)
  const [pttDefault, setPttDefault] = useState(() => localStorage.getItem('sadan_ptt_default') === 'true')
  const [ignoreRtgHours, setIgnoreRtgHours] = useState(() => localStorage.getItem('sadan_ignore_rtg_hours') === 'true')

  function togglePttDefault() {
    const next = !pttDefault
    setPttDefault(next)
    localStorage.setItem('sadan_ptt_default', String(next))
    // Apply immediately to an active voice session too
    window.dispatchEvent(new CustomEvent('sadan:ptt_mode', { detail: { enabled: next } }))
  }

  function toggleIgnoreRtgHours() {
    const next = !ignoreRtgHours
    setIgnoreRtgHours(next)
    localStorage.setItem('sadan_ignore_rtg_hours', String(next))
    window.dispatchEvent(new CustomEvent('sadan:rtg_rule_changed'))
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!open) return null

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed', bottom: '16px', right: '16px', zIndex: 9999,
        width: '260px', maxHeight: '80vh', overflowY: 'auto',
        background: '#0c1117', border: '1px solid #c6953b',
        borderRadius: '12px', padding: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: '#c6953b', fontWeight: 'bold', fontSize: '13px' }}>בקרת דמו</span>
        <button onClick={() => setOpen(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✕</button>
      </div>

      <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '6px' }}>קפיצה למסך</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
        {SCREENS.map(s => (
          <button key={s.path} onClick={() => nav(s.path)}
            style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: '#e5e7eb', cursor: 'pointer' }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '6px' }}>שאלון</div>
      <button onClick={() => { fillQuestionnaireDefaults(); setTimeout(() => action('proceed'), 400) }}
        style={{ width: '100%', fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: '#e5e7eb', cursor: 'pointer', marginBottom: '10px' }}>
        מלא ברירת מחדל + המשך
      </button>

      <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '6px' }}>בחירת מתווה</div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        <button onClick={() => action('select_plan', { plan_id: 'plan_1' })} style={{ flex: 1, fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: '#e5e7eb', cursor: 'pointer' }}>א׳</button>
        <button onClick={() => action('select_plan', { plan_id: 'plan_2' })} style={{ flex: 1, fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: '#e5e7eb', cursor: 'pointer' }}>ב׳</button>
        <button onClick={() => action('select_plan', { plan_id: 'plan_3' })} style={{ flex: 1, fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: '#e5e7eb', cursor: 'pointer' }}>ג׳</button>
      </div>

      <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '6px' }}>בוחן</div>
      <button onClick={() => localStorage.removeItem('sadan_quiz_state')}
        style={{ width: '100%', fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #374151', background: '#111827', color: '#e5e7eb', cursor: 'pointer', marginBottom: '10px' }}>
        איפוס תשובות בוחן
      </button>

      <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '6px' }}>מצב קהל</div>
      <button onClick={togglePttDefault}
        style={{ width: '100%', fontSize: '11px', padding: '6px', borderRadius: '6px', cursor: 'pointer', marginBottom: '4px',
          border: pttDefault ? '1px solid #eab308' : '1px solid #374151',
          background: pttDefault ? 'rgba(234,179,8,0.15)' : '#111827',
          color: pttDefault ? '#eab308' : '#e5e7eb' }}>
        🎙️ PTT (לחץ-לדבר) {pttDefault ? '— פעיל' : '— כבוי'}
      </button>
      <button onClick={toggleIgnoreRtgHours}
        style={{ width: '100%', fontSize: '11px', padding: '6px', borderRadius: '6px', cursor: 'pointer',
          border: ignoreRtgHours ? '1px solid #eab308' : '1px solid #374151',
          background: ignoreRtgHours ? 'rgba(234,179,8,0.15)' : '#111827',
          color: ignoreRtgHours ? '#eab308' : '#e5e7eb' }}>
        ⏰ בטל חוק רטג 16:00 {ignoreRtgHours ? '— מבוטל' : '— פעיל'}
      </button>

      <div style={{ color: '#4b5563', fontSize: '9px', marginTop: '10px', textAlign: 'center' }}>Ctrl+Shift+→ לסגירה/פתיחה</div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { MapPin, ShieldCheck, Heart, Crosshair, Truck, Radio, Eye, Users, Globe, CheckCircle, Clock, Send, AlertTriangle } from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'
import { COORDINATION_PARTIES } from '../data/mockData'
import { sendWhatsApp, getIncomingMessages, buildRtgMessage } from '../api/whatsapp'

const ICON_MAP = { MapPin, ShieldCheck, Heart, Crosshair, Truck, Radio, Eye, Users, Globe }

const STATUS_CONFIG = {
  approved: { label: 'אושר',    color: 'text-demo-success', bg: 'bg-demo-success/10', border: 'border-demo-success/30', dot: 'bg-demo-success' },
  pending:  { label: 'ממתין',   color: 'text-demo-warning', bg: 'bg-demo-warning/10',  border: 'border-demo-warning/30', dot: 'bg-demo-warning animate-pulse' },
  rejected: { label: 'נדחה',    color: 'text-demo-danger',  bg: 'bg-demo-danger/10',   border: 'border-demo-danger/30',  dot: 'bg-demo-danger' },
  sending:  { label: 'שולח...', color: 'text-demo-info',    bg: 'bg-demo-info/10',     border: 'border-demo-info/30',    dot: 'bg-demo-info animate-pulse' },
}

const DEMO_MESSAGES = {
  rtg:    { text: '✅ אושר — שטח 309ה פנוי. אסמכתא: RTG-2026-0501', delay: 3000 },
  safety: { text: '✅ אושר — קצין בטיחות שובץ. מגבלות צורפו.', delay: 4000 },
}

export default function Approvals() {
  const [parties, setParties]   = useState(COORDINATION_PARTIES)
  const [selected, setSelected] = useState('rtg')
  const [responses, setResponses] = useState({})
  const pollRef = useRef(null)

  const selectedParty = parties.find(p => p.id === selected)
  const approved = parties.filter(p => p.status === 'approved').length
  const total    = parties.length
  const pct      = Math.round((approved / total) * 100)

  // ניקוי polling בסיום
  useEffect(() => () => clearInterval(pollRef.current), [])

  async function sendRequest(partyId) {
    setParties(prev => prev.map(p => p.id === partyId ? { ...p, status: 'sending' } : p))

    if (partyId === 'rtg') {
      // ── ווצאפ אמיתי ─────────────────────────────────────
      const msg = buildRtgMessage({
        unit:  'גדוד 51 / פלוגה ב׳',
        field: '309ה — בטונדות',
        date:  '05.05.2026',
        ammo:  '5.56, חבלה מוגבלת',
      })
      await sendWhatsApp(msg).catch(() => {})

      // polling כל 2 שניות — מחכה ל"מאשר"
      pollRef.current = setInterval(async () => {
        const msgs = await getIncomingMessages().catch(() => [])
        const approval = msgs.find(m =>
          m.body?.includes('מאשר') || m.body?.includes('אישור') || m.body?.toLowerCase().includes('approved')
        )
        if (approval) {
          clearInterval(pollRef.current)
          setParties(prev => prev.map(p => p.id === 'rtg' ? { ...p, status: 'approved' } : p))
          setResponses(prev => ({ ...prev, rtg: `✅ התקבל: "${approval.body}" — ${new Date().toLocaleTimeString('he-IL')}` }))
        }
      }, 2000)

      // timeout אחרי 3 דקות — fallback
      setTimeout(() => {
        clearInterval(pollRef.current)
        setParties(prev => {
          const p = prev.find(p => p.id === 'rtg')
          if (p?.status === 'sending') {
            setResponses(r => ({ ...r, rtg: '⏱️ timeout — לא התקבלה תגובה. בדוק ווצאפ ידנית.' }))
            return prev.map(p => p.id === 'rtg' ? { ...p, status: 'pending' } : p)
          }
          return prev
        })
      }, 180000)

    } else if (partyId === 'safety') {
      // ── סימולציה — 4 שניות ────────────────────────────
      setTimeout(() => {
        setParties(prev => prev.map(p => p.id === 'safety' ? { ...p, status: 'approved' } : p))
        setResponses(prev => ({ ...prev, safety: '✅ אושר — קצין בטיחות שובץ. מגבלות צורפו לתיק.' }))
      }, 4000)
    }
  }

  const blockers = parties.filter(p => p.blocker)
  const allBlockersDone = blockers.every(p => p.status === 'approved')

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/approvals" />

      <div className="flex items-center justify-between px-6 py-2.5 border-b border-demo-border">
        <BackButton to="/quiz" />
        <div className="text-center">
          <h2 className="text-white font-bold text-sm">מסלול אישורים</h2>
          <p className="text-gray-500 text-xs">תרגיל איגוף מדרום — שטח 309ה</p>
        </div>
        {allBlockersDone && (
          <span className="bg-demo-success/20 text-demo-success border border-demo-success/30 text-xs font-bold px-3 py-1 rounded-full">
            🟢 GO
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* טבלת גורמים — ב-RTL ימינה, גבול פנימי = border-r */}
        <div className="w-72 border-r border-demo-border flex flex-col">
          {/* Progress */}
          <div className="px-4 py-3 border-b border-demo-border">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>השלמה כוללת</span>
              <span className="font-bold text-white">{approved}/{total}</span>
            </div>
            <div className="w-full h-2 bg-demo-card rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-demo-gold to-demo-success rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-right text-xs text-demo-gold font-bold mt-1">{pct}%</div>
          </div>

          {/* רשימה */}
          <div className="flex-1 overflow-y-auto py-1">
            {parties.map(party => {
              const Icon   = ICON_MAP[party.icon] || MapPin
              const config = STATUS_CONFIG[party.status]
              const isActive = party.id === selected

              return (
                <button
                  key={party.id}
                  onClick={() => setSelected(party.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-all
                    ${isActive ? 'bg-demo-gold/5 border-l-2 border-demo-gold' : 'hover:bg-demo-card'}`}
                >
                  <Icon size={16} className={isActive ? 'text-demo-gold' : 'text-gray-500'} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {party.name}
                    </div>
                    <div className={`text-[10px] font-medium ${config.color}`}>{config.label}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {party.blocker && (
                      <span title="חוסם" className="text-demo-danger text-[10px]">🔒</span>
                    )}
                    <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* פאנל פרטים */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedParty && (() => {
            const Icon   = ICON_MAP[selectedParty.icon] || MapPin
            const config = STATUS_CONFIG[selectedParty.status]
            const isDemo = selectedParty.id === 'rtg' || selectedParty.id === 'safety'
            const resp   = responses[selectedParty.id]

            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-demo-card border border-demo-border flex items-center justify-center">
                      <Icon size={22} className="text-demo-gold" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{selectedParty.name}</h3>
                      <p className="text-gray-500 text-sm">{selectedParty.contact}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${config.color} ${config.bg} ${config.border}`}>
                    {config.label}
                  </span>
                </div>

                {/* תוכן הבקשה */}
                <div className="bg-demo-surface border border-demo-border rounded-2xl p-4 space-y-2 text-sm">
                  <p className="text-gray-400 font-semibold text-xs uppercase tracking-wide mb-2">פרטי הבקשה</p>
                  <div className="text-gray-300 space-y-1 font-sans text-sm leading-relaxed">
                    <p>🌿 <strong>תיאום תרגיל — SADAN</strong></p>
                    <p>• יחידה: גדוד 51 / פלוגה ב׳</p>
                    <p>• שטח: 309ה — בטונדות</p>
                    <p>• תאריך: 05.05.2026 (3 ימים)</p>
                    <p>• תחמוש: 5.56, חבלה מוגבלת</p>
                    <p>• גודל כוח: ~150 כ"א</p>
                    {selectedParty.blocker && <p className="text-demo-danger">🔒 גורם חוסם — נדרש לפני GO</p>}
                  </div>
                </div>


                {/* תגובה שהתקבלה */}
                {resp && (
                  <div className="bg-demo-success/10 border border-demo-success/30 rounded-2xl px-4 py-3 text-demo-success text-sm font-medium">
                    {resp}
                  </div>
                )}

                {/* כפתור שליחה */}
                {selectedParty.status === 'pending' && isDemo && (
                  <button
                    onClick={() => sendRequest(selectedParty.id)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-demo-gold to-yellow-500 text-black font-bold rounded-xl hover:opacity-90 shadow-lg text-sm"
                  >
                    <Send size={15} />
                    {selectedParty.id === 'rtg' ? 'שלח ווצאפ לרטג' : 'שלח בקשת אישור'}
                  </button>
                )}

                {selectedParty.status === 'sending' && (
                  <div className="flex items-center gap-3 text-demo-info text-sm">
                    <span className="w-4 h-4 border-2 border-demo-info border-t-transparent rounded-full animate-spin" />
                    {selectedParty.id === 'rtg' ? 'ממתין לתגובת רטג בווצאפ...' : 'שולח בקשה...'}
                  </div>
                )}

                {selectedParty.status === 'approved' && !resp && (
                  <div className="flex items-center gap-2 text-demo-success text-sm">
                    <CheckCircle size={16} />
                    אושר — לא נדרשת פעולה נוספת
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

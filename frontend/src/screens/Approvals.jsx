import { useState, useEffect, useRef } from 'react'
import { MapPin, ShieldCheck, Heart, Crosshair, Truck, Radio, Eye, Users, Globe,
         CheckCircle, Send, Volume2, Plane, Phone } from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'
import { COORDINATION_PARTIES } from '../data/mockData'
import { sendWhatsApp, sendWhatsAppMedia, getIncomingMessages, sendVoiceNote, buildRtgMessage, AREA_309_MAP_URL } from '../api/whatsapp'
import { CONTACTS } from '../data/contacts'
import { approvalScripts } from '../data/approvalScripts.js'

const ICON_MAP = { MapPin, ShieldCheck, Heart, Crosshair, Truck, Radio, Eye, Users, Globe, Plane }

const STATUS_CONFIG = {
  approved: { label: 'אושר',     color: 'text-demo-success', bg: 'bg-demo-success/10', border: 'border-demo-success/30', dot: 'bg-demo-success' },
  pending:  { label: 'ממתין',    color: 'text-demo-warning', bg: 'bg-demo-warning/10',  border: 'border-demo-warning/30', dot: 'bg-demo-warning animate-pulse' },
  rejected: { label: 'נדחה',     color: 'text-demo-danger',  bg: 'bg-demo-danger/10',   border: 'border-demo-danger/30',  dot: 'bg-demo-danger' },
  sending:  { label: 'שולח...',  color: 'text-demo-info',    bg: 'bg-demo-info/10',     border: 'border-demo-info/30',    dot: 'bg-demo-info animate-pulse' },
  locked:   { label: 'נעול',     color: 'text-gray-500',     bg: 'bg-demo-card',        border: 'border-demo-border',     dot: 'bg-gray-600' },
}

// שורות נוספות
const EXTRA_PARTIES = [
  { id: 'airforce', name: 'חי"א — פינוי אווירי', icon: 'Plane', blocker: false, status: 'pending', contact: 'קצין חי"א' },
]

export default function Approvals() {
  const allPartiesInit = [...COORDINATION_PARTIES, ...EXTRA_PARTIES]
  const [parties, setParties]   = useState(allPartiesInit)
  const [selected, setSelected] = useState('rtg')
  const [responses, setResponses] = useState({})
  const [voiceTranscripts, setVoiceTranscripts] = useState({}) // partyId → { text, time }
  const [voiceSending, setVoiceSending] = useState({})
  const [goGoTriggered, setGoGoTriggered] = useState(false)
  const [goAnimation, setGoAnimation] = useState(false)
  const pollRef = useRef(null)

  const selectedParty = parties.find(p => p.id === selected)
  const approved  = parties.filter(p => p.status === 'approved').length
  const total     = parties.length
  const pct       = Math.round((approved / total) * 100)
  const allBlockersDone = parties.filter(p => p.blocker).every(p => p.status === 'approved')

  // RULES-001: אחרי 16:00 — פקח רטג לא זמין
  const hour = new Date().getHours()
  const rtgUnavailable = hour >= 16

  useEffect(() => () => clearInterval(pollRef.current), [])

  // ── האזנה לפקודת select_party מ-SADAN ────────────────────
  useEffect(() => {
    function onSadanAction(e) {
      const { action, party_id } = e.detail || {}
      if (action === 'select_party' && party_id) {
        const exists = [...COORDINATION_PARTIES, ...EXTRA_PARTIES].find(p => p.id === party_id)
        if (exists) setSelected(party_id)
      }
    }
    window.addEventListener('sadan:action', onSadanAction)
    return () => window.removeEventListener('sadan:action', onSadanAction)
  }, [])

  // ── שליחת הודעה כתובה ──────────────────────────────────
  async function sendTextRequest(partyId) {
    setParties(prev => prev.map(p => p.id === partyId ? { ...p, status: 'sending' } : p))

    if (partyId === 'rtg') {
      const caption = buildRtgMessage({ unit: 'גדוד 51 / פלוגה ב׳', field: '309ה — בטונדות', date: '05.05.2026', ammo: '5.56, חבלה מוגבלת' })
      // שולח תמונת שטח + טקסט ביחד (MediaMessage)
      await sendWhatsAppMedia({
        phone: CONTACTS.raz.wa,
        mediaUrl: AREA_309_MAP_URL,
        caption,
      }).catch(() => {
        // fallback: טקסט בלבד אם תמונה נכשלה
        sendWhatsApp(caption, CONTACTS.raz.wa).catch(() => {})
      })

      pollRef.current = setInterval(async () => {
        const msgs = await getIncomingMessages().catch(() => [])
        const approval = msgs.find(m => m.body?.includes('מאשר') || m.body?.includes('אישור') || m.body?.toLowerCase().includes('approved'))
        if (approval) {
          clearInterval(pollRef.current)
          setParties(prev => prev.map(p => p.id === 'rtg' ? { ...p, status: 'approved' } : p))
          setResponses(prev => ({ ...prev, rtg: `✅ התקבל: "${approval.body}" — ${new Date().toLocaleTimeString('he-IL')}` }))
        }
      }, 2000)

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
      setTimeout(() => {
        setParties(prev => prev.map(p => p.id === 'safety' ? { ...p, status: 'approved' } : p))
        setResponses(prev => ({ ...prev, safety: '✅ אושר — קצין בטיחות שובץ. מגבלות צורפו לתיק.' }))
      }, 4000)
    } else {
      // סימולציה לשאר
      setTimeout(() => {
        setParties(prev => prev.map(p => p.id === partyId ? { ...p, status: 'approved' } : p))
        setResponses(prev => ({ ...prev, [partyId]: '✅ אושר — תגובה אוטומטית' }))
      }, 3000)
    }
  }

  // ── שליחת הודעה קולית ──────────────────────────────────
  async function sendVoiceRequest(partyId) {
    setVoiceSending(prev => ({ ...prev, [partyId]: true }))
    try {
      const phone = `+${CONTACTS.mor.wa}`
      const result = await sendVoiceNote(phone, partyId).catch(() => ({ sent: true, script_text: approvalScripts[partyId] || '' }))
      const text = result.script_text || approvalScripts[partyId] || ''
      setVoiceTranscripts(prev => ({
        ...prev,
        [partyId]: { text, time: new Date().toLocaleTimeString('he-IL') },
      }))
      // simulate approval after voice note for non-rtg
      if (partyId !== 'rtg') {
        setTimeout(() => {
          setParties(prev => prev.map(p => p.id === partyId ? { ...p, status: 'approved' } : p))
          setResponses(prev => ({ ...prev, [partyId]: `📩 ענה: "מאשר" ✅ אסמכתא: ${partyId.toUpperCase()}-2026-0${Math.floor(Math.random()*900+100)}` }))
        }, 5000)
      }
    } finally {
      setVoiceSending(prev => ({ ...prev, [partyId]: false }))
    }
  }

  // ── שיחה טלפונית ────────────────────────────────────────
  const [callStatus, setCallStatus] = useState({}) // partyId → 'calling' | 'answered' | 'done' | null

  async function makePhoneCall(partyId) {
    const party = parties.find(p => p.id === partyId)
    const phone = `+${CONTACTS.mor.wa}`
    const displayPhone = CONTACTS.mor.phone  // מספר קריא לתצוגה

    setCallStatus(prev => ({ ...prev, [partyId]: 'calling' }))
    setResponses(prev => ({ ...prev, [partyId]: `📞 מתקשר ל${party?.contact || partyId} — ${displayPhone}` }))

    try {
      const res = await fetch('/api/voice/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, script_id: partyId }),
      })
      const data = await res.json()
      if (data.status === 'calling') {
        // שיחה בתהליך — מחכים 20 שניות ואז מסמנים כסיום
        setCallStatus(prev => ({ ...prev, [partyId]: 'answered' }))
        setResponses(prev => ({ ...prev, [partyId]: `📞 שיחה מתנהלת עם ${party?.contact || partyId} — ${displayPhone}` }))
        setTimeout(() => {
          setCallStatus(prev => ({ ...prev, [partyId]: 'done' }))
          setResponses(prev => ({ ...prev, [partyId]: `✅ שיחה הסתיימה — ${party?.contact || partyId} אמר: "אני מאשר, יועבר רשמית"` }))
        }, 20000)
      } else {
        setCallStatus(prev => ({ ...prev, [partyId]: null }))
        setResponses(prev => ({ ...prev, [partyId]: `❌ שגיאה: ${data.error || 'לא ידוע'}` }))
      }
    } catch (e) {
      setCallStatus(prev => ({ ...prev, [partyId]: null }))
      setResponses(prev => ({ ...prev, [partyId]: `❌ שגיאת חיבור לשרת` }))
    }
  }

  // ── GO/NO-GO ────────────────────────────────────────────
  function handleGoNoGo() {
    setGoGoTriggered(true)
    sendVoiceNote('+972501234567', 'gonogo').catch(() => {})
    // simulate approval in 4 sec
    setTimeout(() => setGoAnimation(true), 4000)
  }

  return (
    <>
      {/* GO animation overlay */}
      {goAnimation && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-green-900/80 animate-pulse cursor-pointer"
          onClick={() => setGoAnimation(false)}
        >
          <div className="text-center space-y-4">
            <div className="text-8xl font-black text-green-300" style={{ textShadow: '0 0 60px #22c55e' }}>GO</div>
            <div className="text-white text-2xl font-bold">מאושר לביצוע</div>
            <div className="text-green-300 text-sm">תרגיל איגוף מדרום — שטח 309ה — 05.05.2026</div>
            <div className="text-green-500 text-xs">לחץ לסגירה</div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
        <Header currentPath="/approvals" />

        <div className="flex items-center justify-between px-6 py-2.5 border-b border-demo-border flex-shrink-0">
          <BackButton to="/quiz" />
          <div className="text-center">
            <h2 className="text-white font-bold text-sm">מסלול אישורים</h2>
            <p className="text-gray-500 text-xs">תרגיל איגוף מדרום — שטח 309ה</p>
          </div>
          {allBlockersDone && (
            <span className="bg-demo-success/20 text-demo-success border border-demo-success/30 text-xs font-bold px-3 py-1 rounded-full">
              🟢 כל התנאים מולאו
            </span>
          )}
        </div>

        {/* RULES-001: רטג לא זמין */}
        {rtgUnavailable && (
          <div className="mx-4 mt-2 bg-orange-900/20 border border-orange-500/30 rounded-xl px-4 py-2 text-orange-300 text-xs flex items-center gap-2 flex-shrink-0">
            ⚠️ פקח רטג לא זמין אחרי 16:00. התיאום יישלח מחר בבוקר.
          </div>
        )}

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* טבלת גורמים */}
          <div className="w-64 border-r border-demo-border flex flex-col flex-shrink-0">
            {/* Progress */}
            <div className="px-4 py-3 border-b border-demo-border flex-shrink-0">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>השלמה כוללת</span>
                <span className="font-bold text-white">{approved}/{total}</span>
              </div>
              <div className="w-full h-2 bg-demo-card rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-demo-gold to-demo-success rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-right text-xs text-demo-gold font-bold mt-1">{pct}%</div>
            </div>

            {/* רשימה */}
            <div className="flex-1 overflow-y-auto py-1">
              {parties.map(party => {
                const Icon   = ICON_MAP[party.icon] || MapPin
                const config = STATUS_CONFIG[party.status] || STATUS_CONFIG.pending
                const isActive = party.id === selected
                return (
                  <button
                    key={party.id}
                    onClick={() => setSelected(party.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-all
                      ${isActive ? 'bg-demo-gold/5 border-l-2 border-demo-gold' : 'hover:bg-demo-card'}`}
                  >
                    <Icon size={15} className={isActive ? 'text-demo-gold' : 'text-gray-500'} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {party.name}
                      </div>
                      <div className={`text-[11px] font-medium ${config.color}`}>{config.label}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {party.blocker && <span className="text-demo-danger text-[11px]">🔒</span>}
                      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                    </div>
                  </button>
                )
              })}

              {/* GO/NO-GO row */}
              <div className="border-t border-demo-border mt-2 pt-2 mx-2">
                <button
                  onClick={allBlockersDone && !goGoTriggered ? handleGoNoGo : undefined}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all
                    ${allBlockersDone && !goGoTriggered
                      ? 'bg-green-900/30 border border-green-500/40 text-green-400 hover:bg-green-900/50'
                      : goGoTriggered
                        ? 'bg-green-800/40 border border-green-500/40 text-green-300'
                        : 'bg-demo-card border border-demo-border text-gray-600 cursor-not-allowed'
                    }`}
                >
                  {goGoTriggered
                    ? '✅ GO נשלח — ממתין לאישור'
                    : allBlockersDone
                      ? '🟢 בקש GO — כל התנאים מולאו'
                      : '🔒 GO/NO-GO — ממתין לכל האישורים'
                  }
                </button>
              </div>
            </div>
          </div>

          {/* פאנל פרטים */}
          <div key={selected} className="flex-1 overflow-y-auto p-5 animate-fade-in">
            {selectedParty && (() => {
              const Icon   = ICON_MAP[selectedParty.icon] || MapPin
              const config = STATUS_CONFIG[selectedParty.status] || STATUS_CONFIG.pending
              const resp   = responses[selectedParty.id]
              const voiceTx = voiceTranscripts[selectedParty.id]
              const hasScript = !!approvalScripts[selectedParty.id]
              const isVoiceSending = voiceSending[selectedParty.id]

              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-demo-card border border-demo-border flex items-center justify-center">
                        <Icon size={20} className="text-demo-gold" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base">{selectedParty.name}</h3>
                        <p className="text-gray-500 text-xs">{selectedParty.contact}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${config.color} ${config.bg} ${config.border}`}>
                      {config.label}
                    </span>
                  </div>

                  {/* תוכן הבקשה */}
                  <div className="bg-demo-surface border border-demo-border rounded-xl p-4 text-sm space-y-1.5">
                    <p className="text-gray-400 font-semibold text-xs uppercase tracking-wide mb-2">פרטי הבקשה</p>
                    <div className="text-gray-300 space-y-1 text-sm leading-relaxed">
                      <p>🌿 <strong>תיאום תרגיל — SADAN</strong></p>
                      <p>• יחידה: גדוד 51 / פלוגה ב׳</p>
                      <p>• שטח: 309ה — בטונדות</p>
                      <p>• תאריך: 05.05.2026 (3 ימים)</p>
                      <p>• תחמוש: 5.56, חבלה מוגבלת</p>
                      <p>• גודל כוח: ~150 כ"א</p>
                      {selectedParty.blocker && <p className="text-demo-danger">🔒 גורם חוסם — נדרש לפני GO</p>}
                    </div>
                  </div>

                  {/* כפתורי שליחה — 2 כפתורים */}
                  {selectedParty.status === 'pending' && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => sendTextRequest(selectedParty.id)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-demo-surface border border-demo-border text-gray-300 hover:text-white hover:border-demo-gold/40 font-semibold rounded-xl text-sm transition-all"
                      >
                        <Send size={14} />
                        📝 הודעה כתובה
                      </button>
                      {hasScript && (
                        <button
                          onClick={() => makePhoneCall(selectedParty.id)}
                          disabled={!!callStatus[selectedParty.id]}
                          className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-xl text-sm transition-all disabled:opacity-60
                            ${callStatus[selectedParty.id] === 'answered'
                              ? 'bg-green-800/50 border border-green-400/50 text-green-200 animate-pulse'
                              : 'bg-green-900/30 border border-green-500/30 text-green-300 hover:bg-green-900/50'}`}
                        >
                          {callStatus[selectedParty.id] === 'calling'
                            ? <span className="w-3.5 h-3.5 border-2 border-green-300 border-t-transparent rounded-full animate-spin" />
                            : callStatus[selectedParty.id] === 'answered'
                              ? <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse inline-block" />
                              : <Phone size={14} />
                          }
                          {callStatus[selectedParty.id] === 'calling' ? 'מחייג...'
                            : callStatus[selectedParty.id] === 'answered' ? '📞 שיחה מתנהלת'
                            : '📞 שיחה טלפונית'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* מצב שליחה */}
                  {selectedParty.status === 'sending' && (
                    <div className="flex items-center gap-3 text-demo-info text-sm">
                      <span className="w-4 h-4 border-2 border-demo-info border-t-transparent rounded-full animate-spin" />
                      {selectedParty.id === 'rtg' ? 'ממתין לתגובת רטג בווצאפ...' : 'שולח בקשה...'}
                    </div>
                  )}

                  {/* תגובה טקסט */}
                  {resp && (() => {
                    const cs = callStatus[selectedParty.id]
                    const isLive = cs === 'calling' || cs === 'answered'
                    const colorClass = isLive
                      ? 'bg-green-900/20 border-green-500/40 text-green-300'
                      : 'bg-demo-success/10 border-demo-success/30 text-demo-success'
                    return (
                      <div className={`rounded-xl px-4 py-3 text-sm font-medium border flex items-center gap-2 ${colorClass}`}>
                        {cs === 'answered' && <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />}
                        {resp}
                      </div>
                    )
                  })()}

                  {voiceTx && (
                    <div className="hidden">
                    </div>
                  )}

                  {/* אושר */}
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
    </>
  )
}

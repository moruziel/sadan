import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ClipboardList, ShieldCheck, Target, AlertTriangle,
  CheckSquare, Megaphone, FileText, Download, Pencil, ChevronLeft,
  Handshake, ChevronDown, Mail, Calendar, Share2, Info, Package,
  Radio, Utensils, Stethoscope, Box, Sword, Play,
} from 'lucide-react'
import Header from '../components/common/Header'
import FireMiniMap from '../components/map/FireMiniMap'
import BackButton from '../components/common/BackButton'
import DataSourcesDiagram from '../components/common/DataSourcesDiagram'
import { EXERCISE_FILE } from '../data/mockData'
import CombatProcedure from '../components/CombatProcedure'

const ICON_MAP = { ClipboardList, ShieldCheck, Target, AlertTriangle, CheckSquare, Megaphone, FileText, Handshake, Package, Sword }

const STATUS_STYLE = {
  ok:       { dot: 'bg-demo-success', badge: 'text-demo-success',   label: '✓' },
  pending:  { dot: 'bg-demo-warning animate-pulse', badge: 'text-demo-warning', label: '⏳' },
  critical: { dot: 'bg-demo-danger animate-ping',   badge: 'text-demo-danger',  label: '!'  },
}

// ── Export dropdown ───────────────────────────────────────
function ExportDropdown() {
  const [open, setOpen]       = useState(false)
  const [toast, setToast]     = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function handleExport(label) {
    setOpen(false)
    setToast(`✅ ${label}`)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-3 py-1.5 bg-demo-card border border-demo-border rounded-lg text-gray-400 hover:text-white text-xs transition-colors"
      >
        <Share2 size={13} /> ייצוא <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute top-9 left-0 z-50 bg-demo-surface border border-demo-border rounded-xl shadow-2xl overflow-hidden w-52 text-right" dir="rtl">
          {[
            { icon: '📧', label: 'שלח למייל צבאי (מל"ל)' },
            { icon: '📧', label: 'שלח למייל אזרחי' },
            { icon: '📅', label: 'הוסף ליומן' },
            { icon: '📄', label: 'הורד PDF' },
          ].map(opt => (
            <button
              key={opt.label}
              onClick={() => handleExport(opt.label)}
              className="w-full text-right px-4 py-2.5 text-xs text-gray-300 hover:bg-demo-card hover:text-white transition-all flex items-center gap-2 border-b border-demo-border/40"
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-800/90 border border-green-500/40 text-green-300 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── תדריך accordion ──────────────────────────────────────
function BriefingContent({ section }) {
  const [openIdx, setOpenIdx] = useState(null)
  const items = section.content?.accordion || []

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Megaphone size={22} className="text-demo-gold" />
        <h3 className="text-xl font-bold text-gray-900">{section.content.title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const isOpen = openIdx === i
          return (
            <div key={i} className={`rounded-xl border transition-all ${isOpen ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-right"
                onClick={() => setOpenIdx(isOpen ? null : i)}
              >
                <span className={`text-sm font-semibold ${isOpen ? 'text-amber-800' : 'text-gray-800'}`}>{item.title}</span>
                <ChevronDown size={15} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-3 text-sm text-gray-600 border-t border-amber-200">
                  {item.body
                    ? <p className="pt-2">{item.body}</p>
                    : <p className="pt-2 text-gray-400 italic">— יתווסף בהמשך —</p>
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── שת"פ content ────────────────────────────────────────
function CollabContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-5">
        <Handshake size={22} className="text-demo-gold" />
        <h3 className="text-xl font-bold text-gray-900">שת"פ יחידות</h3>
      </div>

      {/* שריון — ריכוך יעד */}
      <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🪖</span>
            <span className="font-bold text-gray-800">מחלקת שריון — ריכוך יעד בנוי</span>
          </div>
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">✅ מאושר</span>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• טנק אחד (מרכבה) לריכוך יעד בנוי לפני סריקה</div>
          <div>• תיאום אש: מ"מ → מ"פ שריון → ביצוע</div>
          <div>• ביטול ירי: פקודה קולית + ביטול בקשר לפני כניסת כוח רגלי</div>
        </div>
      </div>

      {/* פינוי אווירי */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚁</span>
            <span className="font-bold text-gray-800">פינוי אווירי (חי"א)</span>
          </div>
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">⏳ ממתין</span>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• טייסת 124, חלון 10:00–12:00</div>
          <div>• סוג: UH-60 Black Hawk</div>
          <div>• נקודת הנחתה: תיואם 24ש׳ מראש</div>
        </div>
      </div>
    </div>
  )
}

// ── ירי ושטחים — מפה + נתוני ירי ───────────────────────
function FireContent({ section }) {
  const { phases = [], sectors, clearance, pendingNote } = section.content

  return (
    <div className="flex flex-col h-full gap-2" style={{ minHeight: 0 }}>
      {/* כותרת */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Target size={20} className="text-demo-gold" />
        <h3 className="text-lg font-bold text-gray-900">{section.content.title}</h3>
        {section.status === 'pending' && (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {section.statusLabel}
          </span>
        )}
      </div>

      {pendingNote && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-700 flex items-center gap-2 flex-shrink-0">
          ⚠️ {pendingNote}
        </div>
      )}

      {/* מפה + נתוני ירי — תופס את כל הגובה הנותר */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* מפה — 70% */}
        <div
          className="rounded-xl overflow-hidden border border-gray-200 shadow-md flex-shrink-0 h-full"
          style={{ width: '70%' }}
        >
          <FireMiniMap />
        </div>

        {/* פאנל נתונים — 30%, ללא גלילה */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">

          {/* גבולות גזרה */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-shrink-0">
            <div className="text-xs font-bold text-gray-500 mb-1.5">גבולות גזרה</div>
            <div className="flex justify-between gap-2">
              {sectors?.left && (
                <div className="text-center flex-1">
                  <div className="text-[11px] text-gray-500">{sectors.left.label}</div>
                  <div className="text-lg font-black font-mono text-gray-900 leading-tight">{sectors.left.azimuth}</div>
                </div>
              )}
              <div className="w-px bg-gray-200 self-stretch mx-1" />
              {sectors?.right && (
                <div className="text-center flex-1">
                  <div className="text-[11px] text-gray-500">{sectors.right.label}</div>
                  <div className="text-lg font-black font-mono text-gray-900 leading-tight">{sectors.right.azimuth}</div>
                </div>
              )}
            </div>
          </div>

          {/* נתיר */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-green-600 text-sm font-black">✅</span>
              <span className="text-sm font-bold text-green-800">{clearance?.name}</span>
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{clearance?.approvedBy} · {clearance?.time} · {clearance?.constraint}</div>
          </div>

          {/* שלבי ירי — קומפקטי */}
          {phases.map(ph => {
            const isStatic = ph.type === 'ירי נייח'
            return (
              <div
                key={ph.id}
                className={`rounded-xl border px-2 py-1.5 flex-1 flex flex-col justify-between min-h-0 ${
                  isStatic ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
                }`}
              >
                {/* שורה 1: badge + שלב + מיקום + 📍 נ"צ */}
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    isStatic ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                  }`}>{ph.label}</span>
                  <span className="text-[10px] text-gray-500 font-semibold flex-shrink-0">{ph.stage}</span>
                  <span className="text-xs font-bold text-gray-900 flex-shrink-0 mx-1">{ph.position}</span>
                  {ph.coord && (
                    <button
                      onClick={() => ph.lngLat && window.dispatchEvent(
                        new CustomEvent('sadan:fire_map_fly', { detail: { lngLat: ph.lngLat, zoom: 15, phase: ph } })
                      )}
                      className="text-[9px] text-blue-500 font-mono mr-auto hover:text-blue-700 hover:underline transition-colors cursor-pointer truncate"
                      title={`מרכז מפה על ${ph.coord}`}
                    >
                      📍 {ph.coord}
                    </button>
                  )}
                </div>

                {/* שורה 2: אזימוטים */}
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="text-[9px] text-gray-400">אז׳</div>
                    <div className="text-sm font-black font-mono text-gray-900 leading-none">{ph.azimuth}</div>
                  </div>
                  <div className="text-gray-300 text-xs">|</div>
                  <div className="text-center">
                    <div className="text-[9px] text-gray-400">שמאל</div>
                    <div className="text-xs font-bold font-mono text-gray-700 leading-none">{ph.leftLimit}</div>
                  </div>
                  <div className="text-gray-300 text-xs">|</div>
                  <div className="text-center">
                    <div className="text-[9px] text-gray-400">ימין</div>
                    <div className="text-xs font-bold font-mono text-gray-700 leading-none">{ph.rightLimit}</div>
                  </div>
                </div>

                {/* שורה 3: אמל"ח */}
                <div className="text-[10px] text-gray-600 truncate">
                  <span className="font-bold">אמל"ח: </span>{ph.ammo.join(', ')}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── בטיחות + דילמות סדן ─────────────────────────────────
function SafetyContent({ section }) {
  const { items = [], dilemmas = [] } = section.content || {}
  return (
    <div className="space-y-5">
      {/* כותרת */}
      <div className="flex items-center gap-3">
        <ShieldCheck size={22} className="text-demo-gold" />
        <h3 className="text-xl font-bold text-gray-900">{section.content?.title}</h3>
      </div>

      {/* הוראות */}
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm py-2 border-b border-gray-100 last:border-0 text-gray-700">
            <ShieldCheck size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>

      {/* דילמות בטיחות */}
      {dilemmas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-black">AI</span>
            </div>
            <span className="text-sm font-bold text-gray-700">דילמות בטיחות שסדן מציפה</span>
          </div>

          <div className="space-y-3">
            {dilemmas.map(d => (
              <div key={d.id} className="rounded-xl border border-red-100 overflow-hidden">
                {/* דילמה */}
                <div className="bg-red-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-red-700">{d.title}</div>
                      <div className="text-xs text-red-600 mt-0.5">{d.description}</div>
                    </div>
                  </div>
                </div>
                {/* פתרון */}
                <div className="bg-green-50 px-4 py-3 border-t border-green-100">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-[9px] font-black">✓</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-green-700 mb-0.5">פתרון סדן:</div>
                      <div className="text-xs text-green-700">{d.solution}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── נת"בים ───────────────────────────────────────────────
function NatbamContent({ section }) {
  const { hazards = [] } = section.content || {}
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-1">
        <AlertTriangle size={22} className="text-red-500" />
        <h3 className="text-xl font-bold text-gray-900">{section.content?.title}</h3>
        <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
          {hazards.length} נת"בים פעילים
        </span>
      </div>

      {hazards.map(h => {
        const isHigh = h.severity === 'high'
        return (
          <div key={h.id} className={`rounded-xl border overflow-hidden ${isHigh ? 'border-red-200' : 'border-orange-200'}`}>
            {/* כותרת */}
            <div className={`flex items-center gap-3 px-4 py-3 ${isHigh ? 'bg-red-50' : 'bg-orange-50'}`}>
              <span className="text-2xl leading-none">{h.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm ${isHigh ? 'text-red-800' : 'text-orange-800'}`}>{h.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">📍 {h.location}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                isHigh ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'
              }`}>{isHigh ? 'גבוה' : 'בינוני'}</span>
            </div>
            {/* הגבלה */}
            <div className={`flex items-center gap-2 px-4 py-2 border-t ${isHigh ? 'border-red-100 bg-red-50/50' : 'border-orange-100 bg-orange-50/50'}`}>
              <span className="text-sm">⛔</span>
              <span className={`text-xs font-bold ${isHigh ? 'text-red-700' : 'text-orange-700'}`}>{h.restriction}</span>
            </div>
            {/* פרטים */}
            <div className="bg-white px-4 py-2.5 border-t border-gray-100">
              <p className="text-xs text-gray-600 leading-relaxed">{h.details}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── לוגיסטיקה ────────────────────────────────────────────
function LogisticsContent({ section }) {
  const { medical, comms, food, supply } = section.content || {}

  const Card = ({ icon, title, color, children }) => (
    <div className={`rounded-xl border bg-white overflow-hidden ${color.border}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${color.header}`}>
        <span className={color.icon}>{icon}</span>
        <span className={`text-sm font-bold ${color.title}`}>{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  )

  const Row = ({ label, value }) => (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 font-medium flex-shrink-0 min-w-[90px]">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-1">
        <Package size={22} className="text-demo-gold" />
        <h3 className="text-xl font-bold text-gray-900">{section.content?.title}</h3>
      </div>

      {/* רפואה */}
      {medical && (
        <Card
          icon={<Stethoscope size={16} />}
          title="רפואה ופינוי"
          color={{ border: 'border-red-100', header: 'bg-red-50 border-red-100', icon: 'text-red-500', title: 'text-red-700' }}
        >
          <Row label="עמדת חובש" value={medical.location} />
          <Row label="אופן פינוי"  value={medical.evacuationMethod} />
          <Row label="ציר פינוי"   value={medical.evacuationRoute} />
          <Row label="זמן תגובה"   value={medical.responseTime} />
          <Row label="חובש אחראי"  value={medical.medic} />
          {medical.medicPhone && (
            <div className="flex gap-2 text-sm">
              <span className="text-gray-400 font-medium flex-shrink-0 min-w-[90px]">טל׳ חובש</span>
              <a href={`tel:${medical.medicPhone}`} className="font-bold font-mono text-blue-600 hover:underline">{medical.medicPhone}</a>
            </div>
          )}
          {medical.emergencyPhone && (
            <div className="flex gap-2 text-sm items-center">
              <span className="text-gray-400 font-medium flex-shrink-0 min-w-[90px]">חירום רפואי</span>
              <a href={`tel:${medical.emergencyPhone}`} className="font-black font-mono text-red-600 text-base hover:underline">{medical.emergencyPhone}</a>
              <span className="text-[10px] text-red-400 font-semibold">מד"א / רפ"ק</span>
            </div>
          )}
        </Card>
      )}

      {/* קשר */}
      {comms && (
        <Card
          icon={<Radio size={16} />}
          title="קשר — תדרים ואותות קריאה"
          color={{ border: 'border-blue-100', header: 'bg-blue-50 border-blue-100', icon: 'text-blue-500', title: 'text-blue-700' }}
        >
          <div className="flex gap-3">
            <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 text-center">
              <div className="text-[10px] text-blue-400 font-semibold mb-0.5">אות קריאה</div>
              <div className="text-base font-black text-blue-900 tracking-wide">{comms.callSign}</div>
              <div className="text-[10px] text-blue-500 mt-0.5">{comms.hmul}</div>
              {comms.hmulPhone && (
                <a href={`tel:${comms.hmulPhone}`} className="text-[11px] font-black font-mono text-blue-700 hover:underline mt-0.5 block">{comms.hmulPhone}</a>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] text-gray-400 font-semibold">תדר עיקרי</span>
                <span className="text-sm font-black font-mono text-gray-900">{comms.mainFreq}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] text-gray-400 font-semibold">תדר חלופי</span>
                <span className="text-sm font-bold font-mono text-gray-700">{comms.altFreq}</span>
              </div>
              <div className="flex items-center justify-between bg-red-50 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] text-red-400 font-semibold">תדר רפואי</span>
                <span className="text-sm font-bold font-mono text-red-700">{comms.medFreq}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* מים ומזון */}
      {food && (
        <Card
          icon={<Utensils size={16} />}
          title="מים ומזון"
          color={{ border: 'border-green-100', header: 'bg-green-50 border-green-100', icon: 'text-green-600', title: 'text-green-700' }}
        >
          <div className="flex gap-3">
            {/* נקודות שתייה */}
            <div className="flex-1">
              <div className="text-[10px] text-gray-400 font-semibold mb-1.5">💧 נקודות שתייה</div>
              {food.waterPoints?.map((p, i) => (
                <div key={i} className="text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0">{p}</div>
              ))}
              <div className="mt-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 rounded px-2 py-1">
                מינימום: {food.minWaterPerSoldier}
              </div>
            </div>
            {/* ארוחות */}
            <div className="flex-1">
              <div className="text-[10px] text-gray-400 font-semibold mb-1.5">🍽️ ארוחות</div>
              <div className="text-xs text-gray-600 mb-1.5">{food.mealsLocation}</div>
              {food.mealTimes?.map((t, i) => (
                <div key={i} className="text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0">{t}</div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* אספקה */}
      {supply && (
        <Card
          icon={<Box size={16} />}
          title="אספקה ולוגיסטיקה"
          color={{ border: 'border-amber-100', header: 'bg-amber-50 border-amber-100', icon: 'text-amber-600', title: 'text-amber-700' }}
        >
          <Row label="נקודת סיוע"    value={supply.point} />
          <Row label="קצין לוגיסטי"  value={supply.logOfficer} />
          <Row label="כלי רכב"       value={supply.vehicles} />
          <Row label="תחמושת עתודה"  value={supply.ammoReserve} />
        </Card>
      )}
    </div>
  )
}

// ── רכיב כללי + RULES-001 ────────────────────────────────
function GeneralContent({ section }) {
  const [openIdx, setOpenIdx] = useState(null)
  const lines = section.content.lines || []

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <ClipboardList size={22} className="text-demo-gold" />
        <h3 className="text-xl font-bold text-gray-900">{section.content.title}</h3>
      </div>

      {/* RULES-001 */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-2.5 mb-4 text-sm text-yellow-800 flex items-center gap-2">
        ⚠️ קצין מאשר חייב להיות מדרגת סא"ל ומעלה.
      </div>

      <div className="space-y-2">
        {lines.map((line, i) => {
          const text = typeof line === 'string' ? line : line.text
          const desc = typeof line === 'string' ? null  : line.desc
          const isOpen = openIdx === i
          return (
            <div key={i} className={`rounded-xl border transition-all overflow-hidden ${isOpen ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-right"
                onClick={() => setOpenIdx(isOpen ? null : i)}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  isOpen ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-600'
                }`}>{i + 1}</span>
                <span className={`text-sm font-semibold flex-1 text-right ${isOpen ? 'text-amber-800' : 'text-gray-800'}`}>{text}</span>
                {desc && <ChevronDown size={15} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />}
              </button>
              {isOpen && desc && (
                <div className="px-4 pb-3 border-t border-amber-200">
                  <p className="text-sm text-gray-600 leading-relaxed pt-2">{desc}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── מסכים + sidebar ──────────────────────────────────────
const EXTRA_SECTIONS = [
  {
    id: 'collab',
    icon: 'Handshake',
    label: 'שת"פ',
    status: 'pending',
    statusLabel: '⏳ חי"א ממתין',
  },
  {
    id: 'combat',
    icon: 'Sword',
    label: 'נוהל קרב',
    status: 'ok',
    statusLabel: '',
  },
]

export default function Exercise() {
  const navigate      = useNavigate()
  const location      = useLocation()

  // זיהוי חזרה מהבוחן דרך כפתור אינפו
  const returnFromQuiz = location.state?.returnFromQuiz || false
  const initialTab     = location.state?.openTab || 'general'

  const [activeId,    setActiveId]    = useState(initialTab)
  const [showDiagram, setShowDiagram] = useState(false)
  const [visited,     setVisited]     = useState(new Set([initialTab]))

  function handleTabClick(id) {
    setActiveId(id)
    setVisited(prev => new Set([...prev, id]))
  }

  // SADAN voice — open tab by id
  useEffect(() => {
    function onOpenTab(e) {
      const { tab_id } = e.detail ?? {}
      if (tab_id) handleTabClick(tab_id)
    }
    window.addEventListener('sadan:open_tab', onOpenTab)
    return () => window.removeEventListener('sadan:open_tab', onOpenTab)
  }, [])

  const canProceed = visited.has('fire') && visited.has('natbam')

  const allSections = [...EXERCISE_FILE.sections, ...EXTRA_SECTIONS]
  const active = allSections.find(s => s.id === activeId)

  function renderContent() {
    if (activeId === 'combat')     return <CombatProcedure />
    if (activeId === 'collab')     return <CollabContent />
    if (activeId === 'fire')       return <FireContent section={active} />
    if (activeId === 'general')    return <GeneralContent section={active} />
    if (activeId === 'briefing')   return <BriefingContent section={active} />
    if (activeId === 'safety')     return <SafetyContent section={active} />
    if (activeId === 'logistics')  return <LogisticsContent section={active} />
    if (activeId === 'natbam')     return <NatbamContent section={active} />
    if (!active) return null

    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          {(() => { const Icon = ICON_MAP[active.icon] || FileText; return <Icon size={22} className="text-demo-gold" /> })()}
          <h3 className="text-xl font-bold text-gray-900">{active.content?.title}</h3>
          {active.status === 'critical' && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">נדרש עיון מיידי</span>
          )}
          {active.status === 'pending' && (
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{active.statusLabel}</span>
          )}
        </div>

        {active.content?.note && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-sm text-orange-700">
            {active.content.note}
          </div>
        )}

        {active.content?.lines && (
          <div className="space-y-2">
            {active.content.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium">
                <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                {line}
              </div>
            ))}
          </div>
        )}

        {active.content?.items && (
          <ul className="space-y-2">
            {active.content.items.map((item, i) => (
              <li key={i} className={`flex items-start gap-2 text-sm py-2 border-b border-gray-100 last:border-0
                ${item.startsWith('🔴') ? 'text-red-700' : item.startsWith('🟡') ? 'text-orange-700' : 'text-gray-700'}`}>
                <span className="text-gray-300 flex-shrink-0 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-demo-bg" dir="rtl">
      <Header currentPath="/exercise" />
      {showDiagram && <DataSourcesDiagram onClose={() => setShowDiagram(false)} />}

      {/* Topbar — stacks on mobile (title row, then actions row) instead of cramming 3 flex children into one row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-3 md:px-6 py-2.5 border-b border-demo-border bg-demo-surface flex-shrink-0">
        <div className="flex items-center justify-between md:contents">
          <BackButton to="/plans" />
          <div className="text-center flex-1 md:flex-initial min-w-0">
            <h2 className="text-white font-bold text-sm truncate">{EXERCISE_FILE.name}</h2>
            <p className="text-gray-500 text-xs hidden sm:block truncate">
              {EXERCISE_FILE.field} | {EXERCISE_FILE.date} | {EXERCISE_FILE.unit}
              <span className="mx-2 text-gray-600">|</span>
              <span className="text-demo-gold/80">דרגה מאשרת:</span>
              <span className="text-gray-400 mr-1">{EXERCISE_FILE.approvalRank}</span>
            </p>
          </div>
          {/* spacer to balance BackButton width on mobile so title stays centered */}
          <div className="w-8 md:hidden" />
        </div>
        <div className="flex flex-wrap gap-2 justify-center md:justify-end">
          <button
            onClick={() => setShowDiagram(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-demo-card border border-demo-border rounded-lg text-gray-400 hover:text-demo-gold hover:border-demo-gold/40 text-xs transition-colors"
          >
            <Info size={13} /> <span className="hidden sm:inline">מקורות</span>
          </button>
          <ExportDropdown />
          <button
            onClick={() => navigate('/simulation')}
            className="flex items-center gap-1 px-3 py-1.5 bg-demo-gold/15 border border-demo-gold/40 rounded-lg text-demo-gold hover:bg-demo-gold/25 text-xs transition-colors font-semibold"
          >
            <Play size={13} /> סימולציה
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-demo-card border border-demo-border rounded-lg text-gray-400 hover:text-white text-xs transition-colors">
            <Pencil size={13} /> <span className="hidden sm:inline">עריכה</span>
          </button>
        </div>
      </div>

      {/* באנר חזרה מהבוחן */}
      {returnFromQuiz && (
        <div className="flex items-center gap-3 px-5 py-2 bg-blue-600/15 border-b border-blue-500/25 flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Info size={11} className="text-white" />
          </div>
          <span className="text-blue-300 text-sm font-semibold flex-1">עיון מהבוחן — הטאב הרלוונטי נפתח</span>
          <button
            onClick={() => navigate('/quiz')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg text-sm transition-colors flex-shrink-0"
          >
            <ChevronLeft size={14} />
            חזור לבוחן
          </button>
        </div>
      )}

      {/* תיק תרגיל — Header/Body קבוע: רצועת הטאבים תמיד למעלה, התוכן ממלא את כל הגובה
          הפנוי עם הגלילה שלו (לא נגלל ביחד עם הטאבים — בניגוד לשאלון/בוחן, כאן רוצים
          שהתוכן "יתפוס" את המסך, לא שיהיה עוד בלוק שגוללים אליו). */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
        {/* Sidebar — horizontal scrolling tab strip on mobile, vertical sidebar on desktop */}
        <div className="w-full md:w-48 bg-demo-surface border-b md:border-b-0 md:border-r border-demo-border flex flex-col flex-shrink-0 md:overflow-hidden">
          {/* טאבים */}
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible md:flex-1 md:overflow-y-auto py-2">
            {allSections.map(section => {
              const Icon     = ICON_MAP[section.icon] || FileText
              const style    = STATUS_STYLE[section.status] || STATUS_STYLE.ok
              const isActive = section.id === activeId

              return (
                <button
                  key={section.id}
                  onClick={() => handleTabClick(section.id)}
                  className={`
                    flex-shrink-0 md:w-full flex items-center gap-3 px-3 py-3 text-right transition-all relative
                    ${isActive ? 'bg-demo-gold/10 border-b-2 md:border-b-0 md:border-l-2 border-demo-gold' : 'hover:bg-demo-card'}
                  `}
                >
                  <Icon size={18} className={isActive ? 'text-demo-gold' : 'text-gray-500'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {section.label}
                      </span>
                      {/* חובה לבקר לפני המשך לבוחן — נקודה כתומה עד ביקור, ✓ ירוק אחריו */}
                      {(section.id === 'fire' || section.id === 'natbam') && (
                        visited.has(section.id)
                          ? <span className="text-green-400 text-xs flex-shrink-0">✓</span>
                          : <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" title="ביקור נדרש להמשך" />
                      )}
                    </div>
                    {section.statusLabel && (
                      <div className={`text-[11px] ${style.badge}`}>{section.statusLabel}</div>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                </button>
              )
            })}
          </div>

          {/* כפתור המשך לבוחן — תחתית סרגל */}
          <div className="p-3 border-t border-demo-border flex-shrink-0">
            <button
              onClick={() => canProceed && navigate('/quiz')}
              disabled={!canProceed}
              className={`w-full flex items-center justify-center gap-2 py-2.5 font-bold rounded-xl text-sm transition-all ${
                canProceed
                  ? 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90 cursor-pointer'
                  : 'bg-demo-card border border-demo-border text-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              לבוחן <ChevronLeft size={15} />
            </button>
            {!canProceed && (
              <div className="text-[10px] text-gray-600 text-center mt-1.5 leading-tight">
                {!visited.has('fire') && !visited.has('natbam') ? 'פתח ירי ונת"בים' :
                 !visited.has('fire')   ? 'פתח ירי ושטחים' :
                                          'פתח נת"בים'}
              </div>
            )}
          </div>
        </div>

        {/* תוכן */}
        <div
          key={activeId}
          className={`flex-1 min-h-0 animate-fade-in
            ${activeId === 'combat'
              ? 'overflow-hidden bg-[#0a1a0a] text-gray-200'
              : activeId === 'fire'
              ? 'overflow-hidden flex flex-col p-4 bg-white text-gray-800'
              : 'overflow-y-auto p-6 bg-white text-gray-800'}`}
        >
          {renderContent()}
        </div>
      </div>

      {/* bottom bar */}
      <div className="px-6 py-3 border-t border-demo-border bg-demo-surface flex items-center flex-shrink-0">
        <div className="text-xs text-gray-600">{EXERCISE_FILE.name} · {EXERCISE_FILE.date}</div>
      </div>
    </div>
  )
}

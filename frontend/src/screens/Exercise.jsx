import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, ShieldCheck, Target, AlertTriangle,
  CheckSquare, Megaphone, FileText, Download, Pencil, ChevronLeft,
  Handshake, ChevronDown, Mail, Calendar, Share2, Info,
} from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'
import DataSourcesDiagram from '../components/common/DataSourcesDiagram'
import { EXERCISE_FILE } from '../data/mockData'

const ICON_MAP = { ClipboardList, ShieldCheck, Target, AlertTriangle, CheckSquare, Megaphone, FileText, Handshake }

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

// ── שת"פ content ────────────────────────────────────────
function CollabContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-5">
        <Handshake size={22} className="text-demo-gold" />
        <h3 className="text-xl font-bold text-gray-900">שת"פ יחידות</h3>
      </div>

      {/* פינוי רכוב */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚑</span>
            <span className="font-bold text-gray-800">פינוי רכוב (חובה)</span>
          </div>
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">✅ מובנה</span>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• 4x4 + חובש, זמן תגובה 3–7 דקות</div>
          <div>• ערכת חובש מתקדמת MARCHPAWS</div>
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

// ── ירי ושטחים עם KB/מאור ────────────────────────────────
function FireContent({ section }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Target size={22} className="text-demo-gold" />
        <h3 className="text-xl font-bold text-gray-900">{section.content.title}</h3>
        {section.status === 'pending' && (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{section.statusLabel}</span>
        )}
      </div>

      {section.content.note && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-sm text-orange-700">
          {section.content.note}
        </div>
      )}

      <ul className="space-y-2 mb-6">
        {section.content.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm py-2 border-b border-gray-100 last:border-0 text-gray-700">
            <span className="text-gray-300 flex-shrink-0 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>

      {/* מערכות מסונכרנות — UPGRADE-005 */}
      <div className="border-t border-gray-100 pt-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">── מערכות מסונכרנות ──</div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 text-sm">🎯 קרקע בטוחה</span>
              <span className="text-green-600 text-xs font-bold">מסונכרן ✅</span>
            </div>
            <div className="text-xs text-gray-500">הקצאה: KB-2026-1847</div>
            <div className="text-xs text-gray-600">5 משפכים מאושרים</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 text-sm">📊 מאור</span>
              <span className="text-green-600 text-xs font-bold">מסונכרן ✅</span>
            </div>
            <div className="text-xs text-gray-500">הקצאה: MA-2026-3391</div>
            <div className="text-xs text-gray-600">5.56: 500 כדורים ✅</div>
            <div className="text-xs text-gray-600">חבלה: 6 מטענים ✅</div>
            <div className="text-xs text-gray-600">רימונים: 10 ✅</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── רכיב כללי + RULES-001 ────────────────────────────────
function GeneralContent({ section }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <ClipboardList size={22} className="text-demo-gold" />
        <h3 className="text-xl font-bold text-gray-900">{section.content.title}</h3>
      </div>

      {/* RULES-001 */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-2.5 mb-4 text-sm text-yellow-800 flex items-center gap-2">
        ⚠️ קצין מאשר חייב להיות מדרגת סמ"ה ומעלה.
      </div>

      <div className="space-y-2">
        {section.content.lines.map((line, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium">
            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
            {line}
          </div>
        ))}
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
]

export default function Exercise() {
  const navigate      = useNavigate()
  const [activeId,    setActiveId]    = useState('general')
  const [showDiagram, setShowDiagram] = useState(false)

  const allSections = [...EXERCISE_FILE.sections, ...EXTRA_SECTIONS]
  const active = allSections.find(s => s.id === activeId)

  function renderContent() {
    if (activeId === 'collab') return <CollabContent />
    if (activeId === 'fire')   return <FireContent section={active} />
    if (activeId === 'general') return <GeneralContent section={active} />
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
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/exercise" />
      {showDiagram && <DataSourcesDiagram onClose={() => setShowDiagram(false)} />}

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-demo-border bg-demo-surface flex-shrink-0">
        <BackButton to="/plans" />
        <div className="text-center">
          <h2 className="text-white font-bold text-sm">{EXERCISE_FILE.name}</h2>
          <p className="text-gray-500 text-xs">{EXERCISE_FILE.field} | {EXERCISE_FILE.date} | {EXERCISE_FILE.unit}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDiagram(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-demo-card border border-demo-border rounded-lg text-gray-400 hover:text-demo-gold hover:border-demo-gold/40 text-xs transition-colors"
          >
            <Info size={13} /> מקורות
          </button>
          <ExportDropdown />
          <button className="flex items-center gap-1 px-3 py-1.5 bg-demo-card border border-demo-border rounded-lg text-gray-400 hover:text-white text-xs transition-colors">
            <Pencil size={13} /> עריכה
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <div className="w-48 bg-demo-surface border-r border-demo-border flex flex-col py-2 flex-shrink-0 overflow-y-auto">
          {allSections.map(section => {
            const Icon     = ICON_MAP[section.icon] || FileText
            const style    = STATUS_STYLE[section.status] || STATUS_STYLE.ok
            const isActive = section.id === activeId

            return (
              <button
                key={section.id}
                onClick={() => setActiveId(section.id)}
                className={`
                  flex items-center gap-3 px-3 py-3 text-right transition-all relative
                  ${isActive ? 'bg-demo-gold/10 border-l-2 border-demo-gold' : 'hover:bg-demo-card'}
                `}
              >
                <Icon size={18} className={isActive ? 'text-demo-gold' : 'text-gray-500'} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {section.label}
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

        {/* תוכן */}
        <div key={activeId} className="flex-1 overflow-y-auto p-6 bg-white text-gray-800 animate-fade-in">
          {renderContent()}
        </div>
      </div>

      {/* bottom bar */}
      <div className="px-6 py-3 border-t border-demo-border bg-demo-surface flex justify-between items-center flex-shrink-0">
        <div className="text-xs text-gray-500">
          {EXERCISE_FILE.sections.filter(s => s.status === 'ok').length}/{allSections.length} סעיפים מלאים
        </div>
        <button
          onClick={() => navigate('/quiz')}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-l from-demo-gold to-yellow-500 text-black font-bold rounded-xl hover:opacity-90 text-sm"
        >
          המשך לבוחן <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  )
}

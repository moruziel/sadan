import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, ShieldCheck, Target, AlertTriangle,
  CheckSquare, Megaphone, FileText, Download, Pencil, ChevronLeft
} from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'
import { EXERCISE_FILE } from '../data/mockData'

const ICON_MAP = { ClipboardList, ShieldCheck, Target, AlertTriangle, CheckSquare, Megaphone, FileText }

const STATUS_STYLE = {
  ok:       { dot: 'bg-demo-success', badge: 'text-demo-success', label: '✓' },
  pending:  { dot: 'bg-demo-warning animate-pulse', badge: 'text-demo-warning', label: '⏳' },
  critical: { dot: 'bg-demo-danger animate-ping', badge: 'text-demo-danger', label: '!' },
}

export default function Exercise() {
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState('general')
  const active = EXERCISE_FILE.sections.find(s => s.id === activeId)

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/exercise" />

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-demo-border bg-demo-surface">
        <BackButton to="/plans" />
        <div className="text-center">
          <h2 className="text-white font-bold text-sm">{EXERCISE_FILE.name}</h2>
          <p className="text-gray-500 text-xs">{EXERCISE_FILE.field} | {EXERCISE_FILE.date} | {EXERCISE_FILE.unit}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 bg-demo-card border border-demo-border rounded-lg text-gray-400 hover:text-white text-xs transition-colors">
            <Download size={13} /> PDF
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-demo-card border border-demo-border rounded-lg text-gray-400 hover:text-white text-xs transition-colors">
            <Pencil size={13} /> עריכה
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — ב-RTL נמצא ימינה, גבול פנימי = border-r, active indicator = border-l */}
        <div className="w-48 bg-demo-surface border-r border-demo-border flex flex-col py-2">
          {EXERCISE_FILE.sections.map(section => {
            const Icon   = ICON_MAP[section.icon] || FileText
            const style  = STATUS_STYLE[section.status]
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
                    <div className={`text-[10px] ${style.badge}`}>{section.statusLabel}</div>
                  )}
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
              </button>
            )
          })}
        </div>

        {/* תוכן */}
        <div className="flex-1 overflow-y-auto p-6 bg-white text-gray-800">
          {active && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                {(() => {
                  const Icon = ICON_MAP[active.icon] || FileText
                  return <Icon size={22} className="text-demo-gold" />
                })()}
                <h3 className="text-xl font-bold text-gray-900">{active.content.title}</h3>
                {active.status === 'critical' && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">נדרש עיון מיידי</span>
                )}
                {active.status === 'pending' && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{active.statusLabel}</span>
                )}
              </div>

              {active.content.note && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-sm text-orange-700">
                  {active.content.note}
                </div>
              )}

              {active.content.lines && (
                <div className="space-y-2">
                  {active.content.lines.map((line, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      {line}
                    </div>
                  ))}
                </div>
              )}

              {active.content.items && (
                <ul className="space-y-2">
                  {active.content.items.map((item, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm py-2 border-b border-gray-100 last:border-0
                      ${item.startsWith('🔴') ? 'text-red-700' : item.startsWith('🟡') ? 'text-orange-700' : 'text-gray-700'}
                    `}>
                      <span className="text-gray-300 flex-shrink-0 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* bottom bar */}
      <div className="px-6 py-3 border-t border-demo-border bg-demo-surface flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {EXERCISE_FILE.sections.filter(s => s.status === 'ok').length}/{EXERCISE_FILE.sections.length} סעיפים מלאים
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

import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'

const STEPS = [
  { path: '/field-selection', label: 'בחירת שטח',  icon: '📍' },
  { path: '/area',          label: 'מפת שטח',     icon: '🗺️' },
  { path: '/questionnaire', label: 'תכנון תרגיל', icon: '📋' },
  { path: '/plans',         label: 'מתווים',      icon: '🎯' },
  { path: '/exercise',      label: 'תיק תרגיל',   icon: '📁' },
  { path: '/quiz',          label: 'בוחן',        icon: '✏️' },
  { path: '/approvals',     label: 'אישורים',     icon: '✅' },
  { path: '/done',          label: 'מוכן',        icon: '🏁' },
]

export default function ProgressBar({ currentPath }) {
  const navigate    = useNavigate()
  const currentIdx  = STEPS.findIndex(s => s.path === currentPath)
  const activeRef    = useRef(null)

  // On narrow screens the bar overflows — auto-scroll the active step into view
  // instead of leaving it clipped off-screen (RTL row-reverse pushes step 1 off
  // the visual start with no way to know it's there).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [currentPath])

  return (
    // pr-14 on mobile: clears the fixed VoiceStatusOrb column at the top-right
    <div className="flex flex-row-reverse items-center justify-start md:justify-center gap-0 pl-4 pr-14 md:px-4 py-2 bg-demo-surface border-b border-demo-border overflow-x-auto">
      {STEPS.map((step, idx) => {
        const done   = idx < currentIdx
        const active = idx === currentIdx
        const future = idx > currentIdx

        return (
          <div key={step.path} className="flex items-center flex-shrink-0">
            {/* Connector */}
            {idx < STEPS.length - 1 && (
              <div className={`w-5 md:w-8 h-0.5 mb-5 mx-0.5 transition-all duration-500 flex-shrink-0
                ${idx < currentIdx ? 'bg-demo-success' : 'bg-demo-border'}`}
              />
            )}

            {/* Circle + label — קליקביל לניווט */}
            <button
              ref={active ? activeRef : null}
              onClick={() => navigate(step.path)}
              title={`עבור ל${step.label}`}
              className="flex flex-col items-center gap-1 group flex-shrink-0"
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                transition-all duration-300 group-hover:ring-2 group-hover:ring-demo-gold/60
                ${active  ? 'bg-demo-gold text-black ring-2 ring-demo-gold ring-offset-2 ring-offset-demo-surface shadow-lg shadow-demo-gold/30' : ''}
                ${done    ? 'bg-demo-success text-white' : ''}
                ${future  ? 'bg-demo-card text-gray-500 border border-demo-border group-hover:border-demo-gold/40' : ''}
              `}>
                {done ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap font-medium transition-colors
                ${active ? 'text-demo-gold' : done ? 'text-demo-success' : 'text-gray-500 group-hover:text-gray-300'}`}>
                {step.label}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

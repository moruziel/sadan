const STEPS = [
  { path: '/area',          label: 'שטח',        icon: '🗺️' },
  { path: '/questionnaire', label: 'שאלון',       icon: '📋' },
  { path: '/plans',         label: 'מתווים',      icon: '🎯' },
  { path: '/exercise',      label: 'תיק תרגיל',   icon: '📁' },
  { path: '/quiz',          label: 'בוחן',        icon: '✏️' },
  { path: '/approvals',     label: 'אישורים',     icon: '✅' },
  { path: '/done',          label: 'מוכן',        icon: '🏁' },
]

export default function ProgressBar({ currentPath }) {
  const currentIdx = STEPS.findIndex(s => s.path === currentPath)

  return (
    // flex-row-reverse — שלב 1 ימינה, שלב 7 שמאלה (RTL)
    <div className="flex flex-row-reverse items-center justify-center gap-0 px-4 py-2 bg-demo-surface border-b border-demo-border">
      {STEPS.map((step, idx) => {
        const done   = idx < currentIdx
        const active = idx === currentIdx
        const future = idx > currentIdx

        return (
          <div key={step.path} className="flex items-center">
            {/* Connector — מופיע אחרי ב-DOM = שמאל של הצעד */}
            {idx < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mb-5 mx-0.5 transition-all duration-500
                ${idx < currentIdx ? 'bg-demo-success' : 'bg-demo-border'}`}
              />
            )}

            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${active  ? 'bg-demo-gold text-black ring-2 ring-demo-gold ring-offset-2 ring-offset-demo-surface shadow-lg shadow-demo-gold/30' : ''}
                ${done    ? 'bg-demo-success text-white' : ''}
                ${future  ? 'bg-demo-card text-gray-500 border border-demo-border' : ''}
              `}>
                {done ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap font-medium transition-colors
                ${active ? 'text-demo-gold' : done ? 'text-demo-success' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

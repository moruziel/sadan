const FLOW_STEPS = [
  { key: 'initial',              label: 'התחלה' },
  { key: 'planning',             label: 'תכנון אימון' },
  { key: 'plan_selected',        label: 'תוכנית נבחרה' },
  { key: 'exercise_files_done',  label: 'תיקי תרגיל' },
  { key: 'coordination_sent',    label: 'תיאום' },
  { key: 'approved',             label: 'מאושר' },
]

const STEP_ORDER = FLOW_STEPS.map(s => s.key)

export default function Header({ flowStep }) {
  const currentIdx = STEP_ORDER.indexOf(flowStep)

  return (
    <header className="bg-idf-dark text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-idf-olive rounded-full flex items-center justify-center font-bold text-lg">
            ס
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">SADAN</h1>
            <p className="text-xs text-idf-tan opacity-80">מערכת תכנון אימונים</p>
          </div>
        </div>

        {/* Flow step indicator */}
        <div className="hidden md:flex items-center gap-1">
          {FLOW_STEPS.map((step, idx) => {
            const isDone    = idx < currentIdx
            const isCurrent = idx === currentIdx
            return (
              <div key={step.key} className="flex items-center gap-1">
                <div className={`
                  flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
                  ${isCurrent ? 'bg-idf-olive text-white' : ''}
                  ${isDone    ? 'bg-idf-green text-idf-tan' : ''}
                  ${!isCurrent && !isDone ? 'text-gray-400' : ''}
                `}>
                  {isDone && <span>✓</span>}
                  {step.label}
                </div>
                {idx < FLOW_STEPS.length - 1 && (
                  <span className="text-gray-600 text-xs">›</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </header>
  )
}

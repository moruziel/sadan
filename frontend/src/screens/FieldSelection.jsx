import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import Header from '../components/common/Header'

const OPTIONS = [
  {
    key: 'single',
    emoji: '📍',
    title: 'שטח מוקצה',
    subtitle: 'גולן — שטח 309ה',
    desc: 'עבור ישירות למפת השטח שהוקצה לגדוד שלך ותכנן את האימון.',
    badge: 'מוקצה לך',
    badgeColor: 'bg-demo-gold text-black',
    highlight: true,
  },
  {
    key: 'region',
    emoji: '🔍',
    title: 'בחירת שטח',
    subtitle: 'גזרה 251 — הגולן',
    desc: 'בחר שטח אש מתוך כל השטחים בגזרה, עם אפשרות לסנן לפי זמינות.',
    badge: null,
    highlight: false,
  },
]

export default function FieldSelection() {
  const navigate = useNavigate()

  function handleSelect(mode) {
    navigate('/area', { state: { mode } })
  }

  // SADAN voice: "בחר שטח מוקצה" → navigate to /area
  useEffect(() => {
    function onAction(e) {
      const { action } = e.detail ?? {}
      if (action === 'select_field') handleSelect('single')
    }
    window.addEventListener('sadan:action', onAction)
    return () => window.removeEventListener('sadan:action', onAction)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/area" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        {/* כותרת */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-white">בחירת שטח אש</h1>
          <p className="text-gray-400 text-base">איך תרצה לבחור את השטח?</p>
        </div>

        {/* כרטיסי בחירה — 2 אפשרויות */}
        <div className="flex gap-6 w-full max-w-2xl justify-center">
          {OPTIONS.map((opt, i) => (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              style={{ animationDelay: `${i * 80}ms` }}
              className={`
                relative flex flex-col items-center text-center gap-4 p-8 rounded-2xl border
                transition-all duration-200 hover:scale-105 hover:shadow-2xl group animate-fade-up
                flex-1 max-w-xs
                ${opt.highlight
                  ? 'bg-demo-gold/10 border-demo-gold/60 hover:bg-demo-gold/15'
                  : 'bg-demo-surface border-demo-border hover:border-demo-gold/40'
                }
              `}
            >
              {/* Badge */}
              {opt.badge && (
                <span className={`absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              )}

              {/* אייקון */}
              <div className={`
                w-20 h-20 rounded-2xl flex items-center justify-center text-4xl
                ${opt.highlight ? 'bg-demo-gold/20' : 'bg-demo-card'}
                group-hover:scale-110 transition-transform duration-200
              `}>
                {opt.emoji}
              </div>

              {/* טקסט */}
              <div className="space-y-1.5">
                <div className="text-white font-bold text-lg">{opt.title}</div>
                <div className={`text-sm font-medium ${opt.highlight ? 'text-demo-gold' : 'text-gray-400'}`}>
                  {opt.subtitle}
                </div>
                <div className="text-gray-500 text-xs leading-relaxed mt-2">
                  {opt.desc}
                </div>
              </div>

              {/* חץ */}
              <div className={`flex items-center gap-1 text-sm font-semibold
                ${opt.highlight ? 'text-demo-gold' : 'text-gray-500 group-hover:text-demo-gold'}
                transition-colors`}>
                <span>המשך</span>
                <ChevronLeft size={15} />
              </div>
            </button>
          ))}
        </div>

        <p className="text-gray-600 text-xs text-center max-w-md">
          סדן מנתחת את הנחיות המפקד, זמינות שטחים, ותקלות בטיחות ידועות — ומציגה המלצה מדויקת.
        </p>
      </div>
    </div>
  )
}

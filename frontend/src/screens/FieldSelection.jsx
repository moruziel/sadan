import { useNavigate } from 'react-router-dom'
import { MapPin, Search, Zap, ChevronLeft } from 'lucide-react'
import Header from '../components/common/Header'

const OPTIONS = [
  {
    key: 'region',
    icon: MapPin,
    emoji: '📍',
    title: 'מגזרה מוקצית',
    subtitle: 'גולן — אזור 251',
    desc: 'סדן מציגה את שטחי האש הזמינים בגזרה שלך, מדורגים לפי התאמה לאימון.',
    badge: 'מומלץ',
    badgeColor: 'bg-demo-gold text-black',
    highlight: true,
  },
  {
    key: 'free',
    icon: Search,
    emoji: '🔍',
    title: 'חיפוש חופשי',
    subtitle: 'לפי מטרות / אופי',
    desc: 'חפש שטח אש בכל הארץ לפי סוג תרגיל, יכולות נדרשות, או שם ספציפי.',
    badge: null,
    highlight: false,
  },
  {
    key: 'urgent',
    icon: Zap,
    emoji: '⚡',
    title: 'אימון דחוף',
    subtitle: 'מה פנוי עכשיו?',
    desc: 'הצג רק שטחים פנויים השבוע — מסודרים לפי קרבה ומוכנות מיידית.',
    badge: '3 פנויים',
    badgeColor: 'bg-green-500/20 text-green-400 border border-green-500/30',
    highlight: false,
  },
]

export default function FieldSelection() {
  const navigate = useNavigate()

  function handleSelect(mode) {
    navigate('/area', { state: { mode } })
  }

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/area" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        {/* כותרת */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-white">בחירת שטח אש</h1>
          <p className="text-gray-400 text-base">איך תרצה למצוא את השטח?</p>
        </div>

        {/* כרטיסי בחירה */}
        <div className="grid grid-cols-3 gap-5 w-full max-w-3xl">
          {OPTIONS.map((opt, i) => (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              style={{ animationDelay: `${i * 80}ms` }}
              className={`
                relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl border
                transition-all duration-200 hover:scale-105 hover:shadow-2xl group animate-fade-up
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
                w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
                ${opt.highlight ? 'bg-demo-gold/20' : 'bg-demo-card'}
                group-hover:scale-110 transition-transform duration-200
              `}>
                {opt.emoji}
              </div>

              {/* טקסט */}
              <div className="space-y-1">
                <div className="text-white font-bold text-base">{opt.title}</div>
                <div className={`text-sm font-medium ${opt.highlight ? 'text-demo-gold' : 'text-gray-400'}`}>
                  {opt.subtitle}
                </div>
                <div className="text-gray-500 text-xs leading-relaxed mt-2">
                  {opt.desc}
                </div>
              </div>

              {/* חץ */}
              <div className={`flex items-center gap-1 text-xs font-semibold
                ${opt.highlight ? 'text-demo-gold' : 'text-gray-500 group-hover:text-demo-gold'}
                transition-colors`}>
                <span>המשך</span>
                <ChevronLeft size={14} />
              </div>
            </button>
          ))}
        </div>

        {/* הסבר */}
        <p className="text-gray-600 text-xs text-center max-w-md">
          סדן מנתחת את הנחיות המפקד, זמינות שטחים, ותקלות בטיחות ידועות — ומציגה המלצה מדויקת.
        </p>
      </div>
    </div>
  )
}

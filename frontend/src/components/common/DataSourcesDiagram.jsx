/**
 * DataSourcesDiagram — modal showing 3 data-source categories flowing into SADAN.
 * Triggered by an "ℹ️ מקורות" button in Area, Plans, and Exercise screens.
 */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const CATEGORIES = [
  {
    id: 'idf',
    label: 'מערכות צה"ל',
    icon: '🛡️',
    color: 'border-blue-500/60 bg-blue-900/20',
    titleColor: 'text-blue-300',
    iconBg: 'bg-blue-500/20',
    dotColor: 'bg-blue-400',
    lineColor: '#3b82f6',
    items: [
      { icon: '🎯', text: 'קרקע בטוחה' },
      { icon: '📊', text: 'מאור' },
      { icon: '📡', text: 'חמ"ל ש"א' },
      { icon: '🗺️', text: 'מש"א' },
    ],
  },
  {
    id: 'rules',
    label: 'נהלים ופקודות',
    icon: '📋',
    color: 'border-violet-500/60 bg-violet-900/20',
    titleColor: 'text-violet-300',
    iconBg: 'bg-violet-500/20',
    dotColor: 'bg-violet-400',
    lineColor: '#8b5cf6',
    items: [
      { icon: '📄', text: "פק\"ל 210" },
      { icon: '📝', text: 'נוהל רטג' },
      { icon: '📝', text: 'נוהל הקראה' },
      { icon: '📚', text: "תו\"ל חי\"ר" },
    ],
  },
  {
    id: 'knowledge',
    label: 'ידע מצטבר',
    icon: '🧠',
    color: 'border-amber-500/60 bg-amber-900/20',
    titleColor: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    dotColor: 'bg-amber-400',
    lineColor: '#f59e0b',
    items: [
      { icon: '📖', text: 'היסטוריית תרגילים' },
      { icon: '💡', text: 'לקחים מופקים' },
      { icon: '⭐', text: 'ציוני שטחים' },
      { icon: '✅', text: 'המלצות קודמות' },
    ],
  },
]

export default function DataSourcesDiagram({ onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger fade-in after mount
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-250
        ${visible ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      <div
        className={`relative bg-demo-surface border border-demo-border rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4
          transition-all duration-250
          ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-demo-card transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-white font-bold text-xl">מקורות מידע — SADAN</h2>
          <p className="text-gray-500 text-sm mt-1">3 מקורות מוזינים לליבת הבינה המלאכותית</p>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat.id}
              className={`border rounded-xl p-4 ${cat.color}
                transition-all duration-300`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-8 h-8 rounded-lg ${cat.iconBg} flex items-center justify-center text-base`}>
                  {cat.icon}
                </span>
                <span className={`font-bold text-sm ${cat.titleColor}`}>{cat.label}</span>
              </div>
              <ul className="space-y-1.5">
                {cat.items.map(item => (
                  <li key={item.text} className="flex items-center gap-2 text-gray-300 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.dotColor}`} />
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Flow arrows SVG */}
        <div className="flex justify-center mb-4">
          <svg viewBox="0 0 400 60" className="w-full max-w-lg h-14" dir="ltr">
            {/* Three converging lines */}
            {/* Left (idf) → center */}
            <line x1="65" y1="0" x2="200" y2="55" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
            {/* Center (rules) → center */}
            <line x1="200" y1="0" x2="200" y2="55" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
            {/* Right (knowledge) → center */}
            <line x1="335" y1="0" x2="200" y2="55" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
            {/* Arrow head */}
            <polygon points="200,58 196,50 204,50" fill="#c6953b" />
          </svg>
        </div>

        {/* SADAN brain box */}
        <div className="flex justify-center">
          <div className="border-2 border-demo-gold/60 bg-demo-gold/10 rounded-2xl px-8 py-4 flex items-center gap-3 shadow-lg shadow-demo-gold/10">
            <div className="w-12 h-12 rounded-full bg-demo-gold flex items-center justify-center text-black text-xl font-black">
              ס
            </div>
            <div>
              <div className="text-demo-gold font-black text-lg tracking-widest">SADAN</div>
              <div className="text-gray-400 text-xs">מנוע תכנון ותיאום מבוסס AI</div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-gray-600 text-xs mt-4">
          כל הנתונים סינתטיים — המערכת לא מתחברת למערכות מבצעיות בשלב זה
        </p>
      </div>
    </div>
  )
}

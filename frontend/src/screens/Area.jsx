import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, AlertTriangle, Clock, Star, Layers, Users, ChevronLeft } from 'lucide-react'
import Header from '../components/common/Header'
import MapView from '../components/map/MapView'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import { AREA_309 } from '../data/mockData'

const LAYER_OPTIONS = [
  { key: 'hazards',       label: 'מפגעים',        icon: AlertTriangle },
  { key: 'infrastructure',label: 'תשתיות',         icon: MapPin },
  { key: 'neighbors',     label: 'כוחות שכנים',    icon: Users },
  { key: 'history',       label: 'היסטוריה',       icon: Clock },
]

export default function Area() {
  const navigate = useNavigate()
  const [layers, setLayers] = useState({ hazards: true, infrastructure: false, neighbors: false, history: false })

  function toggleLayer(key) {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/area" />

      <div className="flex flex-1 overflow-hidden">
        {/* פאנל ימין — בא ראשון ב-DOM כדי להופיע ימינה ב-RTL */}
        <div className="w-80 bg-white text-gray-800 flex flex-col overflow-y-auto shadow-2xl">
          {/* כותרת */}
          <div className="bg-demo-bg px-4 py-3 border-b border-demo-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-base">{AREA_309.name}</h2>
                <p className="text-gray-400 text-xs">{AREA_309.region}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-demo-gold">{AREA_309.score}</div>
                <div className="text-[10px] text-gray-400">ציון התאמה</div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-4">
            {/* יכולות */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">יכולות</h3>
              <ul className="space-y-1">
                {AREA_309.capabilities.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </section>

            {/* מפגעים */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">מפגעים</h3>
              <div className="space-y-1.5">
                {AREA_309.hazards.map(h => (
                  <div key={h.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <Badge color={h.severity === 'high' ? 'red' : h.severity === 'medium' ? 'orange' : 'gray'}>
                      {h.type}
                    </Badge>
                    <span className="text-xs text-gray-600">{h.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* היסטוריה */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">היסטוריה</h3>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">תרגיל אחרון</span>
                  <span className="font-semibold">{AREA_309.history.lastExercise}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">יחידה</span>
                  <span className="font-semibold">{AREA_309.history.lastUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ציון</span>
                  <span className="font-semibold text-green-600">{AREA_309.history.lastScore}</span>
                </div>
                <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5 text-xs text-orange-700">
                  ⚠️ {AREA_309.history.weakness}
                </div>
              </div>
            </section>
          </div>

          {/* כפתור המשך */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => navigate('/questionnaire')}
              className="w-full py-3 bg-gradient-to-l from-demo-gold to-yellow-500 text-black font-bold rounded-xl
                hover:opacity-90 transition-all shadow-lg text-sm flex items-center justify-center gap-2"
            >
              <span>תכנון תרגיל</span>
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* מפה — בא שני ב-DOM, מופיע שמאלה ב-RTL */}
        <div className="flex-1 relative min-h-0">
          <MapView layers={layers} />

          {/* Layer toggles — על המפה, צמוד לפאנל (ימין המפה = שמאל פיזי) */}
          <div className="absolute top-3 left-14 z-10 flex flex-col gap-1.5">
            {LAYER_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md
                  ${layers[key]
                    ? 'bg-demo-gold text-black'
                    : 'bg-demo-surface/90 text-gray-300 border border-demo-border backdrop-blur-sm'
                  }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

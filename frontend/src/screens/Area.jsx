import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  MapPin, AlertTriangle, Clock, Star, Layers, Users,
  ChevronLeft, Target, Calendar, Info,
} from 'lucide-react'
import Header from '../components/common/Header'
import MapView from '../components/map/MapView'
import RegionMapView from '../components/map/RegionMapView'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import DataSourcesDiagram from '../components/common/DataSourcesDiagram'
import { AREA_309 } from '../data/mockData'
import { DEMO_FIELDS_251 } from '../data/region251.js'

const LAYER_OPTIONS = [
  { key: 'forces',        label: 'כוחות ומטרות',  icon: Target },
  { key: 'hazards',       label: 'מפגעים',        icon: AlertTriangle },
  { key: 'infrastructure',label: 'תשתיות',         icon: MapPin },
  { key: 'neighbors',     label: 'כוחות שכנים',    icon: Users },
  { key: 'history',       label: 'היסטוריה',       icon: Clock },
]

// ── Single field info panel ───────────────────────────────
function FieldInfoPanel({ field, onContinue, showCalendar = false }) {
  const isArea309 = field.id === '309h' || !field.code
  return (
    <>
      {/* כותרת */}
      <div className="bg-demo-bg px-4 py-3 border-b border-demo-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">{field.name}</h2>
            <p className="text-gray-400 text-xs">{field.region}</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-demo-gold">{field.score}</div>
            <div className="text-[11px] text-gray-400">ציון התאמה</div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* זמינות */}
        <section>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
            ${field.available
              ? 'bg-green-900/20 border border-green-500/30 text-green-400'
              : 'bg-red-900/20 border border-red-500/30 text-red-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full inline-block ${field.available ? 'bg-green-400' : 'bg-red-400'}`} />
            {field.available ? 'זמין לאימון' : `תפוס עד ${field.availableDate || '—'}`}
          </div>
        </section>

        {/* יכולות */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">יכולות</h3>
          <ul className="space-y-1">
            {field.capabilities.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </section>

        {/* מפגעים */}
        {field.hazards?.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">מפגעים</h3>
            <div className="space-y-1.5">
              {field.hazards.map((h, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Badge color={h.severity === 'high' ? 'red' : h.severity === 'medium' ? 'orange' : 'gray'}>
                    {h.type}
                  </Badge>
                  <span className="text-xs text-gray-600">{h.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* תשתיות (רק אם קיים) */}
        {field.infrastructure?.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">תשתיות</h3>
            <div className="space-y-1">
              {field.infrastructure.map((inf, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span>{inf.icon}</span>
                  <span>{inf.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* היסטוריה */}
        {field.history && (
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">היסטוריה</h3>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">תרגיל אחרון</span>
                <span className="font-semibold">{field.history.lastExercise}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">יחידה</span>
                <span className="font-semibold">{field.history.lastUnit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ציון</span>
                <span className="font-semibold text-green-600">{field.history.lastScore}</span>
              </div>
              {field.history.weakness && (
                <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5 text-xs text-orange-700">
                  ⚠️ {field.history.weakness}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* כפתורי פעולה */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {showCalendar && (
          <button
            onClick={() => onContinue('calendar')}
            className="w-full py-2.5 bg-demo-surface border border-demo-border text-demo-gold font-semibold rounded-xl
              hover:border-demo-gold/60 transition-all text-sm flex items-center justify-center gap-2"
          >
            <Calendar size={16} />
            <span>בדוק זמינות תאריכים</span>
          </button>
        )}
        <button
          onClick={() => onContinue('questionnaire')}
          disabled={!field.available}
          className="w-full py-3 bg-gradient-to-l from-demo-gold to-yellow-500 text-black font-bold rounded-xl
            hover:opacity-90 transition-all shadow-lg text-sm flex items-center justify-center gap-2
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>תכנון תרגיל</span>
          <ChevronLeft size={18} />
        </button>
      </div>
    </>
  )
}

// ── Region selector panel (before a field is chosen) ─────
function RegionSelectorPanel({ mode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
      <div className="text-center space-y-2">
        <div className="text-4xl">📍</div>
        <h2 className="text-white font-bold text-base">
          {mode === 'urgent' ? 'שטחים פנויים — לחץ לבחירה' : 'בחר שטח מהמפה'}
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          {mode === 'free'
            ? 'לחץ על אחד מסמלי השטחים על המפה לצפייה בפרטים'
            : 'סדן מציגה את שטחי האש המתאימים ביותר לגזרה שלך — מדורגים לפי ציון התאמה.'
          }
        </p>
      </div>

      {/* רשימה מהירה */}
      <div className="w-full space-y-2 mt-4">
        {DEMO_FIELDS_251.map(f => (
          <div key={f.id}
            className="flex items-center justify-between px-3 py-2 bg-demo-surface rounded-xl border border-demo-border text-sm"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full inline-block ${f.available ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-white font-medium">{f.code}</span>
              {f.recommended && (
                <span className="bg-demo-gold/20 text-demo-gold text-[11px] px-1.5 py-0.5 rounded-full font-bold">★</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span>{f.region}</span>
              <span className="font-bold text-demo-gold">{f.score}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl px-3 py-2 text-xs text-blue-300 text-center">
        ℹ️ דו"ח נפלים חייב להיות מוגש עד יום ה׳ 17:00 — אחרת האימון ייחסם.
      </div>
    </div>
  )
}

// ── Main Area component ───────────────────────────────────
export default function Area() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const mode        = location.state?.mode || 'single'

  const [layers, setLayers]           = useState({ forces: true, hazards: true, infrastructure: false, neighbors: false, history: false })
  const [selectedField, setSelectedField] = useState(null)
  const [showDiagram, setShowDiagram]     = useState(false)

  function toggleLayer(key) {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleContinue(dest) {
    if (dest === 'calendar') {
      navigate('/calendar', { state: { fieldId: selectedField?.id } })
    } else {
      navigate('/questionnaire')
    }
  }

  // ── Single-field mode (legacy) ─────────────────────────
  if (mode === 'single') {
    return (
      <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
        <Header currentPath="/area" />
        {showDiagram && <DataSourcesDiagram onClose={() => setShowDiagram(false)} />}
        <div className="flex flex-1 overflow-hidden">
          {/* פאנל ימין */}
          <div className="w-80 bg-white text-gray-800 flex flex-col overflow-y-auto shadow-2xl">
            <FieldInfoPanel
              field={{
                ...AREA_309,
                available: true,
                capabilities: AREA_309.capabilities,
                hazards: AREA_309.hazards,
                infrastructure: AREA_309.infrastructure,
                history: AREA_309.history,
              }}
              onContinue={handleContinue}
              showCalendar
            />
          </div>

          {/* מפה */}
          <div className="flex-1 relative min-h-0">
            <MapView layers={layers} />
            <div className="absolute top-28 left-3 z-10 flex flex-col gap-1.5">
              {/* מקורות מידע */}
              <button
                onClick={() => setShowDiagram(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md bg-demo-surface/90 text-gray-300 border border-demo-border backdrop-blur-sm hover:text-demo-gold hover:border-demo-gold/40"
              >
                <Info size={13} />
                מקורות
              </button>
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

  // ── Region/free/urgent mode ────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/area" />
      {showDiagram && <DataSourcesDiagram onClose={() => setShowDiagram(false)} />}
      <div className="flex flex-1 overflow-hidden">

        {/* פאנל ימין */}
        <div className="w-80 bg-white text-gray-800 flex flex-col overflow-hidden shadow-2xl">
          {selectedField ? (
            <FieldInfoPanel
              field={selectedField}
              onContinue={handleContinue}
              showCalendar
            />
          ) : (
            <RegionSelectorPanel mode={mode} />
          )}
        </div>

        {/* מפת גזרה */}
        <div className="flex-1 relative min-h-0">
          <RegionMapView
            mode={mode}
            selectedFieldId={selectedField?.id}
            onFieldSelect={field => setSelectedField(field)}
          />
          {/* מקורות מידע */}
          <button
            onClick={() => setShowDiagram(true)}
            className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md bg-demo-surface/90 text-gray-300 border border-demo-border backdrop-blur-sm hover:text-demo-gold hover:border-demo-gold/40"
          >
            <Info size={13} />
            מקורות
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo, useEffect } from 'react'
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
  { key: 'forces',        label: 'כוחות',     icon: Target },
  { key: 'hazards',       label: 'מפגעים',    icon: AlertTriangle },
  { key: 'infrastructure',label: 'תשתיות',    icon: MapPin },
  { key: 'neighbors',     label: 'שכנים',     icon: Users },
  { key: 'history',       label: 'היסטוריה',  icon: Clock },
  { key: 'natbam',        label: 'נת"ב',      icon: AlertTriangle },
]

// ── Single field info panel ───────────────────────────────
function FieldInfoPanel({ field, onContinue, showCalendar = false, onDeselect = null }) {
  const isArea309 = field.id === '309h' || !field.code
  return (
    <>
      {/* כותרת */}
      <div className="bg-demo-bg px-4 py-3 border-b border-demo-border">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-base truncate">{field.name}</h2>
            <p className="text-gray-400 text-xs">{field.region}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <div className="text-2xl font-black text-demo-gold">{field.score}</div>
              <div className="text-[11px] text-gray-400">ציון התאמה</div>
            </div>
            {onDeselect && (
              <button
                onClick={onDeselect}
                className="text-xs text-gray-500 hover:text-demo-gold border border-demo-border hover:border-demo-gold/40 px-2 py-1 rounded-lg transition-all"
                title="שנה שטח"
              >
                שנה
              </button>
            )}
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
function RegionSelectorPanel({ mode, onFieldSelect, onlyAvailable, onToggleAvailable }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let fields = DEMO_FIELDS_251
    if (onlyAvailable) fields = fields.filter(f => f.available)
    const q = query.trim().toLowerCase()
    if (!q) return fields
    return fields.filter(f =>
      f.code?.toLowerCase().includes(q) ||
      f.name?.toLowerCase().includes(q) ||
      f.region?.toLowerCase().includes(q)
    )
  }, [query, onlyAvailable])

  function handleKey(e) {
    if (e.key !== 'Enter') return
    if (filtered.length > 0 && onFieldSelect) {
      onFieldSelect(filtered[0])
      setQuery('')
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto">
      <div className="text-center space-y-1 pt-2">
        <div className="text-3xl">📍</div>
        <h2 className="text-white font-bold text-sm">בחר שטח</h2>
      </div>

      {/* חיפוש */}
      <div className="flex items-center gap-2 bg-demo-surface border border-demo-border rounded-xl px-3 py-2">
        <span className="text-gray-500 text-sm flex-shrink-0">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="חפש שטח... Enter לבחירה"
          className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-600 text-right"
          dir="rtl"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-gray-500 hover:text-white text-xs flex-shrink-0"
          >✕</button>
        )}
      </div>

      {/* פילטר זמינות */}
      <button
        onClick={onToggleAvailable}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all
          ${onlyAvailable
            ? 'bg-green-950/60 border-green-800/60 text-green-600'
            : 'bg-demo-surface border-demo-border text-gray-400 hover:border-demo-gold/40'
          }`}
      >
        <span>{onlyAvailable ? '✓ מציג זמינים בלבד' : 'הכל (כולל תפוסים)'}</span>
        <span className={`w-8 h-4 rounded-full relative transition-all ${onlyAvailable ? 'bg-green-500' : 'bg-demo-border'}`}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${onlyAvailable ? 'right-0.5' : 'left-0.5'}`} />
        </span>
      </button>

      {/* רשימה קליקבילית */}
      <div className="w-full space-y-1.5">
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 text-xs py-4">לא נמצאו שטחים</p>
        )}
        {filtered.map(f => (
          <button
            key={f.id}
            onClick={() => onFieldSelect && onFieldSelect(f)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-demo-surface rounded-xl border border-demo-border text-sm hover:border-demo-gold/50 hover:bg-demo-card transition-all text-right"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${f.available ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-white font-medium">{f.code}</span>
              {f.recommended && (
                <span className="bg-demo-gold/20 text-demo-gold text-[11px] px-1.5 py-0.5 rounded-full font-bold">★</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span>{f.region}</span>
              <span className="font-bold text-demo-gold">{f.score}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl px-3 py-2 text-xs text-blue-300 text-center">
        ℹ️ דו"ח נפלים — הגשה עד יום ה׳ 17:00
      </div>
    </div>
  )
}

// ── Main Area component ───────────────────────────────────
export default function Area() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const mode        = location.state?.mode || 'single'

  const [layers, setLayers]           = useState({ forces: true, hazards: true, infrastructure: false, neighbors: false, history: false, natbam: false })
  const [selectedField, setSelectedField] = useState(null)
  const [showDiagram, setShowDiagram]     = useState(false)
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  // ── SADAN voice: show/hide layer ─────────────────────────
  useEffect(() => {
    const handle = (e) => {
      const { layer, visible } = e.detail
      if (layer in { forces:1, hazards:1, infrastructure:1, neighbors:1, history:1 }) {
        setLayers(prev => ({ ...prev, [layer]: visible }))
      }
    }
    window.addEventListener('sadan:show_layer', handle)
    return () => window.removeEventListener('sadan:show_layer', handle)
  }, [])

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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    bg-black/40 backdrop-blur-sm
                    ${layers[key]
                      ? `border-2 ${key === 'natbam' ? 'border-red-400 text-red-300' : 'border-demo-gold text-demo-gold'}`
                      : 'border border-white/20 text-gray-400'
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
            <RegionSelectorPanel
              mode={mode}
              onFieldSelect={setSelectedField}
              onlyAvailable={onlyAvailable}
              onToggleAvailable={() => setOnlyAvailable(v => !v)}
            />
          )}
        </div>

        {/* מפת גזרה */}
        <div className="flex-1 relative min-h-0">
          <RegionMapView
            mode={mode}
            layers={layers}
            selectedFieldId={selectedField?.id}
            onFieldSelect={field => setSelectedField(field)}
          />
          {/* שכבות מידע + מקורות — שמאל, מתחת ל-NavigationControl */}
          <div className="absolute top-28 left-3 z-10 flex flex-col gap-1.5">
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

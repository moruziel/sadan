// Simulation.jsx — סימולציה טקטית משופרת
// S01: pulsing active units | S02: phase title card | S04: trail lines | S05: fire lines
// S06: HUD panel | S07: explosion on objectives | S08: direction arrows | S09: TTS
// S11: fog of war | S12: phase summary | S13: fire sector cones
// S14: helicopter medevac | S15: tank fire effect | S17: cinematic camera
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Crosshair, Volume2, VolumeX, Radio } from 'lucide-react'
import { AREA_309 } from '../data/mockData'
import { SIM_UNITS, SIM_PHASES } from '../data/simulationData'
import useSimulation from '../hooks/useSimulation'

// ── map base style ────────────────────────────────────────────────────────────
const MAP_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256, attribution: '© OpenStreetMap Contributors', maxzoom: 19,
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
}

// ── which units are "active" (fire/assault) per phase ────────────────────────
const ACTIVE_UNITS = {
  0: [],
  1: ['kitaA', 'kitaB', 'kitaG', 'mm'],
  2: [],
  3: ['kitaB'],
  4: ['kitaA', 'kitaG'],
  5: ['kitaG'],
  6: ['kitaA', 'kitaB'],
  7: ['kitaA', 'kitaB', 'kitaG', 'mm'],
}

// ── unit status text per phase ────────────────────────────────────────────────
const UNIT_STATUS = {
  0: { kitaA: 'כינוס', kitaB: 'כינוס', kitaG: 'כינוס', mm: 'תדריך' },
  1: { kitaA: 'תנועה', kitaB: 'תנועה', kitaG: 'תנועה', mm: 'תנועה' },
  2: { kitaA: 'ביסוס', kitaB: 'ביסוס', kitaG: 'ביסוס', mm: 'ביסוס' },
  3: { kitaA: 'מתקדם', kitaB: '🔥 ירי ברתק', kitaG: 'מתקדם', mm: 'מפקד' },
  4: { kitaA: '⚔️ הסתערות', kitaB: '🔥 כיסוי', kitaG: '⚔️ הסתערות', mm: 'מפקד' },
  5: { kitaA: 'ביסוס', kitaB: 'מתכונן', kitaG: '🔥 ירי ברתק', mm: 'מפקד' },
  6: { kitaA: '⚔️ הסתערות', kitaB: '⚔️ הסתערות', kitaG: '🔥 כיסוי', mm: 'מפקד' },
  7: { kitaA: 'נסיגה', kitaB: 'נסיגה', kitaG: 'נסיגה', mm: 'נסיגה' },
}

// ── fire lines per phase (from → to + unit color) ────────────────────────────
const FIRE_LINES_DATA = {
  3: [{ from: [35.228, 31.820], to: [35.228, 31.837], color: '#60a5fa', width: 2.5 }],
  4: [{ from: [35.228, 31.820], to: [35.228, 31.837], color: '#60a5fa', width: 2.5 }],
  5: [{ from: [35.245, 31.836], to: [35.240, 31.842], color: '#93c5fd', width: 2.5 }],
  6: [
    { from: [35.228, 31.820], to: [35.228, 31.837], color: '#60a5fa', width: 2 },
    { from: [35.245, 31.836], to: [35.240, 31.842], color: '#93c5fd', width: 2.5 },
  ],
}

// ── objectives that get "captured" at certain phases ─────────────────────────
const CAPTURE_AT = { 4: 'יעד א׳', 6: 'יעד ב׳' }

// ── phases with fog-of-war lifting ───────────────────────────────────────────
const FOG_LIFT = { 4: 'א.ה. א׳', 6: 'א.ה. ב׳' }

// ── tactical summaries for phase card (S12) ──────────────────────────────────
const PHASE_TACTICAL = [
  { title: 'כינוס ותדריך', details: ['30 לוחמים | 4 כיתות', 'תחמושת: 5.56 × 120', 'ק.ב.: H-4 | אישור: סרן בטיחות'], icon: '📋' },
  { title: 'תנועה לאזור ביסוס', details: ['מרחק: 2.4 ק"מ', 'ציר: נמר | 45 דקות', 'נ.ד. 1 → נ.ד. 2'], icon: '🚶' },
  { title: 'ביסוס וחלוקה', details: ['כיתה ב׳ → עמדת ירי א׳', 'כיתות א׳+ג׳ → ציר המשך', 'בדיקת קשר: 46.500 MHz'], icon: '🗺️' },
  { title: 'כיסוי ברתק', details: ['כיתה ב׳: אזימוט 010°', 'גבולות: 355°–025°', 'מטרה: יעד א׳ — בטונדה מערבית'], icon: '🔥' },
  { title: 'הסתערות יעד א׳', details: ['כיתות א׳+ג׳ מסתערות', 'ביטול ירי: "נמר-72 חדל"', 'זמן שהייה: ≤ 3 דקות'], icon: '⚔️' },
  { title: 'מעבר ליעד ב׳', details: ['כיתה ג׳ → עמדת ירי ב׳', 'כיתות א׳+ב׳ מתארגנות', 'פינוי נפגעים — אם קיים'], icon: '↗️' },
  { title: 'כיבוש יעד ב׳', details: ['כיתות א׳+ב׳ מסתערות', 'כיתה ג׳ כיסוי: 000°–030°', 'מטרה: בטונדה מרכזית'], icon: '🏁' },
  { title: 'ביסוס ונסיגה', details: ['תחקיר ביניים בשטח', 'סדר נסיגה הפוך לכניסה', 'נ.כ. → תחקיר סיום'], icon: '🔙' },
]

// ── geo helper: destination point ────────────────────────────────────────────
function destPoint([lng, lat], bearingDeg, km) {
  const R = 6371
  const d = km / R
  const φ1 = lat * Math.PI / 180
  const λ1 = lng * Math.PI / 180
  const θ = bearingDeg * Math.PI / 180
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(θ))
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2))
  return [λ2 * 180 / Math.PI, φ2 * 180 / Math.PI]
}

// bearing (degrees) from point A → point B
function calcBearing([lng1, lat1], [lng2, lat2]) {
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// Generate fire sector cone polygon
function fireCone(origin, leftBearing, rightBearing, distKm = 0.8) {
  const steps = 14
  let span = rightBearing - leftBearing
  if (span < 0) span += 360
  const pts = [origin]
  for (let i = 0; i <= steps; i++) {
    const b = (leftBearing + (span * i) / steps) % 360
    pts.push(destPoint(origin, b, distKm))
  }
  pts.push(origin)
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] }, properties: {} }
}

// ── fire sector cone GeoJSON (shown when covering) ───────────────────────────
const FIRE_CONES_DATA = {
  3: [
    fireCone([35.228, 31.820], 355, 25, 0.8),  // kitaB → יעד א׳
  ],
  4: [
    fireCone([35.228, 31.820], 355, 25, 0.8),
  ],
  5: [
    fireCone([35.245, 31.836], 0, 30, 0.7),    // kitaG → יעד ב׳
  ],
  6: [
    fireCone([35.228, 31.820], 355, 25, 0.8),
    fireCone([35.245, 31.836], 0, 30, 0.7),
  ],
}

// ── unit marker element ───────────────────────────────────────────────────────
function createUnitEl(unit) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:relative;z-index:100;transition:transform 2.2s cubic-bezier(0.4,0,0.2,1);'

  // direction arrow
  const arrow = document.createElement('div')
  arrow.id = `sim-arrow-${unit.id}`
  arrow.style.cssText = [
    'position:absolute', 'top:-13px', 'left:50%',
    'transform:translateX(-50%) rotate(0deg)',
    'width:0', 'height:0',
    'border-left:5px solid transparent', 'border-right:5px solid transparent',
    `border-bottom:11px solid ${unit.color}`,
    'opacity:0.7',
    'transition:transform 1.8s ease',
    'pointer-events:none',
  ].join(';')
  wrap.appendChild(arrow)

  const el = document.createElement('div')
  el.id = `sim-unit-${unit.id}`
  el.style.cssText = [
    'width:34px', 'height:34px',
    'display:flex', 'align-items:center', 'justify-content:center',
    `border:2.5px solid ${unit.color}`, 'border-radius:4px',
    `background:${unit.color}25`, `color:${unit.color}`,
    'font-size:13px', 'font-weight:900',
    `box-shadow:0 0 14px ${unit.color}70,0 2px 6px rgba(0,0,0,0.7)`,
    'cursor:pointer', 'user-select:none', 'backdrop-filter:blur(2px)',
    'transition:border-color 0.5s,box-shadow 0.5s',
  ].join(';')
  // store base colors for pulse
  el.dataset.baseColor = unit.color
  el.style.setProperty('--bs-normal', `0 0 14px ${unit.color}70,0 2px 6px rgba(0,0,0,0.7)`)
  el.style.setProperty('--bs-pulse',  `0 0 30px ${unit.color},0 0 55px ${unit.color}66,0 2px 6px rgba(0,0,0,0.7)`)
  el.textContent = unit.icon

  const lbl = document.createElement('div')
  lbl.style.cssText = [
    'position:absolute', 'bottom:-17px', 'left:50%',
    'transform:translateX(-50%)',
    `color:${unit.color}`, 'font-size:9px', 'font-weight:700',
    'white-space:nowrap', 'text-shadow:0 1px 4px #000,0 0 8px #000',
    'background:rgba(0,0,0,0.75)', 'padding:1px 5px', 'border-radius:3px',
    'pointer-events:none',
  ].join(';')
  lbl.textContent = unit.label

  wrap.appendChild(el)
  wrap.appendChild(lbl)
  return { wrap, el, arrow }
}

// ── HUD Panel ─────────────────────────────────────────────────────────────────
function HUDPanel({ phase, visible, onToggle }) {
  if (!visible) return null
  const statuses = UNIT_STATUS[phase] ?? {}
  return (
    <div className="absolute top-4 right-4 z-30 bg-demo-surface/95 border border-demo-border rounded-xl p-3 w-60 backdrop-blur" dir="rtl">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Radio size={12} className="text-demo-gold" />
          <span className="text-demo-gold font-bold text-xs">מצב כוח — {SIM_PHASES[phase].time}</span>
        </div>
        <button onClick={onToggle} className="text-gray-500 hover:text-white text-base leading-none">×</button>
      </div>
      <div className="space-y-2">
        {Object.entries(SIM_UNITS).map(([id, unit]) => (
          <div key={id} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ border: `2px solid ${unit.color}`, color: unit.color, background: `${unit.color}20` }}
            >
              {unit.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs font-bold">{unit.callsign}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  (statuses[id] ?? '').includes('הסתערות') ? 'bg-red-500/20 text-red-300' :
                  (statuses[id] ?? '').includes('ירי')     ? 'bg-blue-500/20 text-blue-300' :
                  (statuses[id] ?? '').includes('תנועה')   ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-700/50 text-gray-400'
                }`}>
                  {statuses[id] ?? '—'}
                </span>
              </div>
              <div className="text-[9px] text-gray-500">{unit.commander}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Phase title card (S02) ────────────────────────────────────────────────────
function PhaseTitleCard({ phase, visible }) {
  if (!visible) return null
  const data = SIM_PHASES[phase]
  const tact = PHASE_TACTICAL[phase]
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
      style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)', position: 'absolute', width: '100%', height: '100%' }}
    >
      <div
        className="bg-demo-surface/95 border border-demo-gold/40 rounded-2xl px-8 py-5 text-center backdrop-blur max-w-sm w-full mx-4"
        style={{ animation: 'phaseCardIn 3s ease-in-out forwards' }}
        dir="rtl"
      >
        <div className="text-4xl mb-2">{tact?.icon ?? '⚡'}</div>
        <div className="text-demo-gold font-black text-xl mb-1">{data.longLabel}</div>
        <div className="text-gray-300 text-sm mb-3">{data.time}</div>
        {tact?.details && (
          <div className="space-y-1 border-t border-demo-border pt-3">
            {tact.details.map((d, i) => (
              <div key={i} className="text-gray-300 text-xs">{d}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Phase bar ─────────────────────────────────────────────────────────────────
function PhaseBar({ phase, onGoto }) {
  return (
    <div className="flex items-center gap-1 flex-1 justify-center">
      {SIM_PHASES.map((p, i) => (
        <button
          key={i}
          onClick={() => onGoto(i)}
          title={p.longLabel}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded transition-all ${
            i === phase ? 'bg-demo-gold/20 border border-demo-gold/60'
            : i < phase ? 'opacity-60' : 'opacity-30'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${
            i < phase   ? 'bg-demo-gold' :
            i === phase ? 'bg-demo-gold animate-pulse' : 'bg-gray-600'
          }`} />
          <span className={`text-[9px] font-bold ${i === phase ? 'text-demo-gold' : 'text-gray-500'}`}>
            {p.label}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── main screen ───────────────────────────────────────────────────────────────
export default function Simulation() {
  const navigate   = useNavigate()
  const mapElRef   = useRef(null)
  const mapRef     = useRef(null)
  const markersRef = useRef({})   // { kitaA: { marker, el, arrow }, ... }
  const trailsRef  = useRef({ kitaA: [], kitaB: [], kitaG: [], mm: [] })
  const objElemsRef = useRef({})  // { 'יעד א׳': domEl, ... }
  const heliRef    = useRef(null) // helicopter marker
  const heliTimer  = useRef(null) // helicopter interval
  const tankRef    = useRef(null) // tank marker
  const rafRef     = useRef(null) // rAF for fire line animation
  const cinRef     = useRef(null) // cinematic camera interval
  const capturedRef = useRef(new Set())

  const [mapReady, setMapReady] = useState(false)
  const [unitInfo, setUnitInfo] = useState(null)
  const [hudVisible, setHudVisible] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [cardPhase, setCardPhase] = useState(0)

  const sim = useSimulation()
  const { phase, playing, currentData, total, togglePlay, nextPhase, prevPhase, gotoPhase, pause } = sim

  // ── init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapElRef.current,
      style: MAP_STYLE,
      center: SIM_PHASES[0].camera.center,
      zoom: SIM_PHASES[0].camera.zoom,
      bearing: SIM_PHASES[0].camera.bearing,
      pitch: SIM_PHASES[0].camera.pitch,
      dragRotate: true, pitchWithRotate: true, maxPitch: 80,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-left')

    map.on('load', () => {
      // terrain
      map.addSource('terrain', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium', tileSize: 256, maxzoom: 14,
      })
      map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'terrain',
        paint: { 'hillshade-exaggeration': 0.35 } })

      // tactical GeoJSON
      map.addSource('sim-area', { type: 'geojson', data: AREA_309.geojson })
      map.addLayer({ id: 'sim-boundary', type: 'fill', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'boundary'],
        paint: { 'fill-color': '#c6953b', 'fill-opacity': 0.06 } })
      map.addLayer({ id: 'sim-boundary-line', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'boundary'],
        paint: { 'line-color': '#c6953b', 'line-width': 2, 'line-dasharray': [5, 3] } })
      map.addLayer({ id: 'sim-hazard-fill', type: 'fill', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'hazard_zone'],
        paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'sim-hazard-line', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'hazard_zone'],
        paint: { 'line-color': '#22c55e', 'line-width': 1.5, 'line-dasharray': [3, 2] } })
      map.addLayer({ id: 'sim-powerline', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'powerline'],
        paint: { 'line-color': '#fbbf24', 'line-width': 2.5, 'line-dasharray': [8, 3] } })
      map.addLayer({ id: 'sim-neighbor-fill', type: 'fill', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'neighbor_zone'],
        paint: { 'fill-color': '#a855f7', 'fill-opacity': 0.1 } })
      map.addLayer({ id: 'sim-neighbor-line', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'neighbor_zone'],
        paint: { 'line-color': '#a855f7', 'line-width': 2 } })
      map.addLayer({ id: 'sim-sector', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'sector_boundary'],
        paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [8, 4], 'line-opacity': 0.7 } })
      map.addLayer({ id: 'sim-assault-fill', type: 'fill', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'assault_area'],
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'sim-assault-line', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'assault_area'],
        paint: { 'line-color': '#ef4444', 'line-width': 1.5, 'line-dasharray': [4, 2] } })
      map.addLayer({ id: 'sim-axis', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'axis'],
        paint: { 'line-color': '#c6953b', 'line-width': 3, 'line-dasharray': [5, 3], 'line-opacity': 0.7 } })
      map.addLayer({ id: 'sim-route', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'clearance_route'],
        paint: { 'line-color': '#22c55e', 'line-width': 2.5, 'line-dasharray': [2, 4], 'line-opacity': 0.85 } })

      // ── trail lines source ──
      map.addSource('sim-trails', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({ id: 'sim-trail-lines', type: 'line', source: 'sim-trails',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.45,
          'line-dasharray': [3, 5],
        },
      })

      // ── fire lines source ──
      map.addSource('sim-fire', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({ id: 'sim-fire-lines', type: 'line', source: 'sim-fire',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': 0.85,
          'line-dasharray': [3, 2],
        },
      })

      // ── fire sector cones source ──
      map.addSource('sim-cones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({ id: 'sim-cone-fill', type: 'fill', source: 'sim-cones',
        paint: { 'fill-color': '#60a5fa', 'fill-opacity': 0.08 } })
      map.addLayer({ id: 'sim-cone-line', type: 'line', source: 'sim-cones',
        paint: { 'line-color': '#60a5fa', 'line-width': 1, 'line-opacity': 0.4, 'line-dasharray': [4, 4] } })

      // ── fog of war source ──
      map.addSource('sim-fog', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({ id: 'sim-fog-fill', type: 'fill', source: 'sim-fog',
        paint: { 'fill-color': '#1f2937', 'fill-opacity': 0.5 } })

      // static markers: reporting points
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'reporting_point') return
        if (feat.geometry.type !== 'Point') return
        const el = document.createElement('div')
        el.style.cssText = 'width:22px;height:22px;display:flex;align-items:center;justify-content:center;border:2px solid #3b82f6;border-radius:50%;background:rgba(59,130,246,0.2);color:#93c5fd;font-size:9px;font-weight:900;box-shadow:0 0 8px rgba(59,130,246,0.5);'
        el.textContent = feat.properties.label.replace('נ.ד. ', '')
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(feat.geometry.coordinates).addTo(map)
      })

      // SBF positions
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'sbf_position') return
        if (feat.geometry.type !== 'Point') return
        const el = document.createElement('div')
        el.style.cssText = 'width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:2px solid #f97316;border-radius:4px;background:rgba(249,115,22,0.2);color:#fdba74;font-size:11px;font-weight:900;box-shadow:0 0 8px rgba(249,115,22,0.5);position:relative;'
        el.textContent = '🔫'
        const lbl = document.createElement('div')
        lbl.style.cssText = 'position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);color:#fdba74;font-size:8px;font-weight:700;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none;'
        lbl.textContent = feat.properties.label
        el.appendChild(lbl)
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(feat.geometry.coordinates).addTo(map)
      })

      // enemy objective markers
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'objective') return
        if (feat.geometry.type !== 'Point') return
        const el = document.createElement('div')
        el.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:2.5px solid #ef4444;border-radius:4px;background:rgba(239,68,68,0.2);color:#ef4444;font-size:15px;font-weight:900;box-shadow:0 0 14px rgba(239,68,68,0.55);animation:objPulse 2s ease-in-out infinite;position:relative;'
        el.textContent = '✕'
        el.id = `sim-obj-${feat.properties.label}`
        const lbl = document.createElement('div')
        lbl.style.cssText = 'position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);color:#fca5a5;font-size:9px;font-weight:700;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none;background:rgba(0,0,0,0.7);padding:1px 4px;border-radius:3px;'
        lbl.textContent = feat.properties.label
        el.appendChild(lbl)
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(feat.geometry.coordinates).addTo(map)
        objElemsRef.current[feat.properties.label] = el
      })

      // safety hazards
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'safety_hazard') return
        if (feat.geometry.type !== 'Point') return
        const el = document.createElement('div')
        el.style.cssText = 'width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(245,158,11,0.2);border:2px solid #f59e0b;border-radius:50%;box-shadow:0 0 10px rgba(245,158,11,0.5);'
        el.textContent = '⚠️'
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(feat.geometry.coordinates).addTo(map)
      })

      // ── unit markers ──
      const ph0 = SIM_PHASES[0]
      for (const [unitId, unit] of Object.entries(SIM_UNITS)) {
        const { wrap, el, arrow } = createUnitEl(unit)
        const pos = ph0.units[unitId]
        el.addEventListener('click', () => {
          setUnitInfo(prev => prev?.id === unitId ? null : { ...unit, pos })
        })
        const marker = new maplibregl.Marker({ element: wrap, anchor: 'center' })
          .setLngLat(pos).addTo(map)
        markersRef.current[unitId] = { marker, el, arrow }
        trailsRef.current[unitId] = [pos]
      }

      setMapReady(true)
    })

    // SADAN map commands
    function onMapCmd(e) {
      const m = mapRef.current; if (!m) return
      const { action, ...p } = e.detail
      if (action === 'fly_to')
        m.flyTo({ center: [p.lng, p.lat], zoom: p.zoom ?? 14, bearing: p.bearing ?? 0, pitch: p.pitch ?? 45, duration: p.duration_ms ?? 1500, essential: true })
      else if (action === 'zoom')
        m.flyTo({ zoom: m.getZoom() + p.delta, duration: 800, essential: true })
      else if (action === 'rotate')
        m.flyTo({ bearing: p.bearing, pitch: p.pitch >= 0 ? p.pitch : m.getPitch(), duration: 1000, essential: true })
    }
    function onToggle3d() {
      const m = mapRef.current; if (!m) return
      m.flyTo({ pitch: m.getPitch() > 10 ? 0 : 55, duration: 900, essential: true })
    }
    window.addEventListener('sadan:map_command', onMapCmd)
    window.addEventListener('sadan:toggle3d', onToggle3d)

    return () => {
      window.removeEventListener('sadan:map_command', onMapCmd)
      window.removeEventListener('sadan:toggle3d', onToggle3d)
      cancelAnimationFrame(rafRef.current)
      clearInterval(heliTimer.current)
      clearInterval(cinRef.current)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── phase effects: move units, update all layers ──────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    const data = SIM_PHASES[phase]
    const nextData = SIM_PHASES[phase + 1] ?? null

    // 1. Move unit markers + update trails + arrows
    for (const [unitId, pos] of Object.entries(data.units)) {
      markersRef.current[unitId]?.marker.setLngLat(pos)

      // update trail
      const trail = trailsRef.current[unitId]
      const last = trail[trail.length - 1]
      if (!last || last[0] !== pos[0] || last[1] !== pos[1]) {
        trail.push(pos)
        if (trail.length > 5) trail.shift()
      }

      // update direction arrow
      const arrowEl = markersRef.current[unitId]?.arrow
      if (arrowEl && nextData) {
        const nextPos = nextData.units[unitId]
        if (nextPos) {
          const b = calcBearing(pos, nextPos)
          arrowEl.style.transform = `translateX(-50%) rotate(${b}deg)`
        }
      }

      // pulse active units
      const innerEl = markersRef.current[unitId]?.el
      if (innerEl) {
        const isActive = (ACTIVE_UNITS[phase] ?? []).includes(unitId)
        innerEl.style.animation = isActive ? 'simPulse 1.5s ease-in-out infinite' : ''
      }
    }

    // 2. Update trail source
    try {
      const trailFeatures = Object.entries(trailsRef.current)
        .filter(([_, pts]) => pts.length >= 2)
        .map(([unitId, pts]) => ({
          type: 'Feature',
          properties: { color: SIM_UNITS[unitId]?.color ?? '#888' },
          geometry: { type: 'LineString', coordinates: pts },
        }))
      map.getSource('sim-trails')?.setData({ type: 'FeatureCollection', features: trailFeatures })
    } catch (_) {}

    // 3. Fire lines + cones
    const fireLines = FIRE_LINES_DATA[phase] ?? []
    const fireFeatures = fireLines.map(fl => ({
      type: 'Feature',
      properties: { color: fl.color, width: fl.width },
      geometry: { type: 'LineString', coordinates: [fl.from, fl.to] },
    }))
    try {
      map.getSource('sim-fire')?.setData({ type: 'FeatureCollection', features: fireFeatures })
    } catch (_) {}

    const cones = FIRE_CONES_DATA[phase] ?? []
    try {
      map.getSource('sim-cones')?.setData({ type: 'FeatureCollection', features: cones })
    } catch (_) {}

    // 4. Animate fire line opacity
    cancelAnimationFrame(rafRef.current)
    if (fireLines.length > 0) {
      let tick = 0
      const animFire = () => {
        tick++
        try {
          const op = 0.45 + 0.5 * Math.abs(Math.sin(tick * 0.07))
          map.setPaintProperty('sim-fire-lines', 'line-opacity', op)
        } catch (_) {}
        rafRef.current = requestAnimationFrame(animFire)
      }
      rafRef.current = requestAnimationFrame(animFire)
    } else {
      try { map.setPaintProperty('sim-fire-lines', 'line-opacity', 0) } catch (_) {}
    }

    // 5. Camera fly
    const cam = data.camera
    map.flyTo({ center: cam.center, zoom: cam.zoom, bearing: cam.bearing, pitch: cam.pitch, duration: 1800, essential: true })

    // 6. Explosion on objective capture
    const captureLabel = CAPTURE_AT[phase]
    if (captureLabel && !capturedRef.current.has(captureLabel)) {
      capturedRef.current.add(captureLabel)
      const objEl = objElemsRef.current[captureLabel]
      if (objEl) {
        objEl.style.animation = 'objCapture 1.5s ease-out forwards'
        setTimeout(() => {
          objEl.textContent = '✓'
          objEl.style.borderColor = '#22c55e'
          objEl.style.color = '#22c55e'
          objEl.style.boxShadow = '0 0 20px rgba(34,197,94,0.7)'
          objEl.style.animation = ''
          // re-append label
          const lbl = objEl.querySelector('div')
          if (lbl) {
            lbl.style.color = '#86efac'
          }
        }, 1500)
      }
    }

    // 7. Fog of war: lift fog on assault area entry
    // add fog for assault areas not yet entered
    const fogFeatures = []
    if (phase < 4) {
      fogFeatures.push({
        type: 'Feature', properties: {},
        geometry: { type: 'Polygon', coordinates: [[[35.222,31.833],[35.234,31.833],[35.234,31.841],[35.222,31.841],[35.222,31.833]]] }
      })
    }
    if (phase < 6) {
      fogFeatures.push({
        type: 'Feature', properties: {},
        geometry: { type: 'Polygon', coordinates: [[[35.235,31.838],[35.246,31.838],[35.246,31.847],[35.235,31.847],[35.235,31.838]]] }
      })
    }
    try {
      map.getSource('sim-fog')?.setData({ type: 'FeatureCollection', features: fogFeatures })
    } catch (_) {}

    // 8. Helicopter medevac (phase 5 — evacuate after first assault)
    clearInterval(heliTimer.current)
    if (heliRef.current) {
      heliRef.current.remove()
      heliRef.current = null
    }
    if (phase === 5) {
      const heliEl = document.createElement('div')
      heliEl.style.cssText = 'width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:22px;animation:heliFloat 1s ease-in-out infinite;filter:drop-shadow(0 0 6px rgba(255,255,255,0.6));'
      heliEl.textContent = '🚁'
      const medical = [35.232, 31.795]
      const targetA = [35.228, 31.837]
      const heli = new maplibregl.Marker({ element: heliEl, anchor: 'center' })
        .setLngLat(medical).addTo(mapRef.current)
      heliRef.current = heli

      // fly to יעד א׳ in 20 steps, wait 1.5s, fly back
      const STEPS = 20
      let step = 0
      let returning = false
      heliTimer.current = setInterval(() => {
        if (!heliRef.current) { clearInterval(heliTimer.current); return }
        step++
        if (!returning && step <= STEPS) {
          const t = step / STEPS
          heli.setLngLat([
            medical[0] + (targetA[0] - medical[0]) * t,
            medical[1] + (targetA[1] - medical[1]) * t,
          ])
          if (step === STEPS) { returning = true; step = 0 }
        } else if (returning && step <= STEPS) {
          const t = step / STEPS
          heli.setLngLat([
            targetA[0] + (medical[0] - targetA[0]) * t,
            targetA[1] + (medical[1] - targetA[1]) * t,
          ])
          if (step === STEPS) clearInterval(heliTimer.current)
        }
      }, 300)
    }

    // 9. Tank marker (phase 3+4 — supporting fire from assembly)
    if (tankRef.current) {
      tankRef.current.remove()
      tankRef.current = null
    }
    if (phase === 3 || phase === 4) {
      const tankEl = document.createElement('div')
      tankEl.style.cssText = `width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:22px;filter:drop-shadow(0 0 8px rgba(255,165,0,0.8));${phase === 3 ? 'animation:tankFire 0.6s ease-out 3' : ''};`
      tankEl.textContent = '🪖'
      const lbl = document.createElement('div')
      lbl.style.cssText = 'position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);color:#fbbf24;font-size:8px;font-weight:700;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none;background:rgba(0,0,0,0.75);padding:1px 4px;border-radius:3px;'
      lbl.textContent = 'תמיכת אש'
      tankEl.style.position = 'relative'
      tankEl.appendChild(lbl)
      const tankPos = data.units.mm  // at MM position
      const tank = new maplibregl.Marker({ element: tankEl, anchor: 'center' })
        .setLngLat(tankPos).addTo(map)
      tankRef.current = tank
    }

  }, [phase, mapReady])

  // ── cinematic auto-pilot: slowly rotate camera while playing ─────────────
  useEffect(() => {
    clearInterval(cinRef.current)
    if (playing && mapRef.current) {
      let tick = 0
      cinRef.current = setInterval(() => {
        const m = mapRef.current
        if (!m) return
        tick++
        // Gentle sinusoidal bearing drift — ±8 degrees
        const base = SIM_PHASES[phase].camera.bearing
        const drift = Math.sin(tick * 0.06) * 8
        m.setBearing(base + drift)
      }, 100)
    }
    return () => clearInterval(cinRef.current)
  }, [playing, phase])

  // ── TTS narration ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ttsEnabled) return
    const text = SIM_PHASES[phase].narration
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'he-IL'
      u.rate = 0.88
      u.pitch = 1.0
      // prefer Hebrew voice if available
      const voices = window.speechSynthesis.getVoices()
      const heVoice = voices.find(v => v.lang === 'he-IL' || v.lang === 'he')
      if (heVoice) u.voice = heVoice
      window.speechSynthesis.speak(u)
    } catch (_) {}
    return () => { try { window.speechSynthesis.cancel() } catch (_) {} }
  }, [phase, ttsEnabled])

  // ── phase title card ──────────────────────────────────────────────────────
  useEffect(() => {
    setCardPhase(phase)
    setShowCard(true)
    const t = setTimeout(() => setShowCard(false), 3000)
    return () => clearTimeout(t)
  }, [phase])

  // ── show_unit from SADAN ──────────────────────────────────────────────────
  useEffect(() => {
    function onShowUnit(e) {
      const unitId = e.detail?.unit_id
      const pos = SIM_PHASES[phase].units[unitId]
      if (!pos || !mapRef.current) return
      mapRef.current.flyTo({ center: pos, zoom: 16, pitch: 60, bearing: 0, duration: 1500, essential: true })
      const el = document.getElementById(`sim-unit-${unitId}`)
      if (el) {
        el.style.transform = 'scale(1.6)'
        el.style.zIndex = '999'
        setTimeout(() => { el.style.transform = ''; el.style.zIndex = '' }, 1400)
      }
    }
    window.addEventListener('sadan:sim_show_unit', onShowUnit)
    return () => window.removeEventListener('sadan:sim_show_unit', onShowUnit)
  }, [phase])

  function handleReset() {
    pause()
    // reset captured objectives
    capturedRef.current = new Set()
    Object.values(objElemsRef.current).forEach(el => {
      if (el) {
        el.textContent = '✕'
        el.style.borderColor = '#ef4444'
        el.style.color = '#ef4444'
        el.style.boxShadow = '0 0 14px rgba(239,68,68,0.55)'
        el.style.animation = 'objPulse 2s ease-in-out infinite'
        // re-append label
        const lbl = el.querySelector('div')
        if (lbl) lbl.style.color = '#fca5a5'
      }
    })
    // reset trails
    trailsRef.current = { kitaA: [], kitaB: [], kitaG: [], mm: [] }
    gotoPhase(0)
  }

  const progress = (phase / (total - 1)) * 100

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">

      {/* ── top bar ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-demo-surface border-b border-demo-border z-10">
        <button
          onClick={() => navigate('/exercise')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ChevronLeft size={16} /> חזרה לתיק
        </button>
        <div className="w-px h-5 bg-demo-border" />
        <div className="flex items-center gap-2">
          <Crosshair size={15} className="text-demo-gold" />
          <span className="text-white font-bold text-sm">סימולציה טקטית — מחלקה ב׳ | שטח 309ה</span>
        </div>
        <div className="flex-1 min-w-0">
          <PhaseBar phase={phase} onGoto={gotoPhase} />
        </div>
        {/* TTS toggle */}
        <button
          onClick={() => setTtsEnabled(v => !v)}
          title={ttsEnabled ? 'כבה קריינות' : 'הפעל קריינות'}
          className={`p-1.5 rounded-lg transition-colors ${ttsEnabled ? 'text-demo-gold bg-demo-gold/10' : 'text-gray-600 hover:text-gray-300'}`}
        >
          {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
        {/* time badge */}
        <div className="bg-demo-card border border-demo-border rounded-lg px-3 py-1 flex-shrink-0">
          <span className="text-demo-gold font-black text-sm">{currentData.time}</span>
          <span className="text-gray-500 text-xs mr-1.5">{currentData.longLabel.split(' — ')[0]}</span>
        </div>
      </div>

      {/* ── map ── */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapElRef} className="w-full h-full" />

        {/* phase title card (S02) */}
        {showCard && <PhaseTitleCard phase={cardPhase} visible={showCard} />}

        {/* HUD (S06) */}
        <HUDPanel phase={phase} visible={hudVisible} onToggle={() => setHudVisible(false)} />

        {/* HUD toggle when hidden */}
        {!hudVisible && (
          <button
            onClick={() => setHudVisible(true)}
            className="absolute top-4 right-4 z-30 bg-demo-surface/90 border border-demo-border rounded-xl px-3 py-2 text-xs text-demo-gold/80 backdrop-blur"
          >
            📡 מצב כוח
          </button>
        )}

        {/* unit info popup */}
        {unitInfo && (
          <div className="absolute top-4 left-4 z-30 bg-demo-surface/95 border border-demo-border rounded-xl p-3 w-56 backdrop-blur" dir="rtl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded flex items-center justify-center text-sm font-black"
                  style={{ border: `2px solid ${unitInfo.color}`, color: unitInfo.color, background: `${unitInfo.color}20` }}>
                  {unitInfo.icon}
                </div>
                <span className="text-white font-bold text-sm">{unitInfo.label}</span>
              </div>
              <button onClick={() => setUnitInfo(null)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="space-y-1 text-xs">
              <div><span className="text-gray-500">מפקד:</span> <span className="text-gray-200">{unitInfo.commander}</span></div>
              <div><span className="text-gray-500">אות קריאה:</span> <span className="text-demo-gold font-bold">{unitInfo.callsign}</span></div>
              <div><span className="text-gray-500">תפקיד:</span> <span className="text-gray-200">{unitInfo.role}</span></div>
              <div><span className="text-gray-500">סטטוס:</span> <span className="text-green-300 font-bold">{UNIT_STATUS[phase]?.[unitInfo.id] ?? '—'}</span></div>
            </div>
          </div>
        )}

        {/* SADAN hint */}
        <div className="absolute bottom-4 left-4 z-20 bg-black/60 border border-demo-gold/30 rounded-xl px-3 py-2 text-xs text-demo-gold/80 backdrop-blur max-w-xs" dir="rtl">
          💬 <span className="font-semibold">סדן</span> — "עצור", "המשך", "קפוץ לשלב כיסוי", "תראה לי כיתה ב׳"
        </div>
      </div>

      {/* ── narration bar ── */}
      <div className="flex-shrink-0 bg-demo-surface/95 border-t border-demo-border px-5 py-2.5 min-h-[52px] flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-demo-gold flex items-center justify-center text-black font-black text-xs flex-shrink-0">ס</div>
        <p className="text-gray-200 text-sm leading-relaxed flex-1" dir="rtl">{currentData.narration}</p>
      </div>

      {/* ── controls ── */}
      <div className="flex-shrink-0 bg-demo-surface border-t border-demo-border px-5 py-3 flex items-center gap-3">
        <button onClick={handleReset} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-demo-card transition-colors" title="התחל מחדש">
          <RotateCcw size={16} />
        </button>
        <button
          onClick={prevPhase} disabled={phase === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-demo-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <ChevronRight size={15} /> קודם
        </button>
        <button
          onClick={togglePlay} disabled={phase >= total - 1 && !playing}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            playing
              ? 'bg-demo-warning/20 border border-demo-warning/50 text-demo-warning hover:bg-demo-warning/30'
              : 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {playing ? <><Pause size={15} /> עצור</> : <><Play size={15} /> הפעל</>}
        </button>
        <button
          onClick={nextPhase} disabled={phase >= total - 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-demo-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
        >
          הבא <ChevronLeft size={15} />
        </button>

        {/* progress bar */}
        <div className="flex-1 mr-2">
          <div className="flex justify-between text-[10px] text-gray-600 mb-1">
            <span>כינוס</span>
            <span className="text-demo-gold font-bold">{currentData.longLabel}</span>
            <span>נסיגה</span>
          </div>
          <div className="w-full h-1.5 bg-demo-card rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-demo-gold to-yellow-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

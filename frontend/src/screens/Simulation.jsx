// Simulation.jsx — סימולציה טקטית
// KEY ARCHITECTURE NOTE:
//   MapLibre sets element.style.transform on EVERY render frame to position HTML markers.
//   Therefore: NEVER put transition:transform on the marker wrapper — it fights MapLibre.
//   Smooth geographic movement = interpolate lngLat + call setLngLat() each rAF frame.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Crosshair, Volume2, VolumeX, Radio, Layers } from 'lucide-react'
import { AREA_309 } from '../data/mockData'
import { SIM_UNITS, SIM_PHASES } from '../data/simulationData'
import useSimulation from '../hooks/useSimulation'

// ── map base style ────────────────────────────────────────────────────────────
const MAP_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
           tileSize: 256, attribution: '© OpenStreetMap Contributors', maxzoom: 19 },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
}

// ── easing ────────────────────────────────────────────────────────────────────
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }

// ── smooth coordinate animation (lngLat interpolation — NOT CSS transition) ───
// Returns a cancel function.
function animateMarkerTo(marker, fromPos, toPos, durationMs, onDone) {
  const startMs = performance.now()
  let rafId
  function step(now) {
    const t = Math.min(1, (now - startMs) / durationMs)
    const et = easeInOut(t)
    marker.setLngLat([
      fromPos[0] + (toPos[0] - fromPos[0]) * et,
      fromPos[1] + (toPos[1] - fromPos[1]) * et,
    ])
    if (t < 1) { rafId = requestAnimationFrame(step) }
    else { onDone?.() }
  }
  rafId = requestAnimationFrame(step)
  return () => cancelAnimationFrame(rafId)
}

// ── active units per phase ────────────────────────────────────────────────────
const ACTIVE_UNITS = {
  0: [], 1: ['kitaA','kitaB','kitaG','mm'], 2: [],
  3: ['kitaB'], 4: ['kitaA','kitaG'], 5: ['kitaG'],
  6: ['kitaA','kitaB'], 7: ['kitaA','kitaB','kitaG','mm'],
}

// ── unit status per phase ─────────────────────────────────────────────────────
const UNIT_STATUS = {
  0: { kitaA:'כינוס',  kitaB:'כינוס',        kitaG:'כינוס',        mm:'תדריך' },
  1: { kitaA:'תנועה',  kitaB:'תנועה',        kitaG:'תנועה',        mm:'תנועה' },
  2: { kitaA:'ביסוס',  kitaB:'ביסוס',        kitaG:'ביסוס',        mm:'ביסוס' },
  3: { kitaA:'מתקדם',  kitaB:'🔥 ירי ברתק', kitaG:'מתקדם',        mm:'מפקד'  },
  4: { kitaA:'⚔️ הסתערות', kitaB:'🔥 כיסוי', kitaG:'⚔️ הסתערות', mm:'מפקד'  },
  5: { kitaA:'ביסוס',  kitaB:'מתכונן',       kitaG:'🔥 ירי ברתק', mm:'מפקד'  },
  6: { kitaA:'⚔️ הסתערות', kitaB:'⚔️ הסתערות', kitaG:'🔥 כיסוי', mm:'מפקד'  },
  7: { kitaA:'נסיגה',  kitaB:'נסיגה',        kitaG:'נסיגה',        mm:'נסיגה' },
}

// ── fire lines per phase ──────────────────────────────────────────────────────
const FIRE_LINES_DATA = {
  3: [{ from:[35.228,31.820], to:[35.228,31.837], color:'#60a5fa', width:3 }],
  4: [{ from:[35.228,31.820], to:[35.228,31.837], color:'#60a5fa', width:3 }],
  5: [{ from:[35.245,31.836], to:[35.240,31.842], color:'#93c5fd', width:3 }],
  6: [{ from:[35.228,31.820], to:[35.228,31.837], color:'#60a5fa', width:2.5 },
      { from:[35.245,31.836], to:[35.240,31.842], color:'#93c5fd', width:2.5 }],
}

// ── objective capture phases ──────────────────────────────────────────────────
const CAPTURE_AT = { 4: 'יעד א׳', 6: 'יעד ב׳' }

// ── tactical card data ────────────────────────────────────────────────────────
const PHASE_TACTICAL = [
  { icon:'📋', details:['30 לוחמים | 4 כיתות','תחמושת: 5.56 × 120','ק.ב.: H-4 | אישור: סרן בטיחות'] },
  { icon:'🚶', details:['מרחק: 2.4 ק"מ','ציר: נמר | 45 דקות','נ.ד. 1 → נ.ד. 2'] },
  { icon:'🗺️', details:['כיתה ב׳ → עמדת ירי א׳','כיתות א׳+ג׳ ממשיכות צפונה','תדר: 46.500 MHz'] },
  { icon:'🔥', details:['כיתה ב׳: אזימוט 010°','גבולות: 355°–025°','מטרה: בטונדה מערבית'] },
  { icon:'⚔️', details:['כיתות א׳+ג׳ מסתערות','ביטול ירי: "נמר-72 חדל"','זמן שהייה: ≤ 3 דקות'] },
  { icon:'🚁', details:['כיתה ג׳ → עמדת ירי ב׳','פינוי רפואי — מסוק בדרך','כיתות א׳+ב׳ מתארגנות'] },
  { icon:'🏁', details:['כיתות א׳+ב׳ מסתערות','כיתה ג׳ כיסוי: 000°–030°','מטרה עיקרית: בטונדה מרכזית'] },
  { icon:'🔙', details:['תחקיר ביניים בשטח','נסיגה הפוכה לסדר הכניסה','נ.כ. → תחקיר סיום'] },
]

// ── geo helpers ───────────────────────────────────────────────────────────────
function calcBearing([lng1,lat1],[lng2,lat2]) {
  const φ1=lat1*Math.PI/180, φ2=lat2*Math.PI/180, Δλ=(lng2-lng1)*Math.PI/180
  return (Math.atan2(Math.sin(Δλ)*Math.cos(φ2),
    Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ))*180/Math.PI+360)%360
}
function destPoint([lng,lat],bearingDeg,km){
  const R=6371,d=km/R,φ1=lat*Math.PI/180,λ1=lng*Math.PI/180,θ=bearingDeg*Math.PI/180
  const φ2=Math.asin(Math.sin(φ1)*Math.cos(d)+Math.cos(φ1)*Math.sin(d)*Math.cos(θ))
  const λ2=λ1+Math.atan2(Math.sin(θ)*Math.sin(d)*Math.cos(φ1),Math.cos(d)-Math.sin(φ1)*Math.sin(φ2))
  return [λ2*180/Math.PI,φ2*180/Math.PI]
}
function fireCone(origin,left,right,dist=0.8){
  let span=right-left; if(span<0)span+=360
  const pts=[origin]
  for(let i=0;i<=14;i++) pts.push(destPoint(origin,(left+span*i/14)%360,dist))
  pts.push(origin)
  return {type:'Feature',geometry:{type:'Polygon',coordinates:[pts]},properties:{}}
}

// ── OPFOR positions — בימוי אויב ─────────────────────────────────────────────
const OPFOR_POSITIONS = [
  { id:'opfor-a', coords:[35.225, 31.839], label:'יעד א׳ — אויב',    icon:'👁', phases:[1,2,3,4] },
  { id:'opfor-b', coords:[35.241, 31.845], label:'יעד ב׳ — אויב',   icon:'👁', phases:[1,2,3,4,5,6] },
  { id:'opfor-ob1', coords:[35.231, 31.833], label:'תצפית צפון',    icon:'🔭', phases:[0,1,2,3] },
  { id:'opfor-ob2', coords:[35.218, 31.815], label:'מארב דרום',     icon:'⚠️', phases:[1,2] },
]

// ── fire sector cones per phase ───────────────────────────────────────────────
const FIRE_CONES_DATA = {
  3: [fireCone([35.228,31.820],355,25,0.85)],
  4: [fireCone([35.228,31.820],355,25,0.85)],
  5: [fireCone([35.245,31.836],0,30,0.75)],
  6: [fireCone([35.228,31.820],355,25,0.85),fireCone([35.245,31.836],0,30,0.75)],
}

// ── unit marker — NO transition:transform (MapLibre owns that property) ───────
// Solid, aggressive design: always visible regardless of map background
function createUnitEl(unit) {
  const S = 64   // icon square size — big enough to be unmissable

  // wrap: MapLibre controls transform — ZERO CSS transition on this element
  // z-index:1000 creates a stacking context above all map UI elements
  const wrap = document.createElement('div')
  wrap.style.cssText = [
    'position:relative','overflow:visible',
    `width:${S}px`,`height:${S}px`,
    'z-index:1000',
  ].join(';')

  // inner: visual container — we scale THIS, not wrap (MapLibre owns wrap.style.transform)
  const inner = document.createElement('div')
  inner.id = `sim-inner-${unit.id}`
  inner.style.cssText = [
    'position:absolute','top:0','left:0',
    `width:${S}px`,`height:${S}px`,
    'overflow:visible',
    `transform-origin:${S/2}px ${S/2}px`,   // scale from icon center
    'transition:transform 0.3s ease',
  ].join(';')

  // sonar-ping ring — child-level CSS animation OK here
  const ring = document.createElement('div')
  ring.id = `sim-ring-${unit.id}`
  ring.style.cssText = [
    'position:absolute',
    `top:${S/2}px`,`left:${S/2}px`,
    `width:${S+32}px`,`height:${S+32}px`,
    'border-radius:50%',
    `border:3px solid ${unit.color}`,
    'transform:translate(-50%,-50%) scale(0.7)',
    'opacity:0','pointer-events:none',
  ].join(';')
  inner.appendChild(ring)

  // direction arrow — above the square
  const arrow = document.createElement('div')
  arrow.id = `sim-arrow-${unit.id}`
  arrow.style.cssText = [
    'position:absolute','top:-22px',`left:${S/2}px`,
    'transform:translateX(-50%) rotate(0deg)',
    'width:0','height:0',
    'border-left:9px solid transparent','border-right:9px solid transparent',
    `border-bottom:18px solid ${unit.color}`,
    'opacity:1','transition:transform 1.8s ease','pointer-events:none',
    `filter:drop-shadow(0 0 4px ${unit.color})`,
  ].join(';')
  inner.appendChild(arrow)

  // ── icon square — SOLID background, always visible ──────────────────────
  const el = document.createElement('div')
  el.id = `sim-unit-${unit.id}`
  el.style.cssText = [
    'position:absolute','top:0','left:0',
    `width:${S}px`,`height:${S}px`,
    'display:flex','align-items:center','justify-content:center',
    `border:4px solid ${unit.color}`,'border-radius:10px',
    'background:#0a0f16',          // solid dark — visible on ANY map tile color
    `color:${unit.color}`,
    'font-size:26px','font-weight:900',
    // outer glow: unit color; inner shadow: dark edge
    `box-shadow:0 0 0 2px #0a0f16, 0 0 30px ${unit.color}, 0 0 65px ${unit.color}99, 0 6px 20px rgba(0,0,0,0.98)`,
    'cursor:pointer','user-select:none',
  ].join(';')
  el.style.setProperty('--bs-normal', `0 0 0 2px #0a0f16, 0 0 30px ${unit.color}, 0 0 65px ${unit.color}99, 0 6px 20px rgba(0,0,0,0.98)`)
  el.style.setProperty('--bs-pulse',  `0 0 0 2px #0a0f16, 0 0 55px ${unit.color}, 0 0 100px ${unit.color}, 0 6px 20px rgba(0,0,0,0.98)`)
  el.textContent = unit.icon

  // ── info banner — callsign + live role/status ────────────────────────────
  const banner = document.createElement('div')
  banner.id = `sim-banner-${unit.id}`
  banner.style.cssText = [
    'position:absolute',
    `top:${S + 7}px`,
    `left:${S / 2}px`,
    'transform:translateX(-50%)',
    'min-width:115px',
    'background:#000000dd',
    `border:2px solid ${unit.color}`,
    'border-radius:6px',
    'padding:4px 8px 5px 8px',
    'text-align:center',
    'pointer-events:none',
    `box-shadow:0 0 14px ${unit.color}80,0 4px 12px rgba(0,0,0,0.95)`,
    'white-space:nowrap',
  ].join(';')

  const callsignEl = document.createElement('div')
  callsignEl.style.cssText = `color:${unit.color};font-size:12px;font-weight:900;line-height:1.3;text-shadow:0 0 8px ${unit.color};letter-spacing:0.5px;`
  callsignEl.textContent = unit.callsign

  const labelEl = document.createElement('div')
  labelEl.style.cssText = `color:#e5e7eb;font-size:10px;font-weight:700;line-height:1.3;margin-top:1px;`
  labelEl.textContent = unit.label     // כיתה א׳ / מ"מ etc.

  const roleEl = document.createElement('div')
  roleEl.id = `sim-role-${unit.id}`
  roleEl.style.cssText = `color:#9ca3af;font-size:9px;font-weight:600;line-height:1.3;margin-top:1px;`
  roleEl.textContent = unit.role

  // colored status strip
  const statusBar = document.createElement('div')
  statusBar.id = `sim-status-${unit.id}`
  statusBar.style.cssText = `height:4px;border-radius:3px;margin-top:4px;background:#374151;transition:background 0.4s;`

  banner.appendChild(callsignEl)
  banner.appendChild(labelEl)
  banner.appendChild(roleEl)
  banner.appendChild(statusBar)

  inner.appendChild(el)
  inner.appendChild(banner)
  wrap.appendChild(inner)
  return { wrap, inner, el, arrow, ring, roleEl, statusBar }
}

// ── Info Panel — שלב + מצב כוח מאוחדים בכרטיס יחיד (במקום שני אשכולות נפרדים
// שהתנגשו עם הפופ-אפ של יחידה בלחיצה). עקביות עם "תצוגת מפה" במסך השטח —
// כניסה אחת, גליון אחד, לא כמה כרטיסים עצמאיים שמכסים את המפה. ─────────────────
function InfoPanel({ phase, visible, onToggle }) {
  const data = SIM_PHASES[phase]
  const tact = PHASE_TACTICAL[phase]
  const statuses = UNIT_STATUS[phase] ?? {}

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-4 left-4 z-30 bg-demo-surface/90 border border-demo-border rounded-xl px-3 py-2 text-xs text-demo-gold/80 backdrop-blur"
      >
        ℹ️ מידע
      </button>
    )
  }

  return (
    <div className="absolute top-4 left-4 z-30 bg-demo-surface/95 border border-demo-border rounded-xl p-3 w-64 max-h-[75vh] overflow-y-auto backdrop-blur" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-lg leading-none">{tact?.icon ?? '⚡'}</span>
          <div>
            <div className="text-demo-gold font-bold text-xs">{data.longLabel}</div>
            <div className="text-gray-500 text-[10px]">{data.time}</div>
          </div>
        </div>
        <button onClick={onToggle} className="text-gray-500 hover:text-white text-base leading-none">×</button>
      </div>

      {tact?.details && (
        <div className="border-t border-gray-700 pt-2 mt-2 mb-3 space-y-1.5">
          {tact.details.map((d, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-demo-gold flex-shrink-0">·</span>
              <span className="text-gray-200 text-[11px] leading-relaxed font-medium">{d}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-700 pt-2 flex items-center gap-1.5 mb-2">
        <Radio size={11} className="text-demo-gold" />
        <span className="text-demo-gold font-bold text-[11px]">מצב כוח</span>
      </div>
      <div className="space-y-2">
        {Object.entries(SIM_UNITS).map(([id, unit]) => (
          <div key={id} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ border:`2px solid ${unit.color}`, color:unit.color, background:`${unit.color}20` }}>
              {unit.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-white text-[11px] font-bold">{unit.callsign}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  (statuses[id]??'').includes('הסתערות') ? 'bg-red-500/20 text-red-300' :
                  (statuses[id]??'').includes('ירי')     ? 'bg-blue-500/20 text-blue-300' :
                  (statuses[id]??'').includes('תנועה')   ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-700/50 text-gray-400'
                }`}>{statuses[id] ?? '—'}</span>
              </div>
              <div className="text-[9px] text-gray-500">{unit.commander}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Phase bar ─────────────────────────────────────────────────────────────────
function PhaseBar({ phase, onGoto }) {
  return (
    <div className="flex items-center gap-1 flex-1 justify-center">
      {SIM_PHASES.map((p, i) => (
        <button key={i} onClick={() => onGoto(i)} title={p.longLabel}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded transition-all ${
            i===phase ? 'bg-demo-gold/20 border border-demo-gold/60'
            : i<phase  ? 'opacity-60' : 'opacity-30'
          }`}>
          <div className={`w-2 h-2 rounded-full ${
            i<phase ? 'bg-demo-gold' : i===phase ? 'bg-demo-gold animate-pulse' : 'bg-gray-600'
          }`}/>
          <span className={`text-[9px] font-bold ${i===phase?'text-demo-gold':'text-gray-500'}`}>{p.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Simulation() {
  const navigate    = useNavigate()
  const mapElRef    = useRef(null)
  const mapRef      = useRef(null)
  const markersRef  = useRef({})          // { kitaA:{marker,el,arrow,ring}, ... }
  const prevPosRef  = useRef({})          // last known lngLat per unit (for interpolation)
  const unitRafsRef = useRef({})          // cancel fns for per-unit move animations
  const trailsRef   = useRef({ kitaA:[], kitaB:[], kitaG:[], mm:[] })
  const objElemsRef = useRef({})
  const heliRef     = useRef(null)
  const heliTimer   = useRef(null)
  const tankRef     = useRef(null)
  const rafRef      = useRef(null)        // fire line rAF
  const cinRef      = useRef(null)        // cinematic rotation interval
  const capturedRef = useRef(new Set())

  const [mapReady,        setMapReady]        = useState(false)
  const [unitInfo,        setUnitInfo]        = useState(null)
  const [hudVisible,      setHudVisible]      = useState(true)
  const [ttsEnabled,      setTtsEnabled]      = useState(false)
  const [is3d,            setIs3d]            = useState(true)
  const [markerScale,     setMarkerScale]     = useState(1.0)   // 0.4 – 1.6
  const [showNextRoute,   setShowNextRoute]   = useState(false) // highlight next-phase movement lines
  const [opforHighlight,  setOpforHighlight]  = useState(false) // highlight OPFOR positions

  const opforElemsRef = useRef({})  // id → DOM element

  const sim = useSimulation()
  const { phase, playing, currentData, total, togglePlay, nextPhase, prevPhase, gotoPhase, pause } = sim

  // ── init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapElRef.current, style: MAP_STYLE,
      center: SIM_PHASES[0].camera.center, zoom: SIM_PHASES[0].camera.zoom,
      bearing: SIM_PHASES[0].camera.bearing, pitch: SIM_PHASES[0].camera.pitch,
      dragRotate: true, pitchWithRotate: true, maxPitch: 80,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-left')

    map.on('load', () => {
      // terrain
      map.addSource('terrain',{type:'raster-dem',
        tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding:'terrarium',tileSize:256,maxzoom:14})
      map.addLayer({id:'hillshade',type:'hillshade',source:'terrain',
        paint:{'hillshade-exaggeration':0.35}})

      // tactical area
      map.addSource('sim-area',{type:'geojson',data:AREA_309.geojson})
      const addLayer=(id,type,filter,paint)=>map.addLayer({id,type,source:'sim-area',filter,paint})
      addLayer('sim-boundary','fill',['==',['get','category'],'boundary'],{'fill-color':'#c6953b','fill-opacity':0.06})
      addLayer('sim-boundary-line','line',['==',['get','category'],'boundary'],{'line-color':'#c6953b','line-width':2,'line-dasharray':[5,3]})
      addLayer('sim-hazard-fill','fill',['==',['get','category'],'hazard_zone'],{'fill-color':'#22c55e','fill-opacity':0.15})
      addLayer('sim-hazard-line','line',['==',['get','category'],'hazard_zone'],{'line-color':'#22c55e','line-width':1.5,'line-dasharray':[3,2]})
      addLayer('sim-powerline','line',['==',['get','category'],'powerline'],{'line-color':'#fbbf24','line-width':2.5,'line-dasharray':[8,3]})
      addLayer('sim-neighbor-fill','fill',['==',['get','category'],'neighbor_zone'],{'fill-color':'#a855f7','fill-opacity':0.1})
      addLayer('sim-neighbor-line','line',['==',['get','category'],'neighbor_zone'],{'line-color':'#a855f7','line-width':2})
      addLayer('sim-sector','line',['==',['get','category'],'sector_boundary'],{'line-color':'#ffffff','line-width':2,'line-dasharray':[8,4],'line-opacity':0.7})
      addLayer('sim-assault-fill','fill',['==',['get','category'],'assault_area'],{'fill-color':'#ef4444','fill-opacity':0.15})
      addLayer('sim-assault-line','line',['==',['get','category'],'assault_area'],{'line-color':'#ef4444','line-width':1.5,'line-dasharray':[4,2]})
      addLayer('sim-axis','line',['==',['get','category'],'axis'],{'line-color':'#c6953b','line-width':3,'line-dasharray':[5,3],'line-opacity':0.7})
      addLayer('sim-route','line',['==',['get','category'],'clearance_route'],{'line-color':'#22c55e','line-width':2.5,'line-dasharray':[2,4],'line-opacity':0.85})

      // trail source
      map.addSource('sim-trails',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
      map.addLayer({id:'sim-trail-lines',type:'line',source:'sim-trails',
        paint:{'line-color':['get','color'],'line-width':2.5,'line-opacity':0.5,'line-dasharray':[3,5]}})

      // fire lines source
      map.addSource('sim-fire',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
      map.addLayer({id:'sim-fire-lines',type:'line',source:'sim-fire',
        paint:{'line-color':['get','color'],'line-width':['get','width'],'line-opacity':0.9,'line-dasharray':[4,2]}})

      // fire sector cones
      map.addSource('sim-cones',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
      map.addLayer({id:'sim-cone-fill',type:'fill',source:'sim-cones',paint:{'fill-color':'#60a5fa','fill-opacity':0.09}})
      map.addLayer({id:'sim-cone-line',type:'line',source:'sim-cones',paint:{'line-color':'#60a5fa','line-width':1.2,'line-opacity':0.45,'line-dasharray':[4,4]}})

      // fog of war
      map.addSource('sim-fog',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
      map.addLayer({id:'sim-fog-fill',type:'fill',source:'sim-fog',paint:{'fill-color':'#1f2937','fill-opacity':0.45}})

      // next-phase movement routes (toggled by showNextRoute)
      map.addSource('sim-next-routes',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
      map.addLayer({id:'sim-next-route-lines',type:'line',source:'sim-next-routes',
        paint:{'line-color':['get','color'],'line-width':3.5,'line-opacity':0.9,'line-dasharray':[8,4]}})
      map.addLayer({id:'sim-next-route-pts',type:'circle',source:'sim-next-routes',
        filter:['==',['get','type'],'endpoint'],
        paint:{'circle-radius':7,'circle-color':['get','color'],'circle-opacity':0.9,
               'circle-stroke-width':2,'circle-stroke-color':'#000'}})

      // static markers
      AREA_309.geojson.features.forEach(feat => {
        if(feat.geometry.type!=='Point') return
        const cat=feat.properties.category, coords=feat.geometry.coordinates
        if(cat==='reporting_point'){
          const el=document.createElement('div')
          el.style.cssText='width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:2px solid #3b82f6;border-radius:50%;background:rgba(59,130,246,0.2);color:#93c5fd;font-size:10px;font-weight:900;box-shadow:0 0 10px rgba(59,130,246,0.5);'
          el.textContent=feat.properties.label.replace('נ.ד. ','')
          new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(coords).addTo(map)
        }
        if(cat==='sbf_position'){
          const wrap=document.createElement('div')
          wrap.style.cssText='position:relative;width:30px;height:30px;overflow:visible;'
          const el=document.createElement('div')
          el.style.cssText='width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:2px solid #f97316;border-radius:5px;background:rgba(249,115,22,0.2);color:#fdba74;font-size:15px;font-weight:900;box-shadow:0 0 12px rgba(249,115,22,0.6);'
          el.textContent='🔫'
          const lbl=document.createElement('div')
          lbl.style.cssText='position:absolute;top:34px;left:15px;transform:translateX(-50%);color:#fdba74;font-size:9px;font-weight:700;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none;background:rgba(0,0,0,0.8);padding:1px 4px;border-radius:3px;'
          lbl.textContent=feat.properties.label
          wrap.appendChild(el); wrap.appendChild(lbl)
          new maplibregl.Marker({element:wrap,anchor:'center'}).setLngLat(coords).addTo(map)
        }
        if(cat==='objective'){
          const wrap=document.createElement('div')
          wrap.style.cssText='position:relative;width:36px;height:36px;overflow:visible;'
          const el=document.createElement('div')
          el.id=`sim-obj-${feat.properties.label}`
          el.style.cssText='position:absolute;top:0;left:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid #ef4444;border-radius:5px;background:rgba(239,68,68,0.2);color:#ef4444;font-size:18px;font-weight:900;box-shadow:0 0 18px rgba(239,68,68,0.7);animation:objPulse 2s ease-in-out infinite;'
          el.textContent='✕'
          const lbl=document.createElement('div')
          lbl.style.cssText='position:absolute;top:40px;left:18px;transform:translateX(-50%);color:#fca5a5;font-size:9px;font-weight:700;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none;background:rgba(0,0,0,0.8);padding:1px 5px;border-radius:3px;'
          lbl.textContent=feat.properties.label
          wrap.appendChild(el); wrap.appendChild(lbl)
          new maplibregl.Marker({element:wrap,anchor:'center'}).setLngLat(coords).addTo(map)
          objElemsRef.current[feat.properties.label]=el
        }
        if(cat==='safety_hazard'){
          const el=document.createElement('div')
          el.style.cssText='width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:20px;background:rgba(245,158,11,0.2);border:2px solid #f59e0b;border-radius:50%;box-shadow:0 0 12px rgba(245,158,11,0.5);'
          el.textContent='⚠️'
          new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(coords).addTo(map)
        }
      })

      // ── OPFOR markers (בימוי אויב) — initially semi-transparent ─────────────
      OPFOR_POSITIONS.forEach(op => {
        const wrap = document.createElement('div')
        wrap.style.cssText = 'position:relative;width:44px;height:44px;overflow:visible;'

        const el = document.createElement('div')
        el.id = `sim-opfor-${op.id}`
        el.style.cssText = [
          'width:44px','height:44px',
          'display:flex','align-items:center','justify-content:center',
          'font-size:20px',
          'border:3px solid #ef4444','border-radius:8px',
          'background:rgba(239,68,68,0.18)',
          'box-shadow:0 0 20px rgba(239,68,68,0.7)',
          'transition:opacity 0.4s,transform 0.4s',
          'opacity:0.28','transform:scale(0.7)',   // dim by default
          'cursor:default',
        ].join(';')
        el.textContent = op.icon

        const lbl = document.createElement('div')
        lbl.style.cssText = [
          'position:absolute','top:48px','left:22px',
          'transform:translateX(-50%)',
          'color:#fca5a5','font-size:9px','font-weight:700','white-space:nowrap',
          'text-shadow:0 1px 3px #000',
          'background:rgba(0,0,0,0.85)','padding:1px 5px','border-radius:3px',
          'transition:opacity 0.4s','opacity:0.3',
          'pointer-events:none',
        ].join(';')
        lbl.id = `sim-opfor-lbl-${op.id}`
        lbl.textContent = op.label

        wrap.appendChild(el); wrap.appendChild(lbl)
        new maplibregl.Marker({ element: wrap, anchor: 'center' }).setLngLat(op.coords).addTo(map)
        opforElemsRef.current[op.id] = { el, lbl }
      })

      // ── unit markers — no CSS transition, coord-animation drives movement ──
      console.log('[SIM] map loaded — creating unit markers')
      for (const [unitId, unit] of Object.entries(SIM_UNITS)) {
        const { wrap, el, arrow, ring, roleEl, statusBar } = createUnitEl(unit)
        const pos = SIM_PHASES[0].units[unitId]
        console.log(`[SIM] adding marker ${unitId} at`, pos)
        el.addEventListener('click', () => {
          setUnitInfo(prev => prev?.id===unitId ? null : { ...unit, pos })
        })
        const marker = new maplibregl.Marker({ element: wrap, anchor: 'center' })
          .setLngLat(pos).addTo(map)
        markersRef.current[unitId]  = { marker, el, arrow, ring, roleEl, statusBar }
        prevPosRef.current[unitId]  = pos
        trailsRef.current[unitId]   = [pos]
      }
      console.log('[SIM] all markers added, markersRef:', Object.keys(markersRef.current))

      setMapReady(true)
    })

    // SADAN voice commands
    const onMapCmd = e => {
      const m=mapRef.current; if(!m)return
      const {action,...p}=e.detail
      if(action==='fly_to') m.flyTo({center:[p.lng,p.lat],zoom:p.zoom??14,bearing:p.bearing??0,pitch:p.pitch??45,duration:p.duration_ms??1500,essential:true})
      else if(action==='zoom') m.flyTo({zoom:m.getZoom()+p.delta,duration:800,essential:true})
      else if(action==='rotate') m.flyTo({bearing:p.bearing,pitch:p.pitch>=0?p.pitch:m.getPitch(),duration:1000,essential:true})
    }
    const onToggle3d = () => { const m=mapRef.current; if(!m)return; m.flyTo({pitch:m.getPitch()>10?0:55,duration:900,essential:true}) }

    // SADAN simulation control — set phase from chat
    const onSetPhase = e => {
      const p = Number(e.detail?.phase)
      if (isNaN(p) || p < 0 || p > 7) return
      setPhase(p)
    }
    // SADAN focus unit — pan camera to a specific unit in current phase
    const onFocusUnit = e => {
      const uid = e.detail?.unit_id
      const m = mapRef.current
      if (!uid || !m) return
      window.dispatchEvent(new CustomEvent('sadan:sim_show_unit', { detail: { unit_id: uid } }))
    }

    window.addEventListener('sadan:map_command', onMapCmd)
    window.addEventListener('sadan:toggle3d', onToggle3d)
    window.addEventListener('sadan:sim_set_phase', onSetPhase)
    window.addEventListener('sadan:sim_focus_unit', onFocusUnit)

    return () => {
      window.removeEventListener('sadan:map_command', onMapCmd)
      window.removeEventListener('sadan:toggle3d', onToggle3d)
      window.removeEventListener('sadan:sim_set_phase', onSetPhase)
      window.removeEventListener('sadan:sim_focus_unit', onFocusUnit)
      cancelAnimationFrame(rafRef.current)
      clearInterval(heliTimer.current)
      clearInterval(cinRef.current)
      Object.values(unitRafsRef.current).forEach(cancel => cancel?.())
      map.remove(); mapRef.current=null
    }
  }, [])

  // ── phase change: move units + update all map layers ──────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map  = mapRef.current
    const data = SIM_PHASES[phase]
    const next = SIM_PHASES[phase+1] ?? null

    // 1. Animate units to new positions using coordinate interpolation
    for (const [unitId, toPos] of Object.entries(data.units)) {
      const fromPos = prevPosRef.current[unitId] ?? toPos

      // cancel previous move animation for this unit
      unitRafsRef.current[unitId]?.()

      const marker  = markersRef.current[unitId]?.marker
      const arrowEl = markersRef.current[unitId]?.arrow
      const innerEl = markersRef.current[unitId]?.el
      const ringEl  = markersRef.current[unitId]?.ring

      // start coordinate animation — 500ms delay so camera move is visible first
      if (marker) {
        const tid = setTimeout(() => {
          if (!markersRef.current[unitId]) return
          unitRafsRef.current[unitId] = animateMarkerTo(
            marker, fromPos, toPos, 2400,
            // on done: update trail + prevPos
            () => {
              prevPosRef.current[unitId] = toPos
              const trail = trailsRef.current[unitId]
              trail.push(toPos)
              if (trail.length > 5) trail.shift()
              if (mapRef.current) {
                try {
                  const features = Object.entries(trailsRef.current)
                    .filter(([_,pts])=>pts.length>=2)
                    .map(([id,pts])=>({
                      type:'Feature',
                      properties:{color:SIM_UNITS[id]?.color??'#888'},
                      geometry:{type:'LineString',coordinates:pts}
                    }))
                  mapRef.current.getSource('sim-trails')?.setData({type:'FeatureCollection',features})
                } catch(_){}
              }
            }
          )
        }, 500)
        // store cancel fn: clears timeout OR running rAF
        unitRafsRef.current[unitId] = () => clearTimeout(tid)
      }

      // direction arrow
      if (arrowEl && next) {
        const b = calcBearing(toPos, next.units[unitId] ?? toPos)
        arrowEl.style.transform = `translateX(-50%) rotate(${b}deg)`
      }

      // update banner: role status text + color strip
      const statusText = UNIT_STATUS[phase]?.[unitId] ?? '—'
      const roleElInner    = markersRef.current[unitId]?.roleEl
      const statusBarInner = markersRef.current[unitId]?.statusBar
      if (roleElInner)    roleElInner.textContent = statusText
      if (statusBarInner) {
        statusBarInner.style.background =
          statusText.includes('הסתערות') ? '#ef4444' :
          statusText.includes('ירי')     ? '#3b82f6' :
          statusText.includes('כיסוי')   ? '#3b82f6' :
          statusText.includes('תנועה')   ? '#f59e0b' :
          statusText.includes('נסיגה')   ? '#6b7280' :
          '#22c55e'
      }

      // active unit visual effects (pulse glow + sonar ring)
      const isActive = (ACTIVE_UNITS[phase]??[]).includes(unitId)
      if (innerEl) innerEl.style.animation = isActive ? 'simPulse 1.4s ease-in-out infinite' : ''
      if (ringEl)  ringEl.style.animation  = isActive ? 'unitRing 1.8s ease-out infinite'    : ''
    }

    // 2. Camera — manual centroid flyTo (NO fitBounds, NO bearing — avoids RTL offset bugs)
    //    All units always in frame: zoom derived from unit spread, bearing always 0.
    const cam = data.camera
    const unitPositions = Object.values(data.units)   // [[lng,lat], ...]
    const lngs = unitPositions.map(p => p[0])
    const lats = unitPositions.map(p => p[1])

    // Include special markers (helicopter, tank) so they never fall off-screen.
    // These are outside data.units so must be added explicitly per phase.
    // Phase 3+4: tank at [35.217, 31.825]
    if (phase === 3 || phase === 4) { lngs.push(35.217); lats.push(31.825) }
    // Phase 5: helicopter starts at [35.220, 31.828] and flies to [35.228, 31.837]
    if (phase === 5) { lngs.push(35.220, 35.228); lats.push(31.828, 31.837) }

    // Extra south padding: info banners hang ~120px BELOW each marker coordinate.
    // At zoom 12.5, 1° lat ≈ 9400px → 120px ≈ 0.013°. Use 0.018° to be safe.
    const BANNER_PAD = 0.018
    const southLat = Math.min(...lats) - BANNER_PAD

    // geographic center of all units this phase (shift slightly north for south banner room)
    const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    const cLat = (southLat + Math.max(...lats)) / 2
    // max deviation from center → determines required zoom
    const maxDev = Math.max(
      Math.max(...lngs) - cLng,
      cLng - Math.min(...lngs),
      (Math.max(...lats) - cLat) * 1.4,   // lat×1.4: account for pitch compression on north
      (cLat - southLat) * 1.4,            // south deviation includes banner pad
      0.020,                               // minimum half-extent ~2.2km
    )
    // at zoom Z, degrees/pixel ≈ 360/(256×2^Z)
    // effective half = 170px (conservative — leaves HUD + banner headroom)
    // zoom = log2( 170 × 360 / (256 × maxDev) )
    const targetZoom = Math.log2((170 * 360) / (256 * maxDev))
    const zoom = Math.min(13.0, Math.max(11.0, targetZoom))

    map.flyTo({
      center:   [cLng, cLat],
      zoom,
      bearing:  0,                         // always north-up → no rotation confusion
      pitch:    Math.min(cam.pitch, 30),   // ≤30° keeps southern units visible
      duration: 1800,
      essential: true,
    })

    // 3. Fire lines
    const fireLines = FIRE_LINES_DATA[phase] ?? []
    try {
      map.getSource('sim-fire')?.setData({
        type:'FeatureCollection',
        features: fireLines.map(fl=>({
          type:'Feature', properties:{color:fl.color,width:fl.width},
          geometry:{type:'LineString',coordinates:[fl.from,fl.to]}
        }))
      })
    } catch(_){}

    // 4. Fire cones
    try {
      map.getSource('sim-cones')?.setData({
        type:'FeatureCollection', features: FIRE_CONES_DATA[phase]??[]
      })
    } catch(_){}

    // 5. Animate fire line opacity
    cancelAnimationFrame(rafRef.current)
    if (fireLines.length > 0) {
      let tick=0
      const animFire=()=>{ tick++; try{ map.setPaintProperty('sim-fire-lines','line-opacity',0.45+0.5*Math.abs(Math.sin(tick*0.07))) }catch(_){} ; rafRef.current=requestAnimationFrame(animFire) }
      rafRef.current=requestAnimationFrame(animFire)
    } else { try{ map.setPaintProperty('sim-fire-lines','line-opacity',0) }catch(_){} }

    // 6. Objective capture effect
    const capLabel = CAPTURE_AT[phase]
    if (capLabel && !capturedRef.current.has(capLabel)) {
      capturedRef.current.add(capLabel)
      const objEl = objElemsRef.current[capLabel]
      if (objEl) {
        objEl.style.animation='objCapture 1.5s ease-out forwards'
        setTimeout(()=>{
          objEl.textContent='✓'; objEl.style.borderColor='#22c55e'; objEl.style.color='#22c55e'
          objEl.style.boxShadow='0 0 22px rgba(34,197,94,0.8)'; objEl.style.animation=''
          const l=objEl.querySelector('div'); if(l) l.style.color='#86efac'
        },1500)
      }
    }

    // 7. Fog of war
    const fogFeats=[]
    if(phase<4) fogFeats.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[35.222,31.833],[35.234,31.833],[35.234,31.841],[35.222,31.841],[35.222,31.833]]]}})
    if(phase<6) fogFeats.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[35.235,31.838],[35.246,31.838],[35.246,31.847],[35.235,31.847],[35.235,31.838]]]}})
    try{ map.getSource('sim-fog')?.setData({type:'FeatureCollection',features:fogFeats}) }catch(_){}

    // 8. HELICOPTER — phase 5
    //    Camera: center[35.233,31.838] zoom 14.5 → visible ~[35.215–35.251, 31.820–31.856]
    //    Route: [35.220,31.828] → [35.228,31.837] (יעד א׳) → back
    clearInterval(heliTimer.current)
    if(heliRef.current){ heliRef.current.remove(); heliRef.current=null }
    if(phase===5){
      console.log('[SIM] phase 5 — creating helicopter')
      const hw=document.createElement('div')
      hw.style.cssText='position:relative;width:84px;height:84px;overflow:visible;z-index:2000;'

      const hb=document.createElement('div')
      hb.style.cssText=[
        'position:absolute','top:0','left:0',
        'width:84px','height:84px',
        'display:flex','align-items:center','justify-content:center',
        'font-size:50px',
        'border-radius:50%','border:5px solid #22c55e',
        'background:#000000ee',
        'box-shadow:0 0 0 3px #000,0 0 40px rgba(34,197,94,1),0 0 80px rgba(34,197,94,0.7)',
        'animation:heliFloat 0.75s ease-in-out infinite',
      ].join(';')
      hb.textContent='🚁'
      hw.appendChild(hb)

      const hl=document.createElement('div')
      hl.style.cssText='position:absolute;top:92px;left:42px;transform:translateX(-50%);color:#86efac;font-size:12px;font-weight:900;white-space:nowrap;text-shadow:0 0 8px #22c55e,0 2px 6px #000;background:#000000ee;padding:4px 12px;border-radius:6px;pointer-events:none;border:2px solid #22c55e;box-shadow:0 0 16px rgba(34,197,94,0.8);'
      hl.textContent='🚑  פינוי רפואי'
      hw.appendChild(hl)

      const HSTART=[35.220,31.828], HEND=[35.228,31.837]
      const heli=new maplibregl.Marker({element:hw,anchor:'center'}).setLngLat(HSTART).addTo(map)
      heliRef.current=heli

      const STEPS=28; let step=0, returning=false, hovering=0
      const id=setInterval(()=>{
        if(!heliRef.current){clearInterval(id);return}
        if(hovering>0){hovering--;return}
        step++
        const pos = !returning
          ? [HSTART[0]+(HEND[0]-HSTART[0])*step/STEPS, HSTART[1]+(HEND[1]-HSTART[1])*step/STEPS]
          : [HEND[0]+(HSTART[0]-HEND[0])*step/STEPS,   HEND[1]+(HSTART[1]-HEND[1])*step/STEPS]
        heliRef.current.setLngLat(pos)
        if(step>=STEPS){ if(!returning){hovering=6;returning=true;step=0}else clearInterval(id) }
      },250)
      heliTimer.current=id
    }

    // 9. TANK (תמ"ש) — phases 3+4
    //    Phase 3 camera: center[35.222,31.830] zoom 14.5 → visible lng[35.204–35.240] lat[31.817–31.843]
    //    Tank at [35.217,31.825] — confirmed well within view
    if(tankRef.current){tankRef.current.remove();tankRef.current=null}
    if(phase===3||phase===4){
      console.log('[SIM] phase', phase, '— creating tank')
      const tw=document.createElement('div')
      tw.style.cssText='position:relative;width:84px;height:76px;overflow:visible;z-index:2000;'

      const tb=document.createElement('div')
      tb.style.cssText=[
        'position:absolute','top:0','left:0',
        'width:84px','height:76px',
        'display:flex','flex-direction:column','align-items:center','justify-content:center','gap:4px',
        'border:5px solid #f59e0b','border-radius:12px',
        'background:#000000ee',
        'box-shadow:0 0 0 3px #000,0 0 40px rgba(245,158,11,1),0 0 80px rgba(245,158,11,0.7)',
        phase===3?'animation:tankFire 0.4s ease-out 6':'',
      ].join(';')

      const ti=document.createElement('div')
      ti.style.cssText='font-size:36px;line-height:1;'
      ti.textContent='💥'
      const tt=document.createElement('div')
      tt.style.cssText='color:#fbbf24;font-size:11px;font-weight:900;line-height:1;letter-spacing:1px;text-shadow:0 0 8px #f59e0b;'
      tt.textContent='תמ"ש'
      tb.appendChild(ti); tb.appendChild(tt)

      const tl=document.createElement('div')
      tl.style.cssText='position:absolute;top:83px;left:42px;transform:translateX(-50%);color:#fbbf24;font-size:11px;font-weight:900;white-space:nowrap;text-shadow:0 0 8px #f59e0b,0 2px 5px #000;background:#000000ee;padding:4px 12px;border-radius:6px;pointer-events:none;border:2px solid #f59e0b;box-shadow:0 0 16px rgba(245,158,11,0.8);'
      tl.textContent='🔴 תמיכת ירי שריון'
      tw.appendChild(tb); tw.appendChild(tl)

      const tank=new maplibregl.Marker({element:tw,anchor:'center'}).setLngLat([35.217,31.825]).addTo(map)
      tankRef.current=tank
    }

  }, [phase, mapReady])

  // ── TTS ───────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!ttsEnabled)return
    try{
      window.speechSynthesis.cancel()
      const u=new SpeechSynthesisUtterance(SIM_PHASES[phase].narration)
      u.lang='he-IL'; u.rate=0.88; u.pitch=1.0
      const v=window.speechSynthesis.getVoices().find(x=>x.lang==='he-IL'||x.lang==='he')
      if(v)u.voice=v
      window.speechSynthesis.speak(u)
    }catch(_){}
    return()=>{ try{window.speechSynthesis.cancel()}catch(_){} }
  },[phase,ttsEnabled])

  // ── SADAN show_unit — zoom in briefly, then return to fitBounds ─────────
  useEffect(()=>{
    const onShowUnit=e=>{
      const uid=e.detail?.unit_id
      const phaseData=SIM_PHASES[phase]
      const pos=phaseData.units[uid]
      if(!pos||!mapRef.current)return
      const m=mapRef.current
      // zoom in on the unit
      m.flyTo({center:pos,zoom:15,pitch:40,bearing:0,duration:1500,essential:true})
      // highlight the element
      const el=document.getElementById(`sim-unit-${uid}`)
      if(el){el.style.transform='scale(1.7)';el.style.zIndex='999';setTimeout(()=>{el.style.transform='';el.style.zIndex=''},1400)}
      // after 4s return to all-units view (same centroid logic as phase effect)
      setTimeout(()=>{
        if(!mapRef.current)return
        const positions=Object.values(phaseData.units)
        const lngs=positions.map(p=>p[0]),lats=positions.map(p=>p[1])
        // include special markers per phase
        if(phase===3||phase===4){lngs.push(35.217);lats.push(31.825)}
        if(phase===5){lngs.push(35.220,35.228);lats.push(31.828,31.837)}
        const BANNER_PAD=0.018
        const southLat=Math.min(...lats)-BANNER_PAD
        const cLng=(Math.min(...lngs)+Math.max(...lngs))/2
        const cLat=(southLat+Math.max(...lats))/2
        const maxDev=Math.max(Math.max(...lngs)-cLng,cLng-Math.min(...lngs),(Math.max(...lats)-cLat)*1.4,(cLat-southLat)*1.4,0.020)
        const zoom=Math.min(13.0,Math.max(11.0,Math.log2((170*360)/(256*maxDev))))
        mapRef.current.flyTo({center:[cLng,cLat],zoom,bearing:0,pitch:25,duration:1600,essential:true})
      },4000)
    }
    window.addEventListener('sadan:sim_show_unit',onShowUnit)
    return()=>window.removeEventListener('sadan:sim_show_unit',onShowUnit)
  },[phase])

  // ── 2D / 3D toggle ───────────────────────────────────────────────────────
  function toggle3d() {
    const m = mapRef.current; if (!m) return
    if (is3d) {
      m.flyTo({ pitch: 0, bearing: 0, duration: 900, essential: true })
      setIs3d(false)
    } else {
      // restore 3D with pitch, bearing stays 0 to avoid offset
      m.flyTo({ pitch: Math.min(SIM_PHASES[phase].camera.pitch, 30), bearing: 0, duration: 900, essential: true })
      setIs3d(true)
    }
  }

  // ── marker scale ─────────────────────────────────────────────────────────
  useEffect(() => {
    Object.values(markersRef.current).forEach(({ inner }) => {
      if (inner) inner.style.transform = `scale(${markerScale})`
    })
  }, [markerScale])

  // ── next-phase route lines ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    const src = mapRef.current.getSource('sim-next-routes')
    if (!src) return
    if (!showNextRoute || phase >= SIM_PHASES.length - 1) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    const curr = SIM_PHASES[phase].units
    const next = SIM_PHASES[phase + 1].units
    const features = []
    Object.keys(curr).forEach(uid => {
      const unit = SIM_UNITS[uid]
      const from = curr[uid], to = next[uid]
      if (!from || !to) return
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [from, to] },
        properties: { color: unit.color, uid, type: 'route' },
      })
      // endpoint dot
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: to },
        properties: { color: unit.color, uid, type: 'endpoint' },
      })
    })
    src.setData({ type: 'FeatureCollection', features })
  }, [showNextRoute, phase])

  // ── OPFOR highlight ──────────────────────────────────────────────────────
  useEffect(() => {
    Object.values(opforElemsRef.current).forEach(({ el, lbl }) => {
      if (!el) return
      el.style.opacity  = opforHighlight ? '1'   : '0.28'
      el.style.transform = opforHighlight ? 'scale(1.15)' : 'scale(0.7)'
      if (lbl) lbl.style.opacity = opforHighlight ? '1' : '0.3'
    })
  }, [opforHighlight])

  // ── SADAN events for new features ────────────────────────────────────────
  useEffect(() => {
    const onScale  = e => {
      const { delta, scale } = e.detail ?? {}
      if (scale !== undefined) {
        setMarkerScale(Math.min(1.6, Math.max(0.35, scale)))
      } else if (delta !== undefined) {
        setMarkerScale(prev => Math.min(1.6, Math.max(0.35, prev + delta)))
      }
    }
    const onRoute  = () => setShowNextRoute(v => !v)
    const onOpfor  = () => setOpforHighlight(v => !v)
    window.addEventListener('sadan:marker_scale', onScale)
    window.addEventListener('sadan:toggle_route', onRoute)
    window.addEventListener('sadan:toggle_opfor', onOpfor)
    return () => {
      window.removeEventListener('sadan:marker_scale', onScale)
      window.removeEventListener('sadan:toggle_route', onRoute)
      window.removeEventListener('sadan:toggle_opfor', onOpfor)
    }
  }, [])

  // ── reset ─────────────────────────────────────────────────────────────────
  function handleReset(){
    pause()
    capturedRef.current=new Set()
    Object.values(objElemsRef.current).forEach(el=>{
      if(!el)return
      el.textContent='✕'; el.style.borderColor='#ef4444'; el.style.color='#ef4444'
      el.style.boxShadow='0 0 18px rgba(239,68,68,0.7)'; el.style.animation='objPulse 2s ease-in-out infinite'
      const l=el.querySelector('div'); if(l)l.style.color='#fca5a5'
    })
    trailsRef.current={kitaA:[],kitaB:[],kitaG:[],mm:[]}
    try{ mapRef.current?.getSource('sim-trails')?.setData({type:'FeatureCollection',features:[]}) }catch(_){}
    gotoPhase(0)
  }

  const progress=(phase/(total-1))*100

  return (
    <div className="flex flex-col h-dvh bg-demo-bg" dir="rtl">
      {/* top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-demo-surface border-b border-demo-border z-10">
        <button onClick={()=>navigate('/exercise')} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
          <ChevronLeft size={16}/> חזרה לתיק
        </button>
        <div className="w-px h-5 bg-demo-border"/>
        <div className="flex items-center gap-2">
          <Crosshair size={15} className="text-demo-gold"/>
          <span className="text-white font-bold text-sm">סימולציה טקטית — מחלקה ב׳ | שטח 309ה</span>
        </div>
        <div className="flex-1 min-w-0"><PhaseBar phase={phase} onGoto={gotoPhase}/></div>
        <button onClick={toggle3d} title={is3d?'תצוגה דו-מימדית (2D)':'תצוגה תלת-מימדית (3D)'}
          className={`p-1.5 rounded-lg transition-colors ${is3d?'text-demo-gold bg-demo-gold/10':'text-gray-500 hover:text-gray-300'}`}>
          <Layers size={15}/>
        </button>
        {/* next-route toggle */}
        <button onClick={()=>setShowNextRoute(v=>!v)}
          title={showNextRoute ? 'הסתר מסלול לשלב הבא' : 'הצג מסלול לשלב הבא'}
          className={`p-1.5 rounded-lg transition-colors text-xs font-bold ${showNextRoute?'text-green-400 bg-green-400/10 border border-green-400/30':'text-gray-500 hover:text-gray-300'}`}>
          🗺
        </button>
        {/* OPFOR toggle */}
        <button onClick={()=>setOpforHighlight(v=>!v)}
          title={opforHighlight ? 'הסתר בימוי אויב' : 'הבלט בימוי אויב'}
          className={`p-1.5 rounded-lg transition-colors text-xs font-bold ${opforHighlight?'text-red-400 bg-red-400/10 border border-red-400/30':'text-gray-500 hover:text-gray-300'}`}>
          🎯
        </button>
        <button onClick={()=>setTtsEnabled(v=>!v)} title={ttsEnabled?'כבה קריינות':'הפעל קריינות'}
          className={`p-1.5 rounded-lg transition-colors ${ttsEnabled?'text-demo-gold bg-demo-gold/10':'text-gray-600 hover:text-gray-300'}`}>
          {ttsEnabled?<Volume2 size={15}/>:<VolumeX size={15}/>}
        </button>
        <div className="bg-demo-card border border-demo-border rounded-lg px-3 py-1 flex-shrink-0">
          <span className="text-demo-gold font-black text-sm">{currentData.time}</span>
          <span className="text-gray-500 text-xs mr-1.5">{currentData.longLabel.split(' — ')[0]}</span>
        </div>
      </div>

      {/* map — dir:ltr mandatory: RTL on parent causes MapLibre coordinate offset bugs */}
      <div className="flex-1 relative min-h-0" dir="ltr">
        <div ref={mapElRef} className="w-full h-full" style={{direction:'ltr'}}/>

        {/* מידע — שלב + מצב כוח מאוחדים, פינה אחת בלבד (שמאל-עליון) */}
        <InfoPanel phase={phase} visible={hudVisible} onToggle={()=>setHudVisible(v=>!v)}/>

        {/* פרטי יחידה בלחיצה — ימין-תחתון (פינה חופשית, לא מתנגש עם המידע) */}
        {unitInfo && (
          <div className="absolute bottom-4 right-4 z-30 bg-demo-surface/95 border border-demo-border rounded-xl p-3 w-56 backdrop-blur" dir="rtl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-black"
                  style={{border:`2px solid ${unitInfo.color}`,color:unitInfo.color,background:`${unitInfo.color}20`}}>
                  {unitInfo.icon}
                </div>
                <span className="text-white font-bold text-sm">{unitInfo.label}</span>
              </div>
              <button onClick={()=>setUnitInfo(null)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="space-y-1 text-xs">
              <div><span className="text-gray-500">מפקד:</span> <span className="text-gray-200">{unitInfo.commander}</span></div>
              <div><span className="text-gray-500">אות קריאה:</span> <span className="text-demo-gold font-bold">{unitInfo.callsign}</span></div>
              <div><span className="text-gray-500">תפקיד:</span> <span className="text-gray-200">{unitInfo.role}</span></div>
              <div><span className="text-gray-500">סטטוס:</span> <span className="text-green-300 font-bold">{UNIT_STATUS[phase]?.[unitInfo.id]??'—'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* narration */}
      <div className="flex-shrink-0 bg-demo-surface/95 border-t border-demo-border px-5 py-2.5 min-h-[52px] flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-demo-gold flex items-center justify-center text-black font-black text-xs flex-shrink-0">ס</div>
        <p className="text-gray-200 text-sm leading-relaxed flex-1" dir="rtl">{currentData.narration}</p>
      </div>

      {/* controls */}
      <div className="flex-shrink-0 bg-demo-surface border-t border-demo-border px-5 py-3 flex items-center gap-3">
        <button onClick={handleReset} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-demo-card transition-colors" title="התחל מחדש">
          <RotateCcw size={16}/>
        </button>
        {/* marker scale */}
        <div className="flex items-center gap-0.5 bg-demo-card border border-demo-border rounded-lg px-1">
          <button
            onClick={()=>setMarkerScale(v=>Math.max(0.35,v-0.2))}
            className="w-6 h-6 text-gray-400 hover:text-white font-bold text-base leading-none transition-colors"
            title="הקטן סימונים">−</button>
          <span className="text-[10px] text-gray-500 w-8 text-center">{Math.round(markerScale*100)}%</span>
          <button
            onClick={()=>setMarkerScale(v=>Math.min(1.6,v+0.2))}
            className="w-6 h-6 text-gray-400 hover:text-white font-bold text-base leading-none transition-colors"
            title="הגדל סימונים">+</button>
        </div>
        <button onClick={prevPhase} disabled={phase===0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-demo-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm">
          <ChevronRight size={15}/> קודם
        </button>
        <button onClick={togglePlay} disabled={phase>=total-1&&!playing}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            playing
              ? 'bg-demo-warning/20 border border-demo-warning/50 text-demo-warning hover:bg-demo-warning/30'
              : 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90'
          } disabled:opacity-40 disabled:cursor-not-allowed`}>
          {playing?<><Pause size={15}/> עצור</>:<><Play size={15}/> הפעל</>}
        </button>
        <button onClick={nextPhase} disabled={phase>=total-1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-demo-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm">
          הבא <ChevronLeft size={15}/>
        </button>
        <div className="flex-1 mr-2">
          <div className="flex justify-between text-[10px] text-gray-600 mb-1">
            <span>כינוס</span>
            <span className="text-demo-gold font-bold">{currentData.longLabel}</span>
            <span>נסיגה</span>
          </div>
          <div className="w-full h-1.5 bg-demo-card rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-l from-demo-gold to-yellow-500 rounded-full transition-all duration-700"
              style={{width:`${progress}%`}}/>
          </div>
        </div>
      </div>
    </div>
  )
}

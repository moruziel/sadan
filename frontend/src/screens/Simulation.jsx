// Simulation.jsx — סימולציה טקטית
// KEY ARCHITECTURE NOTE:
//   MapLibre sets element.style.transform on EVERY render frame to position HTML markers.
//   Therefore: NEVER put transition:transform on the marker wrapper — it fights MapLibre.
//   Smooth geographic movement = interpolate lngLat + call setLngLat() each rAF frame.
import { useEffect, useRef, useState } from 'react'
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

// ── fire sector cones per phase ───────────────────────────────────────────────
const FIRE_CONES_DATA = {
  3: [fireCone([35.228,31.820],355,25,0.85)],
  4: [fireCone([35.228,31.820],355,25,0.85)],
  5: [fireCone([35.245,31.836],0,30,0.75)],
  6: [fireCone([35.228,31.820],355,25,0.85),fireCone([35.245,31.836],0,30,0.75)],
}

// ── unit marker — NO transition:transform (MapLibre owns that property) ───────
function createUnitEl(unit) {
  const S = 48  // marker size px

  // wrap: MapLibre controls transform — NO CSS transition here
  const wrap = document.createElement('div')
  wrap.style.cssText = `width:${S}px;height:${S}px;position:relative;overflow:visible;`

  // sonar-ping ring (child element — CSS animation fine here, not transform)
  const ring = document.createElement('div')
  ring.id = `sim-ring-${unit.id}`
  ring.style.cssText = [
    'position:absolute',`top:${S/2}px`,`left:${S/2}px`,
    `width:${S+20}px`,`height:${S+20}px`,
    'border-radius:50%',
    `border:3px solid ${unit.color}`,
    'transform:translate(-50%,-50%) scale(0.7)',
    'opacity:0','pointer-events:none',
  ].join(';')
  wrap.appendChild(ring)

  // direction arrow
  const arrow = document.createElement('div')
  arrow.id = `sim-arrow-${unit.id}`
  arrow.style.cssText = [
    'position:absolute',`top:-17px`,`left:${S/2}px`,
    'transform:translateX(-50%) rotate(0deg)',
    'width:0','height:0',
    'border-left:7px solid transparent','border-right:7px solid transparent',
    `border-bottom:14px solid ${unit.color}`,
    'opacity:0.9','transition:transform 1.8s ease','pointer-events:none',
  ].join(';')
  wrap.appendChild(arrow)

  // icon square — visual animations (glow pulse) are fine on this child
  const el = document.createElement('div')
  el.id = `sim-unit-${unit.id}`
  el.style.cssText = [
    `width:${S}px`,`height:${S}px`,
    'display:flex','align-items:center','justify-content:center',
    `border:3px solid ${unit.color}`,'border-radius:7px',
    `background:${unit.color}40`,`color:${unit.color}`,
    'font-size:18px','font-weight:900',
    `box-shadow:0 0 22px ${unit.color},0 0 45px ${unit.color}70,0 4px 10px rgba(0,0,0,0.9)`,
    'cursor:pointer','user-select:none','backdrop-filter:blur(4px)',
    'position:absolute','top:0','left:0',
  ].join(';')
  el.style.setProperty('--bs-normal',`0 0 22px ${unit.color},0 0 45px ${unit.color}70,0 4px 10px rgba(0,0,0,0.9)`)
  el.style.setProperty('--bs-pulse', `0 0 40px ${unit.color},0 0 80px ${unit.color}90,0 4px 10px rgba(0,0,0,0.9)`)
  el.textContent = unit.icon

  // label
  const lbl = document.createElement('div')
  lbl.style.cssText = [
    'position:absolute',`top:${S+5}px`,`left:${S/2}px`,
    'transform:translateX(-50%)',
    `color:${unit.color}`,'font-size:11px','font-weight:900',
    'white-space:nowrap','text-shadow:0 1px 5px #000,0 0 12px #000',
    'background:rgba(0,0,0,0.9)','padding:2px 7px','border-radius:4px',
    'pointer-events:none','line-height:1.5',
  ].join(';')
  lbl.textContent = unit.label

  wrap.appendChild(el)
  wrap.appendChild(lbl)
  return { wrap, el, arrow, ring }
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
            <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{ border:`2px solid ${unit.color}`, color:unit.color, background:`${unit.color}20` }}>
              {unit.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs font-bold">{unit.callsign}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
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

// ── Phase title card — top-left, slides in from left ─────────────────────────
function PhaseTitleCard({ phase }) {
  const data = SIM_PHASES[phase]
  const tact = PHASE_TACTICAL[phase]
  return (
    <div className="absolute top-4 left-4 z-40 pointer-events-none" dir="rtl">
      <div className="bg-demo-surface/97 border border-demo-gold/55 rounded-2xl shadow-2xl"
        style={{ backdropFilter:'blur(14px)', animation:'phaseCardIn 7s ease-in-out forwards',
                 width:'260px', padding:'16px 20px' }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl leading-none flex-shrink-0">{tact?.icon ?? '⚡'}</span>
          <div>
            <div className="text-demo-gold font-black text-base leading-tight">{data.longLabel}</div>
            <div className="text-gray-400 text-xs mt-0.5">{data.time}</div>
          </div>
        </div>
        {tact?.details && (
          <div className="space-y-1 border-t border-demo-border/50 pt-2.5 mt-2.5">
            {tact.details.map((d, i) => (
              <div key={i} className="text-gray-300 text-xs leading-relaxed flex items-start gap-1.5">
                <span className="text-demo-gold/60 flex-shrink-0 mt-0.5">·</span>
                <span>{d}</span>
              </div>
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

  const [mapReady,   setMapReady]   = useState(false)
  const [unitInfo,   setUnitInfo]   = useState(null)
  const [hudVisible, setHudVisible] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [showCard,   setShowCard]   = useState(false)
  const [cardPhase,  setCardPhase]  = useState(0)

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

      // ── unit markers — no CSS transition, coord-animation drives movement ──
      for (const [unitId, unit] of Object.entries(SIM_UNITS)) {
        const { wrap, el, arrow, ring } = createUnitEl(unit)
        const pos = SIM_PHASES[0].units[unitId]
        el.addEventListener('click', () => {
          setUnitInfo(prev => prev?.id===unitId ? null : { ...unit, pos })
        })
        const marker = new maplibregl.Marker({ element: wrap, anchor: 'center' })
          .setLngLat(pos).addTo(map)
        markersRef.current[unitId]  = { marker, el, arrow, ring }
        prevPosRef.current[unitId]  = pos
        trailsRef.current[unitId]   = [pos]
      }

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
    window.addEventListener('sadan:map_command',onMapCmd)
    window.addEventListener('sadan:toggle3d',onToggle3d)

    return () => {
      window.removeEventListener('sadan:map_command',onMapCmd)
      window.removeEventListener('sadan:toggle3d',onToggle3d)
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

      // start coordinate animation (smooth geographic movement)
      if (marker) {
        unitRafsRef.current[unitId] = animateMarkerTo(
          marker, fromPos, toPos, 2200,
          // on done: update trail + prevPos
          () => {
            prevPosRef.current[unitId] = toPos
            const trail = trailsRef.current[unitId]
            trail.push(toPos)
            if (trail.length > 5) trail.shift()
            // update trail layer
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
      }

      // direction arrow
      if (arrowEl && next) {
        const b = calcBearing(toPos, next.units[unitId] ?? toPos)
        arrowEl.style.transform = `translateX(-50%) rotate(${b}deg)`
      }

      // active unit visual effects (pulse glow + sonar ring)
      const isActive = (ACTIVE_UNITS[phase]??[]).includes(unitId)
      if (innerEl) innerEl.style.animation = isActive ? 'simPulse 1.4s ease-in-out infinite' : ''
      if (ringEl)  ringEl.style.animation  = isActive ? 'unitRing 1.8s ease-out infinite'    : ''
    }

    // 2. Camera fly
    const cam = data.camera
    map.flyTo({ center:cam.center, zoom:cam.zoom, bearing:cam.bearing, pitch:cam.pitch,
                duration:1800, essential:true })

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
      const hw=document.createElement('div')
      hw.style.cssText='position:relative;width:64px;height:64px;overflow:visible;z-index:500;'

      const hb=document.createElement('div')
      hb.style.cssText=[
        'position:absolute','top:0','left:0',
        'width:64px','height:64px',
        'display:flex','align-items:center','justify-content:center',
        'font-size:38px',
        'border-radius:50%','border:4px solid #22c55e',
        'background:rgba(34,197,94,0.25)',
        'box-shadow:0 0 35px rgba(34,197,94,1),0 0 70px rgba(34,197,94,0.6)',
        'animation:heliFloat 0.75s ease-in-out infinite',
      ].join(';')
      hb.textContent='🚁'
      hw.appendChild(hb)

      const hl=document.createElement('div')
      hl.style.cssText='position:absolute;top:70px;left:32px;transform:translateX(-50%);color:#86efac;font-size:11px;font-weight:900;white-space:nowrap;text-shadow:0 2px 6px #000;background:rgba(0,0,0,0.92);padding:3px 9px;border-radius:5px;pointer-events:none;border:1px solid rgba(34,197,94,0.4);'
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
      const tw=document.createElement('div')
      tw.style.cssText='position:relative;width:70px;height:62px;overflow:visible;z-index:500;'

      const tb=document.createElement('div')
      tb.style.cssText=[
        'position:absolute','top:0','left:0',
        'width:70px','height:62px',
        'display:flex','flex-direction:column','align-items:center','justify-content:center','gap:3px',
        'border:4px solid #f59e0b','border-radius:10px',
        'background:rgba(245,158,11,0.28)',
        'box-shadow:0 0 35px rgba(245,158,11,1),0 0 70px rgba(245,158,11,0.65)',
        phase===3?'animation:tankFire 0.4s ease-out 6':'',
      ].join(';')

      const ti=document.createElement('div')
      ti.style.cssText='font-size:28px;line-height:1;'
      ti.textContent='💥'
      const tt=document.createElement('div')
      tt.style.cssText='color:#fbbf24;font-size:10px;font-weight:900;line-height:1;letter-spacing:1px;'
      tt.textContent='תמ"ש'
      tb.appendChild(ti); tb.appendChild(tt)

      const tl=document.createElement('div')
      tl.style.cssText='position:absolute;top:68px;left:35px;transform:translateX(-50%);color:#fbbf24;font-size:10px;font-weight:900;white-space:nowrap;text-shadow:0 2px 5px #000;background:rgba(0,0,0,0.92);padding:3px 9px;border-radius:5px;pointer-events:none;border:1px solid rgba(245,158,11,0.5);'
      tl.textContent='🔴 תמיכת ירי שריון'
      tw.appendChild(tb); tw.appendChild(tl)

      const tank=new maplibregl.Marker({element:tw,anchor:'center'}).setLngLat([35.217,31.825]).addTo(map)
      tankRef.current=tank
    }

  }, [phase, mapReady])

  // ── cinematic camera drift while playing ─────────────────────────────────
  useEffect(() => {
    clearInterval(cinRef.current)
    if(playing && mapRef.current){
      let tick=0
      cinRef.current=setInterval(()=>{
        const m=mapRef.current; if(!m)return
        tick++
        m.setBearing(SIM_PHASES[phase].camera.bearing + Math.sin(tick*0.06)*8)
      },100)
    }
    return()=>clearInterval(cinRef.current)
  },[playing,phase])

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

  // ── phase title card ──────────────────────────────────────────────────────
  useEffect(()=>{
    setCardPhase(phase); setShowCard(true)
    const t=setTimeout(()=>setShowCard(false),7000)
    return()=>clearTimeout(t)
  },[phase])

  // ── SADAN show_unit ───────────────────────────────────────────────────────
  useEffect(()=>{
    const onShowUnit=e=>{
      const uid=e.detail?.unit_id, pos=SIM_PHASES[phase].units[uid]
      if(!pos||!mapRef.current)return
      mapRef.current.flyTo({center:pos,zoom:16,pitch:60,bearing:0,duration:1500,essential:true})
      const el=document.getElementById(`sim-unit-${uid}`)
      if(el){el.style.transform='scale(1.7)';el.style.zIndex='999';setTimeout(()=>{el.style.transform='';el.style.zIndex=''},1400)}
    }
    window.addEventListener('sadan:sim_show_unit',onShowUnit)
    return()=>window.removeEventListener('sadan:sim_show_unit',onShowUnit)
  },[phase])

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
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
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
        <button onClick={()=>setTtsEnabled(v=>!v)} title={ttsEnabled?'כבה קריינות':'הפעל קריינות'}
          className={`p-1.5 rounded-lg transition-colors ${ttsEnabled?'text-demo-gold bg-demo-gold/10':'text-gray-600 hover:text-gray-300'}`}>
          {ttsEnabled?<Volume2 size={15}/>:<VolumeX size={15}/>}
        </button>
        <div className="bg-demo-card border border-demo-border rounded-lg px-3 py-1 flex-shrink-0">
          <span className="text-demo-gold font-black text-sm">{currentData.time}</span>
          <span className="text-gray-500 text-xs mr-1.5">{currentData.longLabel.split(' — ')[0]}</span>
        </div>
      </div>

      {/* map */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapElRef} className="w-full h-full"/>

        {showCard && <PhaseTitleCard phase={cardPhase}/>}
        <HUDPanel phase={phase} visible={hudVisible} onToggle={()=>setHudVisible(false)}/>
        {!hudVisible && (
          <button onClick={()=>setHudVisible(true)}
            className="absolute top-4 right-4 z-30 bg-demo-surface/90 border border-demo-border rounded-xl px-3 py-2 text-xs text-demo-gold/80 backdrop-blur">
            📡 מצב כוח
          </button>
        )}

        {unitInfo && (
          <div className="absolute top-4 left-4 z-30 bg-demo-surface/95 border border-demo-border rounded-xl p-3 w-56 backdrop-blur" dir="rtl">
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

        <div className="absolute bottom-4 left-4 z-20 bg-black/60 border border-demo-gold/30 rounded-xl px-3 py-2 text-xs text-demo-gold/80 backdrop-blur max-w-xs" dir="rtl">
          💬 <span className="font-semibold">סדן</span> — "עצור", "המשך", "קפוץ לשלב כיסוי", "תראה לי כיתה ב׳"
        </div>
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

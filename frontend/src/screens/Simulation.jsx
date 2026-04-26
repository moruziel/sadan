// Simulation.jsx — סימולציה טקטית על מפה אמיתית
// MapLibre 3D + מרקרים זזים + שליטה בקול (Gemini Live)
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Crosshair } from 'lucide-react'
import { AREA_309 } from '../data/mockData'
import { SIM_UNITS, SIM_PHASES } from '../data/simulationData'
import useSimulation from '../hooks/useSimulation'

// ── map style (same as MapView.jsx) ──────────────────────────────────────────
const MAP_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap Contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
}

// ── create HTML element for a unit marker ────────────────────────────────────
function createUnitEl(unit) {
  const wrap = document.createElement('div')
  wrap.style.cssText = [
    'position:relative',
    'z-index:100',
    // CSS transition on the wrapper — MapLibre sets transform here
    'transition:transform 2.2s cubic-bezier(0.4,0,0.2,1)',
  ].join(';')

  const el = document.createElement('div')
  el.style.cssText = [
    'width:34px', 'height:34px',
    'display:flex', 'align-items:center', 'justify-content:center',
    `border:2.5px solid ${unit.color}`,
    'border-radius:4px',
    `background:${unit.color}25`,
    `color:${unit.color}`,
    'font-size:13px', 'font-weight:900',
    `box-shadow:0 0 14px ${unit.color}70, 0 2px 6px rgba(0,0,0,0.7)`,
    'cursor:pointer',
    'user-select:none',
    'backdrop-filter:blur(2px)',
  ].join(';')
  el.textContent = unit.icon
  el.id = `sim-unit-${unit.id}`

  // label under marker
  const lbl = document.createElement('div')
  lbl.style.cssText = [
    'position:absolute', 'bottom:-17px', 'left:50%',
    'transform:translateX(-50%)',
    `color:${unit.color}`,
    'font-size:9px', 'font-weight:700',
    'white-space:nowrap',
    'text-shadow:0 1px 4px #000,0 0 8px #000',
    'background:rgba(0,0,0,0.75)',
    'padding:1px 5px', 'border-radius:3px',
    'pointer-events:none',
  ].join(';')
  lbl.textContent = unit.label

  wrap.appendChild(el)
  wrap.appendChild(lbl)
  return { wrap, el }
}

// ── phase step indicators ─────────────────────────────────────────────────────
function PhaseBar({ phase, total, onGoto }) {
  return (
    <div className="flex items-center gap-1 flex-1 justify-center">
      {SIM_PHASES.map((p, i) => (
        <button
          key={i}
          onClick={() => onGoto(i)}
          title={p.longLabel}
          className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded transition-all ${
            i === phase
              ? 'bg-demo-gold/20 border border-demo-gold/60'
              : i < phase
              ? 'opacity-60'
              : 'opacity-30'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${
            i < phase  ? 'bg-demo-gold' :
            i === phase ? 'bg-demo-gold animate-pulse' :
                          'bg-gray-600'
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
  const navigate  = useNavigate()
  const mapElRef  = useRef(null)
  const mapRef    = useRef(null)
  const markersRef = useRef({})  // { kitaA: maplibregl.Marker, ... }
  const [mapReady, setMapReady] = useState(false)
  const [unitInfo, setUnitInfo] = useState(null)  // popup when clicking a unit

  const sim = useSimulation()
  const { phase, playing, currentData, total, togglePlay, nextPhase, prevPhase, gotoPhase, pause, play, isLast } = sim

  // ── init map ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapElRef.current,
      style: MAP_STYLE,
      center: SIM_PHASES[0].camera.center,
      zoom:   SIM_PHASES[0].camera.zoom,
      bearing: SIM_PHASES[0].camera.bearing,
      pitch:  SIM_PHASES[0].camera.pitch,
      dragRotate: true,
      pitchWithRotate: true,
      maxPitch: 80,
    })
    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl(), 'top-left')

    map.on('load', () => {
      // ── terrain ──
      map.addSource('terrain', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium', tileSize: 256, maxzoom: 14,
      })
      map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'terrain',
        paint: { 'hillshade-exaggeration': 0.35 } })

      // ── AREA_309 GeoJSON — all tactical data ──
      map.addSource('sim-area', { type: 'geojson', data: AREA_309.geojson })

      // field boundary
      map.addLayer({ id: 'sim-boundary', type: 'fill', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'boundary'],
        paint: { 'fill-color': '#c6953b', 'fill-opacity': 0.06 } })
      map.addLayer({ id: 'sim-boundary-line', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'boundary'],
        paint: { 'line-color': '#c6953b', 'line-width': 2, 'line-dasharray': [5, 3] } })

      // hazard zones
      map.addLayer({ id: 'sim-hazard-fill', type: 'fill', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'hazard_zone'],
        paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'sim-hazard-line', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'hazard_zone'],
        paint: { 'line-color': '#22c55e', 'line-width': 1.5, 'line-dasharray': [3, 2] } })

      // power line
      map.addLayer({ id: 'sim-powerline', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'powerline'],
        paint: { 'line-color': '#fbbf24', 'line-width': 2.5, 'line-dasharray': [8, 3] } })

      // neighbor zones
      map.addLayer({ id: 'sim-neighbor-fill', type: 'fill', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'neighbor_zone'],
        paint: { 'fill-color': '#a855f7', 'fill-opacity': 0.1 } })
      map.addLayer({ id: 'sim-neighbor-line', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'neighbor_zone'],
        paint: { 'line-color': '#a855f7', 'line-width': 2 } })

      // sector boundaries (fire limits)
      map.addLayer({ id: 'sim-sector', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'sector_boundary'],
        paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [8, 4], 'line-opacity': 0.7 } })

      // assault areas
      map.addLayer({ id: 'sim-assault-fill', type: 'fill', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'assault_area'],
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'sim-assault-line', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'assault_area'],
        paint: { 'line-color': '#ef4444', 'line-width': 1.5, 'line-dasharray': [4, 2] } })

      // axis of advance
      map.addLayer({ id: 'sim-axis', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'axis'],
        paint: { 'line-color': '#c6953b', 'line-width': 3, 'line-dasharray': [5, 3], 'line-opacity': 0.7 } })

      // clearance routes
      map.addLayer({ id: 'sim-route', type: 'line', source: 'sim-area',
        filter: ['==', ['get', 'category'], 'clearance_route'],
        paint: { 'line-color': '#22c55e', 'line-width': 2.5, 'line-dasharray': [2, 4], 'line-opacity': 0.85 } })

      // ── reporting points (NP markers) ──
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'reporting_point') return
        if (feat.geometry.type !== 'Point') return
        const el = document.createElement('div')
        el.style.cssText = [
          'width:22px', 'height:22px', 'display:flex', 'align-items:center',
          'justify-content:center', 'border:2px solid #3b82f6', 'border-radius:50%',
          'background:rgba(59,130,246,0.2)', 'color:#93c5fd', 'font-size:9px',
          'font-weight:900', 'box-shadow:0 0 8px rgba(59,130,246,0.5)',
        ].join(';')
        el.textContent = feat.properties.label.replace('נ.ד. ', '')
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(feat.geometry.coordinates)
          .addTo(map)
      })

      // ── SBF positions ──
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'sbf_position') return
        if (feat.geometry.type !== 'Point') return
        const el = document.createElement('div')
        el.style.cssText = [
          'width:26px', 'height:26px', 'display:flex', 'align-items:center',
          'justify-content:center', 'border:2px solid #f97316', 'border-radius:4px',
          'background:rgba(249,115,22,0.2)', 'color:#fdba74', 'font-size:11px',
          'font-weight:900', 'box-shadow:0 0 8px rgba(249,115,22,0.5)',
        ].join(';')
        el.textContent = '🔫'
        const lbl = document.createElement('div')
        lbl.style.cssText = 'position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);color:#fdba74;font-size:8px;font-weight:700;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none;'
        lbl.textContent = feat.properties.label
        el.style.position = 'relative'
        el.appendChild(lbl)
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(feat.geometry.coordinates)
          .addTo(map)
      })

      // ── enemy markers (objectives) ──
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'objective') return
        if (feat.geometry.type !== 'Point') return
        const el = document.createElement('div')
        el.style.cssText = [
          'width:32px', 'height:32px', 'display:flex', 'align-items:center',
          'justify-content:center', 'border:2.5px solid #ef4444', 'border-radius:4px',
          'background:rgba(239,68,68,0.2)', 'color:#ef4444', 'font-size:15px',
          'font-weight:900', 'box-shadow:0 0 14px rgba(239,68,68,0.55)',
          'animation:objPulse 2s ease-in-out infinite',
        ].join(';')
        el.textContent = '✕'
        const lbl = document.createElement('div')
        lbl.style.cssText = 'position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);color:#fca5a5;font-size:9px;font-weight:700;white-space:nowrap;text-shadow:0 1px 3px #000;pointer-events:none;background:rgba(0,0,0,0.7);padding:1px 4px;border-radius:3px;'
        lbl.textContent = feat.properties.label
        el.style.position = 'relative'
        el.appendChild(lbl)
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(feat.geometry.coordinates)
          .addTo(map)
      })

      // safety hazards
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'safety_hazard') return
        if (feat.geometry.type !== 'Point') return
        const el = document.createElement('div')
        el.style.cssText = 'width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(245,158,11,0.2);border:2px solid #f59e0b;border-radius:50%;box-shadow:0 0 10px rgba(245,158,11,0.5);'
        el.textContent = '⚠️'
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(feat.geometry.coordinates)
          .addTo(map)
      })

      // ── unit markers — animated ──
      const phase0 = SIM_PHASES[0]
      for (const [unitId, unit] of Object.entries(SIM_UNITS)) {
        const { wrap, el } = createUnitEl(unit)
        const pos = phase0.units[unitId]

        el.addEventListener('click', () => {
          setUnitInfo(unitInfo?.id === unitId ? null : { ...unit, pos })
        })

        const marker = new maplibregl.Marker({ element: wrap, anchor: 'center' })
          .setLngLat(pos)
          .addTo(map)

        markersRef.current[unitId] = marker
      }

      setMapReady(true)
    })

    // ── listen to SADAN map control events (fly_to, rotate, zoom) ──
    function onMapCmd(e) {
      const m = mapRef.current
      if (!m) return
      const { action, ...p } = e.detail
      if (action === 'fly_to') {
        m.flyTo({ center: [p.lng, p.lat], zoom: p.zoom ?? 14, bearing: p.bearing ?? 0,
          pitch: p.pitch ?? 45, duration: p.duration_ms ?? 1500, essential: true })
      } else if (action === 'zoom') {
        m.flyTo({ zoom: m.getZoom() + p.delta, duration: 800, essential: true })
      } else if (action === 'rotate') {
        m.flyTo({ bearing: p.bearing, pitch: p.pitch >= 0 ? p.pitch : m.getPitch(),
          duration: 1000, essential: true })
      }
    }
    function onToggle3d() {
      const m = mapRef.current; if (!m) return
      const p = m.getPitch()
      m.flyTo({ pitch: p > 10 ? 0 : 55, duration: 900, essential: true })
    }
    window.addEventListener('sadan:map_command', onMapCmd)
    window.addEventListener('sadan:toggle3d', onToggle3d)

    return () => {
      window.removeEventListener('sadan:map_command', onMapCmd)
      window.removeEventListener('sadan:toggle3d', onToggle3d)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── move units + fly camera on phase change ───────────────
  useEffect(() => {
    if (!mapReady) return
    const data = SIM_PHASES[phase]

    // update unit positions — CSS transition handles smooth movement
    for (const [unitId, pos] of Object.entries(data.units)) {
      markersRef.current[unitId]?.setLngLat(pos)
    }

    // fly camera
    const cam = data.camera
    mapRef.current?.flyTo({
      center: cam.center, zoom: cam.zoom,
      bearing: cam.bearing, pitch: cam.pitch,
      duration: 1800, essential: true,
    })
  }, [phase, mapReady])

  // ── listen for sim_show_unit from SADAN ───────────────────
  useEffect(() => {
    function onShowUnit(e) {
      const unitId = e.detail?.unit_id
      const pos = SIM_PHASES[phase].units[unitId]
      if (!pos || !mapRef.current) return
      mapRef.current.flyTo({
        center: pos, zoom: 16, pitch: 60, bearing: 0, duration: 1500, essential: true,
      })
      // flash highlight
      const el = document.getElementById(`sim-unit-${unitId}`)
      if (el) {
        el.style.transform = 'scale(1.5)'
        el.style.zIndex = '999'
        setTimeout(() => { el.style.transform = ''; el.style.zIndex = '' }, 1200)
      }
    }
    window.addEventListener('sadan:sim_show_unit', onShowUnit)
    return () => window.removeEventListener('sadan:sim_show_unit', onShowUnit)
  }, [phase])

  // ── reset ─────────────────────────────────────────────────
  function handleReset() {
    pause()
    gotoPhase(0)
  }

  const progress = ((phase) / (total - 1)) * 100

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
          <PhaseBar phase={phase} total={total} onGoto={gotoPhase} />
        </div>

        {/* time badge */}
        <div className="bg-demo-card border border-demo-border rounded-lg px-3 py-1 flex-shrink-0">
          <span className="text-demo-gold font-black text-sm">{currentData.time}</span>
          <span className="text-gray-500 text-xs mr-1.5">{currentData.longLabel.split(' — ')[0]}</span>
        </div>
      </div>

      {/* ── map ── */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapElRef} className="w-full h-full" />

        {/* unit info popup */}
        {unitInfo && (
          <div
            className="absolute top-4 left-4 z-30 bg-demo-surface/95 border border-demo-border rounded-xl p-3 w-56 backdrop-blur"
            dir="rtl"
          >
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
            </div>
          </div>
        )}

        {/* SADAN hint */}
        <div className="absolute bottom-4 left-4 z-20 bg-black/60 border border-demo-gold/30 rounded-xl px-3 py-2 text-xs text-demo-gold/80 backdrop-blur max-w-xs" dir="rtl">
          💬 <span className="font-semibold">סדן</span> — "עצור", "המשך", "תראה לי כיתה ב׳", "מה האזימוט לירי ברתק?"
        </div>
      </div>

      {/* ── narration bar ── */}
      <div className="flex-shrink-0 bg-demo-surface/95 border-t border-demo-border px-5 py-2.5 min-h-[52px] flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-demo-gold flex items-center justify-center text-black font-black text-xs flex-shrink-0">
          ס
        </div>
        <p className="text-gray-200 text-sm leading-relaxed flex-1" dir="rtl">
          {currentData.narration}
        </p>
      </div>

      {/* ── controls ── */}
      <div className="flex-shrink-0 bg-demo-surface border-t border-demo-border px-5 py-3 flex items-center gap-3">

        {/* reset */}
        <button
          onClick={handleReset}
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-demo-card transition-colors"
          title="התחל מחדש"
        >
          <RotateCcw size={16} />
        </button>

        {/* prev */}
        <button
          onClick={prevPhase}
          disabled={phase === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-demo-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <ChevronRight size={15} /> קודם
        </button>

        {/* play / pause */}
        <button
          onClick={togglePlay}
          disabled={phase >= total - 1 && !playing}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            playing
              ? 'bg-demo-warning/20 border border-demo-warning/50 text-demo-warning hover:bg-demo-warning/30'
              : 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {playing ? <><Pause size={15} /> עצור</> : <><Play size={15} /> הפעל</>}
        </button>

        {/* next */}
        <button
          onClick={nextPhase}
          disabled={phase >= total - 1}
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

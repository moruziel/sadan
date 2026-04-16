import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AREA_309 } from '../../data/mockData'

const INITIAL_CENTER = [35.245, 31.82]
const INITIAL_ZOOM   = 12

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

// פופאפ HTML — עיצוב כהה
function buildPopupHTML(props) {
  const lines = (props.popup_body || '').split('\n').map(l =>
    `<div style="color:#d1d5db;font-size:12px;line-height:1.6">${l}</div>`
  ).join('')
  return `
    <div style="direction:rtl;text-align:right;font-family:sans-serif;max-width:240px">
      <div style="font-weight:700;font-size:14px;color:#f9fafb;margin-bottom:6px">
        ${props.popup_title || props.label}
      </div>
      ${lines}
    </div>
  `
}

// שכבות קליקביליות (פוליגונים ולינים — נקודות מטופלות דרך HTML markers)
const CLICKABLE_LAYERS = [
  'hazard-zone-fill',
  'neighbor-zone-fill',
  'powerline',
]

const SEVERITY_BORDER = { high: '#ef4444', medium: '#f59e0b', low: '#9ca3af', undefined: '#9ca3af' }
const CATEGORY_BORDER = { infrastructure: '#3b82f6', history: '#6b7280', neighbor: '#a855f7' }

// חישוב centroid של פוליגון
function polygonCentroid(coordinates) {
  const ring = coordinates[0]
  const n = ring.length - 1
  let x = 0, y = 0
  for (let i = 0; i < n; i++) { x += ring[i][0]; y += ring[i][1] }
  return [x / n, y / n]
}

export default function MapView({ layers }) {
  const containerRef  = useRef(null)
  const mapObj        = useRef(null)
  const popupRef      = useRef(null)
  const markersRef    = useRef({}) // { category: [marker, ...] }
  const [is3D, setIs3D] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapObj.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     MAP_STYLE,
      center:    INITIAL_CENTER,
      zoom:      INITIAL_ZOOM,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-left')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-right')

    // Popup יחיד — משותף לכל השכבות
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '280px',
      className: 'sadan-popup',
    })
    popupRef.current = popup

    map.on('load', () => {
      // ── Terrain ───────────────────────────────────────────
      map.addSource('terrain', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
      })
      map.addLayer({
        id: 'hillshade', type: 'hillshade', source: 'terrain',
        paint: { 'hillshade-exaggeration': 0.4 },
      })

      // ── GeoJSON ───────────────────────────────────────────
      map.addSource('area-309', { type: 'geojson', data: AREA_309.geojson })

      // גבול השטח
      map.addLayer({
        id: 'area-fill', type: 'fill', source: 'area-309',
        filter: ['==', ['get', 'category'], 'boundary'],
        paint: { 'fill-color': '#c6953b', 'fill-opacity': 0.07 },
      })
      map.addLayer({
        id: 'area-border', type: 'line', source: 'area-309',
        filter: ['==', ['get', 'category'], 'boundary'],
        paint: { 'line-color': '#c6953b', 'line-width': 2.5, 'line-dasharray': [5, 3] },
      })
      map.addLayer({
        id: 'area-label', type: 'symbol', source: 'area-309',
        filter: ['==', ['get', 'category'], 'boundary'],
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-anchor': 'top',
          'text-offset': [0, 0.5],
        },
        paint: { 'text-color': '#c6953b', 'text-halo-color': '#000', 'text-halo-width': 1.5 },
      })

      // שמורת טבע — פוליגון (layer: hazards)
      map.addLayer({
        id: 'hazard-zone-fill', type: 'fill', source: 'area-309',
        filter: ['==', ['get', 'category'], 'hazard_zone'],
        layout: { visibility: layers.hazards ? 'visible' : 'none' },
        paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.2 },
      })
      map.addLayer({
        id: 'hazard-zone-border', type: 'line', source: 'area-309',
        filter: ['==', ['get', 'category'], 'hazard_zone'],
        layout: { visibility: layers.hazards ? 'visible' : 'none' },
        paint: { 'line-color': '#22c55e', 'line-width': 1.5, 'line-dasharray': [3, 2] },
      })

      // קו חשמל — line (layer: hazards)
      map.addLayer({
        id: 'powerline', type: 'line', source: 'area-309',
        filter: ['==', ['get', 'category'], 'powerline'],
        layout: { visibility: layers.hazards ? 'visible' : 'none', 'line-cap': 'round' },
        paint: {
          'line-color': '#fbbf24',
          'line-width': 3,
          'line-dasharray': [6, 2],
        },
      })
      // תווית קו חשמל
      map.addLayer({
        id: 'powerline-label', type: 'symbol', source: 'area-309',
        filter: ['==', ['get', 'category'], 'powerline'],
        layout: {
          'text-field': '⚡ קו 161KV',
          'text-size': 11,
          'symbol-placement': 'line',
          'text-offset': [0, -1],
          visibility: layers.hazards ? 'visible' : 'none',
        },
        paint: { 'text-color': '#fbbf24', 'text-halo-color': '#000', 'text-halo-width': 1.5 },
      })

      // כוחות שכנים — פוליגונים
      map.addLayer({
        id: 'neighbor-zone-fill', type: 'fill', source: 'area-309',
        filter: ['==', ['get', 'category'], 'neighbor_zone'],
        layout: { visibility: layers.neighbors ? 'visible' : 'none' },
        paint: { 'fill-color': '#a855f7', 'fill-opacity': 0.12 },
      })
      map.addLayer({
        id: 'neighbor-zone-border', type: 'line', source: 'area-309',
        filter: ['==', ['get', 'category'], 'neighbor_zone'],
        layout: { visibility: layers.neighbors ? 'visible' : 'none' },
        paint: { 'line-color': '#a855f7', 'line-width': 2.5 },
      })

      // ── HTML Markers — emoji אמיתיים ─────────────────────
      const markersByCat = {}
      const addMarkers = []

      AREA_309.geojson.features.forEach(feat => {
        const p = feat.properties
        if (!p.icon) return

        // מיקום: נקודה או centroid של פוליגון
        let lngLat
        if (feat.geometry.type === 'Point') {
          lngLat = feat.geometry.coordinates
        } else if (feat.geometry.type === 'Polygon') {
          lngLat = polygonCentroid(feat.geometry.coordinates)
        } else return

        // טבעת חומרה
        const ringColor = p.severity
          ? SEVERITY_BORDER[p.severity] ?? '#9ca3af'
          : CATEGORY_BORDER[p.category] ?? 'rgba(255,255,255,0.3)'

        // בניית אלמנט HTML
        const el = document.createElement('div')
        el.style.cssText = [
          'width:38px', 'height:38px',
          'display:flex', 'align-items:center', 'justify-content:center',
          'font-size:22px',
          'background:white',
          'border-radius:50%',
          `border:3px solid ${ringColor}`,
          'cursor:pointer',
          'box-shadow:0 2px 10px rgba(0,0,0,0.45)',
          'transition:transform 0.15s',
          'user-select:none',
          'line-height:1',
        ].join(';')
        el.textContent = p.icon
        el.title = p.label || ''

        // hover
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.25)' })
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

        // popup בקליק
        el.addEventListener('click', e => {
          e.stopPropagation()
          popup.setLngLat(lngLat).setHTML(buildPopupHTML(p)).addTo(map)
        })

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(lngLat)

        if (!markersByCat[p.category]) markersByCat[p.category] = []
        markersByCat[p.category].push(marker)
        addMarkers.push({ marker, category: p.category })
      })

      // הוסף markers לפי הגדרת שכבות
      const catToLayer = {
        hazard:         'hazards',
        hazard_zone:    'hazards',
        infrastructure: 'infrastructure',
        history:        'history',
        neighbor:       'neighbors',
        neighbor_zone:  'neighbors',
      }
      addMarkers.forEach(({ marker, category }) => {
        const layerKey = catToLayer[category]
        if (layerKey && layers[layerKey]) marker.addTo(map)
      })

      markersRef.current = markersByCat

      // ── מרקר מרכזי ───────────────────────────────────────
      new maplibregl.Marker({ color: '#c6953b', scale: 1.1 })
        .setLngLat(INITIAL_CENTER)
        .setPopup(new maplibregl.Popup({ offset: 25, className: 'sadan-popup' })
          .setHTML(buildPopupHTML({
            popup_title: '📍 שטח אש 309ה',
            popup_body: 'גזרה צפונית | 12.4 קמ״ר\nציון התאמה: 78/100\nקיבולת: גדוד מוגבר\nמנהל: קרן ג׳ימס — מתא״ם שטחי אש',
          })))
        .addTo(map)

      // ── Popup בקליק על שכבות ──────────────────────────────
      CLICKABLE_LAYERS.forEach(layerId => {
        map.on('click', layerId, e => {
          const props = e.features?.[0]?.properties
          if (!props?.popup_title && !props?.label) return
          const coords = e.lngLat
          popup
            .setLngLat(coords)
            .setHTML(buildPopupHTML(props))
            .addTo(map)
        })

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
        })
      })
    })

    map.on('error', e => console.error('[MapView]', e.error?.message || e))

    mapObj.current = map
    const t = setTimeout(() => map.resize(), 120)
    return () => {
      clearTimeout(t)
      // נקה markers
      Object.values(markersRef.current).flat().forEach(m => m.remove())
      markersRef.current = {}
      map.remove()
      mapObj.current = null
    }
  }, [])

  // ── Layer toggles ────────────────────────────────────────
  useEffect(() => {
    const map = mapObj.current
    if (!map || !map.isStyleLoaded()) return
    const vis = v => v ? 'visible' : 'none'
    const set = (id, v) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis(v)) }

    // MapLibre layers (פוליגונים + קווים)
    ;['hazard-zone-fill','hazard-zone-border','powerline','powerline-label',
    ].forEach(id => set(id, layers.hazards))
    ;['neighbor-zone-fill','neighbor-zone-border',
    ].forEach(id => set(id, layers.neighbors))

    // HTML Markers — הצג/הסתר
    const m = markersRef.current
    const toggleMarkers = (cats, visible) => {
      cats.forEach(cat => (m[cat] || []).forEach(marker => {
        if (visible) marker.addTo(map)
        else marker.remove()
      }))
    }

    toggleMarkers(['hazard', 'hazard_zone'], layers.hazards)
    toggleMarkers(['infrastructure'],         layers.infrastructure)
    toggleMarkers(['history'],                layers.history)
    toggleMarkers(['neighbor', 'neighbor_zone'], layers.neighbors)
  }, [layers.hazards, layers.infrastructure, layers.neighbors, layers.history])

  // ── 3D toggle ────────────────────────────────────────────
  function toggle3D() {
    const map = mapObj.current
    if (!map) return
    const next = !is3D
    if (next) {
      map.setTerrain({ source: 'terrain', exaggeration: 2.0 })
      map.easeTo({ pitch: 58, bearing: -15, duration: 900 })
    } else {
      map.setTerrain(null)
      map.easeTo({ pitch: 0, bearing: 0, duration: 900 })
    }
    setIs3D(next)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* כפתור 3D */}
      <button
        onClick={toggle3D}
        style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg
          ${is3D
            ? 'bg-demo-gold text-black'
            : 'bg-demo-surface/90 text-demo-gold border border-demo-gold/40 backdrop-blur-sm'}`}
      >
        ⛰️ {is3D ? '2D' : '3D'}
      </button>

      {/* Legend */}
      <div
        style={{ position: 'absolute', bottom: 36, right: 12, zIndex: 10 }}
        className="bg-demo-surface/90 backdrop-blur-sm border border-demo-border rounded-xl px-3 py-2 text-xs space-y-1.5"
        dir="rtl"
      >
        <div className="text-gray-500 font-semibold text-[10px] uppercase tracking-wide mb-1">מקרא</div>
        <div className="flex items-center gap-2"><span className="text-sm">🏺🌿</span><span className="text-gray-300">מפגע</span><span className="w-2.5 h-2.5 rounded-full border-2 border-[#ef4444] inline-block ml-1"/><span className="text-[#ef4444]">גבוה</span></div>
        <div className="flex items-center gap-2 pr-5"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#f59e0b] inline-block"/><span className="text-[#f59e0b]">בינוני</span></div>
        <div className="flex items-center gap-2"><span className="text-sm">🏕️💧🚁🏢</span><span className="text-gray-300">תשתית</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm border border-[#a855f7] bg-[#a855f7]/20 inline-block"/><span className="text-gray-300">כוח שכן</span></div>
        <div className="flex items-center gap-2"><span className="text-sm">📋</span><span className="text-gray-300">היסטוריה</span></div>
        <div className="flex items-center gap-2"><span className="w-5 h-0.5 bg-[#fbbf24] inline-block border-t-2 border-dashed border-[#fbbf24]"/><span className="text-gray-300">קו חשמל</span></div>
      </div>

      {/* Popup CSS */}
      <style>{`
        .sadan-popup .maplibregl-popup-content {
          background: #111827;
          border: 1px solid rgba(198,149,59,0.3);
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        }
        .sadan-popup .maplibregl-popup-tip { border-top-color: #111827; }
        .sadan-popup .maplibregl-popup-close-button {
          color: #9ca3af; font-size: 16px; padding: 4px 8px;
        }
        .sadan-popup .maplibregl-popup-close-button:hover { color: #fff; }
      `}</style>
    </div>
  )
}

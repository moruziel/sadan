import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AREA_309 } from '../../data/mockData'
import { addFiringCones, removeFiringCones, setFiringConesVisibility } from './FiringConesLayer.js'

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

const POPUP_FONT = "'Heebo','Segoe UI',Arial,sans-serif"

function buildPopupHTML(props) {
  const isHazard = props.category === 'safety_hazard'
  const severity = props.severity
  const titleColor = isHazard
    ? (severity === 'high' ? '#b91c1c' : '#b45309')
    : '#111827'
  const lines = (props.popup_body || '').split('\n').map(l =>
    `<div style="color:#374151;font-size:12px;line-height:1.7;padding:1px 0">${l}</div>`
  ).join('')
  return `
    <div style="direction:rtl;text-align:right;font-family:${POPUP_FONT};max-width:240px">
      <div style="font-weight:700;font-size:14px;color:${titleColor};margin-bottom:7px;line-height:1.3">
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
  'axis-line',
  'assault-area-fill',
  'sector-boundary-line',
  'clearance-route-line',
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

export default function MapView({ layers, activePlanId = null }) {
  const containerRef  = useRef(null)
  const mapObj        = useRef(null)
  const popupRef      = useRef(null)
  const markersRef    = useRef({}) // { category: [marker, ...] }
  const [is3D, setIs3D]           = useState(false)
  const is3DRef                   = useRef(false)   // stale-closure-safe ref
  const [showCones, setShowCones] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapObj.current) return

    const map = new maplibregl.Map({
      container:        containerRef.current,
      style:            MAP_STYLE,
      center:           INITIAL_CENTER,
      zoom:             INITIAL_ZOOM,
      dragRotate:       true,
      pitchWithRotate:  true,
      touchZoomRotate:  true,
      maxPitch:         85,
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

      // ── ציר התקדמות — מוצג רק לאחר יצירת תרגיל (activePlanId) ───
      map.addLayer({
        id: 'axis-line',
        type: 'line',
        source: 'area-309',
        filter: ['==', ['get', 'category'], 'axis'],
        layout: { visibility: 'none' },  // hidden until a plan is active
        paint: {
          'line-color': '#c6953b',
          'line-width': 3.5,
          'line-dasharray': [5, 3],
          'line-opacity': 0.95,
        },
      })

      // ── אזורי ירי בהסתערות — פוליגונים אדומים ──────────────
      map.addLayer({
        id: 'assault-area-fill', type: 'fill', source: 'area-309',
        filter: ['all', ['==', ['get', 'category'], 'assault_area'], ['==', ['get', 'plan'], 'plan_1']],
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.2 },
      })
      map.addLayer({
        id: 'assault-area-border', type: 'line', source: 'area-309',
        filter: ['all', ['==', ['get', 'category'], 'assault_area'], ['==', ['get', 'plan'], 'plan_1']],
        layout: { visibility: 'none' },
        paint: { 'line-color': '#ef4444', 'line-width': 2, 'line-dasharray': [4, 2] },
      })

      // ── גבולות גזרה לירי — קווים לבנים מקווקווים ───────────
      map.addLayer({
        id: 'sector-boundary-line', type: 'line', source: 'area-309',
        filter: ['all', ['==', ['get', 'category'], 'sector_boundary'], ['==', ['get', 'plan'], 'plan_1']],
        layout: { visibility: 'none', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-dasharray': [8, 4], 'line-opacity': 0.9 },
      })

      // ── נתירים — קווים ירוקים ───────────────────────────────
      map.addLayer({
        id: 'clearance-route-line', type: 'line', source: 'area-309',
        filter: ['all', ['==', ['get', 'category'], 'clearance_route'], ['==', ['get', 'plan'], 'plan_1']],
        layout: { visibility: 'none', 'line-cap': 'round' },
        paint: { 'line-color': '#22c55e', 'line-width': 3, 'line-dasharray': [2, 4], 'line-opacity': 0.95 },
      })

      // ── HTML Markers — emoji אמיתיים ─────────────────────
      const markersByCat = {}
      const addMarkers = []

      // ── חיצי כיוון לאורך הציר ────────────────────────────
      AREA_309.geojson.features.forEach(feat => {
        if (feat.properties.category !== 'axis') return
        if (feat.geometry.type !== 'LineString') return
        const coords = feat.geometry.coordinates
        for (let i = 1; i < coords.length; i++) {
          const from = coords[i - 1]
          const to   = coords[i]
          const dLng = to[0] - from[0]
          const dLat = to[1] - from[1]
          const angle = Math.atan2(dLng, dLat) * 180 / Math.PI
          const el = document.createElement('div')
          el.style.cssText = [
            'width:0', 'height:0',
            'border-left:6px solid transparent',
            'border-right:6px solid transparent',
            'border-bottom:13px solid #c6953b',
            `transform:rotate(${angle}deg)`,
            'filter:drop-shadow(0 1px 4px rgba(0,0,0,0.9))',
            'pointer-events:none',
          ].join(';')
          const m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(to)
          if (!markersByCat['axis']) markersByCat['axis'] = []
          markersByCat['axis'].push(m)
          addMarkers.push({ marker: m, category: 'axis' })
        }
      })

      // ── מטרות, אויב, כוחות ידידותיים ────────────────────
      AREA_309.geojson.features.forEach(feat => {
        const p   = feat.properties
        const cat = p.category
        if (!['objective', 'enemy', 'friendly_start'].includes(cat)) return
        if (feat.geometry.type !== 'Point') return

        const lngLat = feat.geometry.coordinates
        const el = document.createElement('div')

        if (cat === 'objective') {
          el.style.cssText = [
            'width:36px', 'height:36px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'border:2.5px solid #f59e0b',
            'border-radius:50%',
            'background:rgba(245,158,11,0.18)',
            'color:#f59e0b',
            'font-size:15px',
            'font-weight:900',
            'box-shadow:0 0 14px rgba(245,158,11,0.55)',
            'cursor:pointer',
            'animation:objPulse 2s ease-in-out infinite',
            'position:relative',
            'z-index:1',
            'overflow:visible',
          ].join(';')
          el.textContent = '⊕'
          el.title = p.label || ''
          // תווית קטנה מתחת
          const lbl = document.createElement('div')
          lbl.style.cssText = [
            'position:absolute',
            'bottom:-18px',
            'left:50%',
            'transform:translateX(-50%)',
            'color:#f59e0b',
            'font-size:10px',
            'font-weight:700',
            'white-space:nowrap',
            'text-shadow:0 1px 3px #000,0 0 6px #000',
            'pointer-events:none',
          ].join(';')
          lbl.textContent = p.label
          el.style.position = 'relative'
          el.appendChild(lbl)

        } else if (cat === 'enemy') {
          el.style.cssText = [
            'width:32px', 'height:32px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'border:2.5px solid #ef4444',
            'border-radius:4px',
            'background:rgba(239,68,68,0.2)',
            'color:#ef4444',
            'font-size:16px',
            'font-weight:900',
            'box-shadow:0 0 12px rgba(239,68,68,0.5)',
            'cursor:pointer',
            'position:relative',
            'z-index:1',
          ].join(';')
          el.textContent = '✕'
          el.title = p.label || ''

        } else if (cat === 'friendly_start') {
          const isHQ = p.icon === '★'
          el.style.cssText = [
            'width:34px', 'height:34px',
            'display:flex', 'align-items:center', 'justify-content:center',
            `border:2.5px solid ${isHQ ? '#3b82f6' : '#ffffff'}`,
            'border-radius:4px',
            `background:${isHQ ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.15)'}`,
            `color:${isHQ ? '#3b82f6' : '#ffffff'}`,
            'font-size:16px',
            'font-weight:700',
            'box-shadow:0 0 10px rgba(59,130,246,0.4)',
            'cursor:pointer',
            'position:relative',
            'z-index:1',
          ].join(';')
          el.textContent = p.icon || '★'
          el.title = p.label || ''
        }

        el.addEventListener('mouseenter', () => { el.style.outline = '2px solid rgba(198,149,59,0.8)'; el.style.zIndex = '200' })
        el.addEventListener('mouseleave', () => { el.style.outline = ''; el.style.zIndex = '1' })
        el.addEventListener('click', e => {
          e.stopPropagation()
          popup.setLngLat(lngLat).setHTML(buildPopupHTML(p)).addTo(map)
        })

        const m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat)
        if (!markersByCat[cat]) markersByCat[cat] = []
        markersByCat[cat].push(m)
        addMarkers.push({ marker: m, category: cat })
      })

      // ── נקודות דיווח + עמדות ירי ברתק ─────────────────────
      AREA_309.geojson.features.forEach(feat => {
        const p   = feat.properties
        const cat = p.category
        if (!['reporting_point', 'sbf_position'].includes(cat)) return
        if (feat.geometry.type !== 'Point') return

        const lngLat = feat.geometry.coordinates
        const el = document.createElement('div')
        el.style.position = 'relative'
        el.style.zIndex = '2'

        if (cat === 'reporting_point') {
          el.style.cssText = [
            'width:26px', 'height:26px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'border:2.5px solid #3b82f6',
            'border-radius:50%',
            'background:rgba(59,130,246,0.25)',
            'color:#93c5fd',
            'font-size:10px',
            'font-weight:900',
            'box-shadow:0 0 10px rgba(59,130,246,0.55)',
            'cursor:pointer',
            'position:relative',
            'z-index:2',
          ].join(';')
          el.textContent = p.label.replace('נ.ד. ', '')
          const lbl = document.createElement('div')
          lbl.style.cssText = [
            'position:absolute', 'bottom:-15px', 'left:50%',
            'transform:translateX(-50%)',
            'color:#93c5fd', 'font-size:9px', 'font-weight:700',
            'white-space:nowrap',
            'text-shadow:0 1px 3px #000,0 0 6px #000',
            'pointer-events:none',
          ].join(';')
          lbl.textContent = p.label
          el.appendChild(lbl)

        } else {
          // sbf_position
          el.style.cssText = [
            'width:28px', 'height:28px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'border:2.5px solid #f97316',
            'border-radius:4px',
            'background:rgba(249,115,22,0.2)',
            'color:#fdba74',
            'font-size:13px',
            'box-shadow:0 0 10px rgba(249,115,22,0.5)',
            'cursor:pointer',
            'position:relative',
            'z-index:2',
          ].join(';')
          el.textContent = '🔫'
          const lbl = document.createElement('div')
          lbl.style.cssText = [
            'position:absolute', 'bottom:-15px', 'left:50%',
            'transform:translateX(-50%)',
            'color:#fdba74', 'font-size:9px', 'font-weight:700',
            'white-space:nowrap',
            'text-shadow:0 1px 3px #000,0 0 6px #000',
            'pointer-events:none',
          ].join(';')
          lbl.textContent = p.label
          el.appendChild(lbl)
        }

        el.addEventListener('mouseenter', () => { el.style.outline = '2px solid rgba(198,149,59,0.8)'; el.style.zIndex = '200' })
        el.addEventListener('mouseleave', () => { el.style.outline = ''; el.style.zIndex = '2' })
        el.addEventListener('click', e => {
          e.stopPropagation()
          popup.setLngLat(lngLat).setHTML(buildPopupHTML(p)).addTo(map)
        })

        const m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat)
        if (!markersByCat[cat]) markersByCat[cat] = []
        markersByCat[cat].push(m)
        addMarkers.push({ marker: m, category: cat })
      })

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

        // hover + z-index elevation (מניעת היעלמות מאחורי שכבות)
        el.addEventListener('mouseenter', () => { el.style.outline = '2.5px solid rgba(198,149,59,0.9)'; el.style.zIndex = '200' })
        el.addEventListener('mouseleave', () => { el.style.outline = ''; el.style.zIndex = '1' })

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
      // ── נת"ב — נקודות תורפה בטיחותיות ────────────────────
      AREA_309.geojson.features.forEach(feat => {
        const p   = feat.properties
        if (p.category !== 'safety_hazard') return
        if (feat.geometry.type !== 'Point') return

        const lngLat = feat.geometry.coordinates
        const isHigh = p.severity === 'high'

        const el = document.createElement('div')
        el.style.cssText = [
          'width:32px', 'height:32px',
          'display:flex', 'align-items:center', 'justify-content:center',
          'font-size:17px',
          'background:white',
          'border-radius:50%',
          `border:3px solid ${isHigh ? '#ef4444' : '#f59e0b'}`,
          'cursor:pointer',
          'box-shadow:0 2px 10px rgba(0,0,0,0.45)',
          'position:relative',
          'z-index:1',
        ].join(';')
        el.textContent = p.icon || '⚠️'
        el.title = p.label

        const lbl = document.createElement('div')
        lbl.style.cssText = [
          'position:absolute', 'bottom:-14px', 'left:50%',
          'transform:translateX(-50%)',
          `color:${isHigh ? '#ef4444' : '#f59e0b'}`,
          'font-size:9px', 'font-weight:700', 'white-space:nowrap',
          'text-shadow:0 1px 3px #000,0 0 6px #000',
          'pointer-events:none',
        ].join(';')
        lbl.textContent = p.label
        el.appendChild(lbl)

        el.addEventListener('mouseenter', () => { el.style.outline = '2px solid rgba(198,149,59,0.8)'; el.style.zIndex = '200' })
        el.addEventListener('mouseleave', () => { el.style.outline = ''; el.style.zIndex = '1' })
        el.addEventListener('click', e => {
          e.stopPropagation()
          popup.setLngLat(lngLat).setHTML(buildPopupHTML(p)).addTo(map)
        })

        const m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat)
        if (!markersByCat['safety_hazard']) markersByCat['safety_hazard'] = []
        markersByCat['safety_hazard'].push(m)
        addMarkers.push({ marker: m, category: 'safety_hazard' })
      })

      const catToLayer = {
        hazard:          'hazards',
        hazard_zone:     'hazards',
        infrastructure:  'infrastructure',
        history:         'history',
        neighbor:        'neighbors',
        neighbor_zone:   'neighbors',
        axis:            'forces',
        objective:       'forces',
        enemy:           'forces',
        friendly_start:  'forces',
        safety_hazard:   'natbam',
        // plan elements — gated on activePlanId
        reporting_point: null,
        sbf_position:    null,
      }
      // קטגוריות שמוצגות רק כשיש תרגיל פעיל
      const PLAN_ONLY_CATS = new Set(['axis', 'reporting_point', 'sbf_position'])
      addMarkers.forEach(({ marker, category }) => {
        if (PLAN_ONLY_CATS.has(category)) {
          if (layers.forces && activePlanId) marker.addTo(map)
          return
        }
        const layerKey = catToLayer[category]
        if (layerKey && layers[layerKey]) marker.addTo(map)
        else if (!layerKey) marker.addTo(map)
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
    const planActive = !!activePlanId

    // MapLibre layers (פוליגונים + קווים)
    ;['hazard-zone-fill','hazard-zone-border','powerline','powerline-label',
    ].forEach(id => set(id, layers.hazards))
    ;['neighbor-zone-fill','neighbor-zone-border',
    ].forEach(id => set(id, layers.neighbors))
    // ציר — רק כאשר תרגיל קיים (activePlanId)
    ;['axis-line'].forEach(id => set(id, layers.forces && planActive))
    // אלמנטי תרגיל — רק כאשר תרגיל קיים
    ;['assault-area-fill','assault-area-border'].forEach(id => set(id, planActive))
    ;['sector-boundary-line'].forEach(id => set(id, planActive))
    ;['clearance-route-line'].forEach(id => set(id, planActive))

    // HTML Markers — הצג/הסתר
    const m = markersRef.current
    const toggleMarkers = (cats, visible) => {
      cats.forEach(cat => (m[cat] || []).forEach(marker => {
        if (visible) marker.addTo(map)
        else marker.remove()
      }))
    }

    toggleMarkers(['hazard', 'hazard_zone'],        layers.hazards)
    toggleMarkers(['infrastructure'],               layers.infrastructure)
    toggleMarkers(['history'],                      layers.history)
    toggleMarkers(['neighbor', 'neighbor_zone'],    layers.neighbors)
    toggleMarkers(['safety_hazard'],                layers.natbam)
    // ציר + נקודות תרגיל — רק עם activePlanId; שאר כוחות תמיד לפי שכבה
    toggleMarkers(['axis', 'reporting_point', 'sbf_position'], layers.forces && planActive)
    toggleMarkers(['objective', 'enemy', 'friendly_start'], layers.forces)
  }, [layers.hazards, layers.infrastructure, layers.neighbors, layers.history, layers.forces, layers.natbam, activePlanId])

  // ── Firing cones — toggle + plan change ─────────────────
  useEffect(() => {
    const map = mapObj.current
    if (!map || !map.isStyleLoaded()) return
    if (showCones && activePlanId) {
      addFiringCones(map, activePlanId, popupRef.current)
    } else {
      removeFiringCones(map)
    }
  }, [showCones, activePlanId])

  function toggleCones() {
    setShowCones(v => !v)
  }

  // ── 3D toggle ────────────────────────────────────────────
  function toggle3D() {
    const map = mapObj.current
    if (!map) return
    const next = !is3DRef.current
    is3DRef.current = next
    if (next) {
      map.setTerrain({ source: 'terrain', exaggeration: 2.0 })
      map.easeTo({ pitch: 58, bearing: -15, duration: 900 })
    } else {
      map.setTerrain(null)
      map.easeTo({ pitch: 0, bearing: 0, duration: 900 })
    }
    setIs3D(next)
  }

  // ── CustomEvent listeners (voice / text commands) ────────
  useEffect(() => {
    const handle3d = () => toggle3D()
    window.addEventListener('sadan:toggle3d', handle3d)

    const handleCmd = (e) => {
      const map = mapObj.current
      if (!map) return
      const d = e.detail
      if (d.action === 'fly_to') {
        map.flyTo({
          center:   [d.lng, d.lat],
          zoom:     d.zoom     ?? map.getZoom(),
          bearing:  d.bearing  ?? map.getBearing(),
          pitch:    d.pitch    ?? map.getPitch(),
          duration: d.duration_ms ?? 1500,
          essential: true,
        })
      } else if (d.action === 'zoom') {
        map.easeTo({ zoom: map.getZoom() + (d.delta ?? 1), duration: 600 })
      } else if (d.action === 'rotate') {
        map.easeTo({
          bearing:  d.bearing,
          pitch:    d.pitch >= 0 ? d.pitch : map.getPitch(),
          duration: 800,
        })
      }
    }
    window.addEventListener('sadan:map_command', handleCmd)

    return () => {
      window.removeEventListener('sadan:toggle3d', handle3d)
      window.removeEventListener('sadan:map_command', handleCmd)
    }
  }, []) // eslint-disable-line

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* כפתורי מפה — ימין */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }} className="flex flex-col gap-2">
        <button
          onClick={toggle3D}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg
            ${is3D
              ? 'bg-demo-gold text-black'
              : 'bg-demo-surface/90 text-demo-gold border border-demo-gold/40 backdrop-blur-sm'}`}
        >
          ⛰️ {is3D ? '2D' : '3D'}
        </button>

        {activePlanId && (
          <button
            onClick={toggleCones}
            title="הצג / הסתר משפכי ירי"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg
              ${showCones
                ? 'bg-red-600 text-white'
                : 'bg-demo-surface/90 text-gray-300 border border-demo-border backdrop-blur-sm'}`}
          >
            🔫 {showCones ? 'הסתר ירי' : 'משפכי ירי'}
          </button>
        )}
      </div>

      {/* Legend */}
      <div
        style={{ position: 'absolute', bottom: 36, right: 12, zIndex: 10 }}
        className="bg-demo-surface/90 backdrop-blur-sm border border-demo-border rounded-xl px-3 py-2 text-xs space-y-1.5"
        dir="rtl"
      >
        <div className="text-gray-500 font-semibold text-[10px] uppercase tracking-wide mb-1">מקרא</div>
        <div className="flex items-center gap-2"><span className="w-5 h-0 border-t-2 border-dashed border-[#c6953b] inline-block"/><span className="text-[#c6953b] font-semibold">ציר התקדמות</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 flex items-center justify-center border-2 border-[#3b82f6] rounded-full text-[#93c5fd] text-[9px] font-black inline-block">1</span><span className="text-gray-300">נקודת דיווח</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 flex items-center justify-center border border-[#f97316] rounded-sm text-[10px] inline-block">🔫</span><span className="text-gray-300">ע.י. ברתק</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-sm border border-[#ef4444] bg-[#ef4444]/20 inline-block"/><span className="text-gray-300">א. הסתערות</span></div>
        <div className="flex items-center gap-2"><span className="w-5 h-0 border-t-2 border-dashed border-white inline-block"/><span className="text-gray-300">גבול גזרה</span></div>
        <div className="flex items-center gap-2"><span className="w-5 h-0 border-t-2 border-dotted border-[#22c55e] inline-block"/><span className="text-gray-300">נתיר</span></div>
        <div className="flex items-center gap-2"><span className="text-[#f59e0b] font-black text-base">⊕</span><span className="text-gray-300">מטרה</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 flex items-center justify-center border border-[#ef4444] rounded-sm text-[#ef4444] text-[10px] font-black inline-block">✕</span><span className="text-gray-300">בימוי אויב</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 flex items-center justify-center border border-[#3b82f6] rounded-sm text-[#3b82f6] text-[10px] font-black inline-block">★</span><span className="text-gray-300">חפ"ק / רפואה</span></div>
        <div className="border-t border-gray-700 my-0.5"/>
        <div className="flex items-center gap-2"><span className="text-sm">🏺🌿</span><span className="text-gray-300">מפגע</span><span className="w-2.5 h-2.5 rounded-full border-2 border-[#ef4444] inline-block ml-1"/><span className="text-[#ef4444]">גבוה</span></div>
        <div className="flex items-center gap-2 pr-5"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#f59e0b] inline-block"/><span className="text-[#f59e0b]">בינוני</span></div>
        <div className="flex items-center gap-2"><span className="text-sm">🏕️💧🚁🏢</span><span className="text-gray-300">תשתית</span></div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm border border-[#a855f7] bg-[#a855f7]/20 inline-block"/><span className="text-gray-300">כוח שכן</span></div>
        <div className="flex items-center gap-2"><span className="text-sm">📋</span><span className="text-gray-300">היסטוריה</span></div>
        <div className="flex items-center gap-2"><span className="w-5 h-0.5 bg-[#fbbf24] inline-block border-t-2 border-dashed border-[#fbbf24]"/><span className="text-gray-300">קו חשמל</span></div>
      </div>

      {/* Popup CSS */}
      <style>{`
        @keyframes objPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(245,158,11,0.4); }
          50%       { box-shadow: 0 0 26px rgba(245,158,11,0.9); }
        }
        .sadan-popup .maplibregl-popup-content {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        .sadan-popup .maplibregl-popup-tip { border-top-color: rgba(255,255,255,0.92); }
        .sadan-popup .maplibregl-popup-close-button {
          color: #6b7280; font-size: 16px; padding: 4px 8px;
        }
        .sadan-popup .maplibregl-popup-close-button:hover { color: #111827; }
      `}</style>
    </div>
  )
}

/**
 * FireMiniMap — מפה מוטמעת למסך אזימוטי ירי
 * מציגה: משפכי ירי, גבולות גזרה, נתירים, אזורי הסתערות, נ.ד., ע.י.ב.
 */
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AREA_309, EXERCISE_FILE } from '../../data/mockData'
import { addFiringCones, removeFiringCones } from './FiringConesLayer.js'
import { firingCones as FIRING_CONES } from '../../data/firingCones.js'

const MAP_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
}

const CENTER = [35.240, 31.827]
const ZOOM   = 13.3

// המרת decimal degrees ל-DMS קצר
function toDMS(deg, dir) {
  const d = Math.floor(Math.abs(deg))
  const mFull = (Math.abs(deg) - d) * 60
  const m = Math.floor(mFull)
  const s = Math.round((mFull - m) * 60)
  return `${d}°${String(m).padStart(2,'0')}′${String(s).padStart(2,'0')}″${dir}`
}

const POPUP_FONT = "'Heebo', 'Segoe UI', Arial, sans-serif"

function buildPopupBody(p) {
  const title = p.popup_title || p.label || ''
  const body  = (p.popup_body || '').replace(/\n/g, '<br>')
  return `
    <div style="direction:rtl;text-align:right;font-family:${POPUP_FONT};max-width:200px">
      <div style="font-weight:700;font-size:14px;color:#111827;margin-bottom:5px;line-height:1.3">${title}</div>
      <div style="color:#4b5563;font-size:12px;line-height:1.7">${body}</div>
    </div>
  `
}

// popup מפורט לשלב ירי (לחיצה על נ"צ בפאנל)
function buildPhasePopup(ph) {
  const isStatic   = ph.type === 'ירי נייח'
  const accentColor = isStatic ? '#ea580c' : '#dc2626'
  const badgeBg     = isStatic ? '#fff7ed' : '#fef2f2'
  const ammoLines   = (ph.ammo || []).map(a =>
    `<div style="padding:2px 0;color:#374151">• ${a}</div>`
  ).join('')

  return `
    <div style="direction:rtl;text-align:right;font-family:${POPUP_FONT};width:230px">

      <!-- כותרת: badge + שלב -->
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e5e7eb">
        <span style="
          background:${badgeBg};color:${accentColor};
          font-size:11px;font-weight:700;
          padding:3px 9px;border-radius:20px;
          border:1px solid ${accentColor}33;
          white-space:nowrap
        ">${ph.label}</span>
        <span style="color:#6b7280;font-size:12px;font-weight:600">${ph.stage}</span>
      </div>

      <!-- מיקום → יעד -->
      <div style="margin-bottom:10px">
        <div style="color:#9ca3af;font-size:10px;font-weight:600;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em">מיקום ← יעד</div>
        <div style="color:#111827;font-size:14px;font-weight:700;line-height:1.3">
          ${ph.position}
          <span style="color:#9ca3af;font-size:12px;font-weight:400;margin:0 4px">→</span>
          ${ph.target}
        </div>
      </div>

      <!-- אזימוטים -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:10px">
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:6px 4px;text-align:center">
          <div style="color:#9ca3af;font-size:9px;font-weight:600;margin-bottom:2px">אזימוט</div>
          <div style="color:#111827;font-size:15px;font-weight:900;font-family:monospace;line-height:1">${ph.azimuth}</div>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:6px 4px;text-align:center">
          <div style="color:#9ca3af;font-size:9px;font-weight:600;margin-bottom:2px">ג.ג. שמאל</div>
          <div style="color:#374151;font-size:13px;font-weight:700;font-family:monospace;line-height:1">${ph.leftLimit}</div>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:6px 4px;text-align:center">
          <div style="color:#9ca3af;font-size:9px;font-weight:600;margin-bottom:2px">ג.ג. ימין</div>
          <div style="color:#374151;font-size:13px;font-weight:700;font-family:monospace;line-height:1">${ph.rightLimit}</div>
        </div>
      </div>

      <!-- נ"צ -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:5px 8px;margin-bottom:10px;font-family:monospace;font-size:11px;color:#1d4ed8;text-align:center">
        📍 ${ph.coord}
      </div>

      <!-- אמל"ח -->
      <div style="margin-bottom:8px">
        <div style="color:#6b7280;font-size:10px;font-weight:700;margin-bottom:4px">אמל&quot;ח:</div>
        <div style="font-size:12px;line-height:1.6">${ammoLines}</div>
      </div>

      <!-- הפעלה -->
      <div style="border-top:1px solid #e5e7eb;padding-top:6px;color:#9ca3af;font-size:10px">
        ⏱ הפעלה: <span style="color:#6b7280;font-weight:600">${ph.activatedAt}</span>
      </div>

    </div>
  `
}

export default function FireMiniMap() {
  const containerRef = useRef(null)
  const mapObj       = useRef(null)
  const popupRef     = useRef(null)
  const is3DRef      = useRef(false)
  const [is3D,       setIs3D]       = useState(false)
  const [showCones,  setShowCones]  = useState(true)

  // ── Init map ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapObj.current) return

    const map = new maplibregl.Map({
      container:       containerRef.current,
      style:           MAP_STYLE,
      center:          CENTER,
      zoom:            ZOOM,
      dragRotate:      true,
      pitchWithRotate: true,
      maxPitch:        85,
      attributionControl: false,
    })

    const popup = new maplibregl.Popup({
      closeButton: true,
      maxWidth: '260px',
      className: 'sadan-popup',
    })
    popupRef.current = popup

    map.on('load', () => {
      // ── Terrain ─────────────────────────────────────────────
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

      // ── GeoJSON ─────────────────────────────────────────────
      map.addSource('area-309', { type: 'geojson', data: AREA_309.geojson })

      // גבול שטח אש — בולט
      map.addLayer({
        id: 'area-fill', type: 'fill', source: 'area-309',
        filter: ['==', ['get', 'category'], 'boundary'],
        paint: { 'fill-color': '#c6953b', 'fill-opacity': 0.07 },
      })
      map.addLayer({
        id: 'area-border', type: 'line', source: 'area-309',
        filter: ['==', ['get', 'category'], 'boundary'],
        paint: { 'line-color': '#c6953b', 'line-width': 3, 'line-dasharray': [6, 3], 'line-opacity': 0.9 },
      })
      // כיתוב שטח — HTML marker במרכז הפוליגון (פותר RTL + כפילויות)
      const areaLabelEl = document.createElement('div')
      areaLabelEl.dir = 'rtl'
      areaLabelEl.textContent = 'שטח אש 309ה'
      Object.assign(areaLabelEl.style, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        fontWeight: '800',
        color: '#c6953b',
        textShadow: '0 0 6px #000, 0 0 3px #000, 0 1px 4px #000',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        letterSpacing: '0.03em',
      })
      new maplibregl.Marker({ element: areaLabelEl, anchor: 'center' })
        .setLngLat([35.245, 31.82])
        .addTo(map)

      // ציר התקדמות
      map.addLayer({
        id: 'axis-line', type: 'line', source: 'area-309',
        filter: ['==', ['get', 'category'], 'axis'],
        paint: { 'line-color': '#c6953b', 'line-width': 2, 'line-dasharray': [5, 3], 'line-opacity': 0.7 },
      })

      // אזורי ירי בהסתערות (אדום)
      map.addLayer({
        id: 'assault-fill', type: 'fill', source: 'area-309',
        filter: ['all', ['==', ['get', 'category'], 'assault_area'], ['==', ['get', 'plan'], 'plan_1']],
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.22 },
      })
      map.addLayer({
        id: 'assault-border', type: 'line', source: 'area-309',
        filter: ['all', ['==', ['get', 'category'], 'assault_area'], ['==', ['get', 'plan'], 'plan_1']],
        paint: { 'line-color': '#ef4444', 'line-width': 1.5, 'line-dasharray': [4, 2] },
      })

      // גבולות גזרה (לבן מקווקו)
      map.addLayer({
        id: 'sector-boundary', type: 'line', source: 'area-309',
        filter: ['all', ['==', ['get', 'category'], 'sector_boundary'], ['==', ['get', 'plan'], 'plan_1']],
        paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [8, 4], 'line-opacity': 0.85 },
      })

      // נתירים (ירוק מנוקד)
      map.addLayer({
        id: 'clearance-route', type: 'line', source: 'area-309',
        filter: ['all', ['==', ['get', 'category'], 'clearance_route'], ['==', ['get', 'plan'], 'plan_1']],
        paint: { 'line-color': '#22c55e', 'line-width': 2.5, 'line-dasharray': [2, 4] },
      })

      // קליקביליות שכבות קוים/פוליגונים
      ;['assault-fill', 'sector-boundary', 'clearance-route'].forEach(id => {
        map.on('click', id, e => {
          const props = e.features?.[0]?.properties
          if (!props) return
          popup.setLngLat(e.lngLat).setHTML(buildPopupBody(props)).addTo(map)
        })
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
      })

      // ── HTML Markers ────────────────────────────────────────
      AREA_309.geojson.features.forEach(feat => {
        const p   = feat.properties
        const cat = p.category
        if (!['reporting_point', 'sbf_position', 'objective'].includes(cat)) return
        if (feat.geometry.type !== 'Point') return

        const lngLat = feat.geometry.coordinates
        const el = document.createElement('div')

        if (cat === 'reporting_point') {
          el.style.cssText = [
            'width:22px', 'height:22px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'border:2px solid #3b82f6', 'border-radius:50%',
            'background:rgba(59,130,246,0.25)',
            'color:#93c5fd', 'font-size:9px', 'font-weight:900',
            'cursor:pointer', 'position:relative',
          ].join(';')
          el.textContent = p.label.replace('נ.ד. ', '')

        } else if (cat === 'sbf_position') {
          el.style.cssText = [
            'width:22px', 'height:22px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'border:2px solid #f97316', 'border-radius:3px',
            'background:rgba(249,115,22,0.2)',
            'font-size:11px', 'cursor:pointer', 'position:relative',
          ].join(';')
          el.textContent = '🔫'

        } else if (cat === 'objective') {
          el.style.cssText = [
            'width:26px', 'height:26px',
            'display:flex', 'align-items:center', 'justify-content:center',
            'border:2px solid #f59e0b', 'border-radius:50%',
            'background:rgba(245,158,11,0.15)',
            'color:#f59e0b', 'font-size:13px', 'font-weight:900',
            'cursor:pointer', 'position:relative',
          ].join(';')
          el.textContent = '⊕'
        }

        // תווית קטנה
        const lbl = document.createElement('div')
        lbl.style.cssText = [
          'position:absolute', 'bottom:-12px', 'left:50%',
          'transform:translateX(-50%)',
          'font-size:8px', 'font-weight:700', 'white-space:nowrap',
          'text-shadow:0 1px 3px #000,0 0 6px #000', 'pointer-events:none',
        ].join(';')
        lbl.style.color = cat === 'reporting_point' ? '#93c5fd'
                        : cat === 'sbf_position'    ? '#fdba74'
                        : '#fbbf24'
        lbl.textContent = p.label
        el.appendChild(lbl)

        el.addEventListener('click', e => {
          e.stopPropagation()
          popup.setLngLat(lngLat).setHTML(buildPopupBody(p)).addTo(map)
        })

        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map)
      })

      // ── נת"ב — נקודות תורפה בטיחותיות ─────────────────────
      AREA_309.geojson.features.forEach(feat => {
        const p = feat.properties
        if (p.category !== 'safety_hazard') return
        if (feat.geometry.type !== 'Point') return

        const lngLat = feat.geometry.coordinates
        const isHigh = p.severity === 'high'

        const el = document.createElement('div')
        el.style.cssText = [
          'width:26px', 'height:26px',
          'display:flex', 'align-items:center', 'justify-content:center',
          'font-size:14px',
          'background:white',
          'border-radius:50%',
          `border:2.5px solid ${isHigh ? '#ef4444' : '#f59e0b'}`,
          'cursor:pointer',
          'box-shadow:0 2px 8px rgba(0,0,0,0.5)',
          'position:relative', 'z-index:3',
        ].join(';')
        el.textContent = p.icon || '⚠️'

        const lbl = document.createElement('div')
        lbl.style.cssText = [
          'position:absolute', 'bottom:-12px', 'left:50%',
          'transform:translateX(-50%)',
          `color:${isHigh ? '#fca5a5' : '#fcd34d'}`,
          'font-size:8px', 'font-weight:700', 'white-space:nowrap',
          'text-shadow:0 1px 3px #000,0 0 6px #000',
          'pointer-events:none',
        ].join(';')
        lbl.textContent = p.label
        el.appendChild(lbl)

        el.addEventListener('click', e => {
          e.stopPropagation()
          popup.setLngLat(lngLat).setHTML(buildPopupBody(p)).addTo(map)
        })

        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map)
      })

      // ── מרקרי נקודות ירי — נ"צ מקורות המשפכים ──────────────
      const coneLabels = ['קש"א', 'קש"ב', 'קש"ג']
      ;(FIRING_CONES['plan_1'] || []).forEach((cone, i) => {
        const el = document.createElement('div')
        el.style.cssText = [
          'width:16px', 'height:16px',
          'border-radius:50%',
          'background:#ef4444',
          'border:2.5px solid #fff',
          'box-shadow:0 0 10px rgba(239,68,68,0.8)',
          'cursor:pointer',
          'position:relative',
          'z-index:5',
          'animation:firePulse 1.8s ease-in-out infinite',
        ].join(';')

        const lbl = document.createElement('div')
        lbl.style.cssText = [
          'position:absolute', 'bottom:-14px', 'left:50%',
          'transform:translateX(-50%)',
          'font-size:9px', 'font-weight:900', 'color:#ef4444',
          'white-space:nowrap',
          'text-shadow:0 1px 4px #000,0 0 8px #000',
          'pointer-events:none',
        ].join(';')
        lbl.textContent = coneLabels[i] || cone.phase

        el.appendChild(lbl)
        el.addEventListener('click', e => {
          e.stopPropagation()
          const [lng, lat] = cone.origin
          const latDMS = toDMS(lat, 'N')
          const lngDMS = toDMS(lng, 'E')
          popup.setLngLat(cone.origin).setHTML(`
            <div style="direction:rtl;text-align:right;font-family:${POPUP_FONT};max-width:210px">
              <div style="font-weight:700;font-size:13px;color:#b91c1c;margin-bottom:7px">🔴 ${cone.phase}</div>
              <div style="font-size:12px;color:#374151;line-height:1.8">
                ${cone.label}<br/>
                <span style="color:#1d4ed8;font-weight:600">נ"צ:</span>
                <span style="font-family:monospace"> ${latDMS} / ${lngDMS}</span><br/>
                <span style="color:#374151;font-weight:600">אמל"ח:</span> ${cone.ammo}
              </div>
            </div>
          `).addTo(map)
        })

        new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(cone.origin).addTo(map)
      })

      // ── Firing cones (ברירת מחדל: פעיל) ───────────────────
      addFiringCones(map, 'plan_1', popup)
    })

    // ── אירוע ניווט מהפאנל — עף + פתח popup ───────────────
    const handleFly = (e) => {
      const { lngLat, zoom, phase } = e.detail
      map.flyTo({
        center:   lngLat,
        zoom:     zoom || 15,
        pitch:    45,
        bearing:  -10,
        duration: 1100,
        essential: true,
      })
      if (phase && popupRef.current) {
        map.once('moveend', () => {
          popupRef.current
            .setLngLat(lngLat)
            .setHTML(buildPhasePopup(phase))
            .addTo(map)
        })
      }
    }
    window.addEventListener('sadan:fire_map_fly', handleFly)

    // ESC — סגור popup פתוח
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && popupRef.current) {
        popupRef.current.remove()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    mapObj.current = map
    setTimeout(() => map.resize(), 120)

    return () => {
      window.removeEventListener('sadan:fire_map_fly', handleFly)
      document.removeEventListener('keydown', handleKeyDown)
      map.remove()
      mapObj.current = null
    }
  }, [])

  // ── Toggle cones ────────────────────────────────────────────
  useEffect(() => {
    const map = mapObj.current
    if (!map || !map.isStyleLoaded()) return
    if (showCones) addFiringCones(map, 'plan_1', popupRef.current)
    else removeFiringCones(map)
  }, [showCones])

  // ── 3D toggle ───────────────────────────────────────────────
  function toggle3D() {
    const map = mapObj.current
    if (!map) return
    const next = !is3DRef.current
    is3DRef.current = next
    if (next) {
      map.setTerrain({ source: 'terrain', exaggeration: 2.0 })
      map.easeTo({ pitch: 55, bearing: -20, duration: 900 })
    } else {
      map.setTerrain(null)
      map.easeTo({ pitch: 0, bearing: 0, duration: 900 })
    }
    setIs3D(next)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* כפתורי שליטה */}
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <button onClick={toggle3D} style={{
          padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', border: 'none',
          background: is3D ? '#c6953b' : 'rgba(0,0,0,0.72)',
          color: is3D ? '#000' : '#c6953b',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>⛰️ {is3D ? '2D' : '3D'}</button>

        <button onClick={() => setShowCones(v => !v)} style={{
          padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', border: 'none',
          background: showCones ? '#dc2626' : 'rgba(0,0,0,0.72)',
          color: showCones ? '#fff' : '#9ca3af',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>🔫 {showCones ? 'הסתר' : 'משפכים'}</button>
      </div>

      {/* מקרא מינימלי */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8, zIndex: 10,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        borderRadius: 8, padding: '6px 10px', fontSize: 10, lineHeight: '1.9',
        direction: 'rtl',
      }}>
        {[
          { color: '#fff',    dashed: true,  label: 'גבול גזרה' },
          { color: '#22c55e', dotted: true,  label: 'נתיר'      },
          { color: '#ef4444', fill: true,    label: 'א. הסתערות' },
          { color: '#ef4444', cone: true,    label: 'משפכי ירי'  },
        ].map(({ color, dashed, dotted, fill, cone, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {fill ? (
              <span style={{ width: 12, height: 12, display: 'inline-block', background: `${color}33`, border: `1.5px solid ${color}`, borderRadius: 2 }} />
            ) : cone ? (
              <span style={{ width: 12, height: 12, display: 'inline-block', background: 'rgba(239,68,68,0.2)', borderRadius: '50% 50% 0 0', borderTop: `1.5px solid ${color}` }} />
            ) : (
              <span style={{
                width: 16, height: 0, display: 'inline-block',
                borderTop: `2px ${dashed ? 'dashed' : dotted ? 'dotted' : 'solid'} ${color}`,
              }} />
            )}
            <span style={{ color: '#d1d5db' }}>{label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes firePulse {
          0%, 100% { box-shadow: 0 0 6px rgba(239,68,68,0.6); }
          50%       { box-shadow: 0 0 18px rgba(239,68,68,1); }
        }
        .sadan-popup .maplibregl-popup-content {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        }
        .sadan-popup .maplibregl-popup-tip { border-top-color: rgba(255,255,255,0.88); }
        .sadan-popup .maplibregl-popup-close-button { color: #6b7280; font-size: 15px; }
        .sadan-popup .maplibregl-popup-close-button:hover { color: #111827; }
      `}</style>
    </div>
  )
}

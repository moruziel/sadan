/**
 * RegionMapView — מפת גזרה עם 5 שטחי אש
 * מציגה את הגולן (אזור 251) עם שטחים clickable
 */
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { REGION_251 } from '../../data/region251.js'

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

function buildPopupHTML(field) {
  const avail = field.available
    ? `<span style="color:#22c55e">● זמין</span>`
    : `<span style="color:#ef4444">● תפוס עד ${field.availableDate || '—'}</span>`
  return `
    <div style="direction:rtl;text-align:right;font-family:sans-serif;max-width:220px">
      <div style="font-weight:700;font-size:14px;color:#f9fafb;margin-bottom:4px">
        ${field.name}
      </div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:6px">${field.region} • ${field.size_km2} קמ״ר</div>
      <div style="font-size:12px;margin-bottom:4px">${avail}</div>
      <div style="font-size:11px;color:#c6953b;font-weight:700">ציון התאמה: ${field.score}/100</div>
    </div>
  `
}

const DEFAULT_LAYERS = { forces: true, hazards: true, infrastructure: true, neighbors: true, history: true }

export default function RegionMapView({ onFieldSelect, selectedFieldId, mode = 'region', layers = DEFAULT_LAYERS }) {
  const containerRef   = useRef(null)
  const mapObj         = useRef(null)
  const popupRef       = useRef(null)
  const markersRef     = useRef({ forces: [], hazards: [], infrastructure: [] })
  const [is3D, setIs3D] = useState(false)
  const is3DRef         = useRef(false)

  // ── Fly to selected field ────────────────────────────────
  useEffect(() => {
    const map = mapObj.current
    if (!map || !selectedFieldId) return
    const field = REGION_251.displayFields.find(f => f.id === selectedFieldId)
    if (!field) return
    map.flyTo({ center: field.center, zoom: 13, speed: 1.4, curve: 1.2, duration: 1200 })
  }, [selectedFieldId])

  // ── Layer toggles ────────────────────────────────────────
  useEffect(() => {
    const map = mapObj.current
    if (!map) return
    const m = markersRef.current
    const show = (cat, visible) => (m[cat] || []).forEach(marker => {
      if (visible) marker.addTo(map); else marker.remove()
    })
    show('forces',         layers.forces)
    show('hazards',        layers.hazards)
    show('infrastructure', layers.infrastructure)
  }, [layers.forces, layers.hazards, layers.infrastructure])

  function toggle3D() {
    const map = mapObj.current
    if (!map) return
    const next = !is3DRef.current
    is3DRef.current = next
    if (next) {
      map.setTerrain({ source: 'terrain', exaggeration: 2.0 })
      map.easeTo({ pitch: 55, bearing: -12, duration: 900 })
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

  const zoom   = mode === 'free' ? 7.5 : REGION_251.zoom
  const center = mode === 'free' ? [35.0, 31.5] : REGION_251.center

  useEffect(() => {
    if (!containerRef.current || mapObj.current) return

    const map = new maplibregl.Map({
      container:       containerRef.current,
      style:           MAP_STYLE,
      center,
      zoom,
      dragRotate:      true,
      pitchWithRotate: true,
      maxPitch:        60,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-left')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-right')

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '260px',
      className: 'sadan-popup',
    })
    popupRef.current = popup

    map.on('load', () => {
      // Terrain
      map.addSource('terrain', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
      })
      map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'terrain', paint: { 'hillshade-exaggeration': 0.3 } })

      // גבול גזרה
      const regionGeoJSON = {
        type: 'FeatureCollection',
        features: [REGION_251.boundary],
      }
      map.addSource('region', { type: 'geojson', data: regionGeoJSON })
      map.addLayer({
        id: 'region-fill', type: 'fill', source: 'region',
        paint: { 'fill-color': '#c6953b', 'fill-opacity': 0.04 },
      })
      map.addLayer({
        id: 'region-border', type: 'line', source: 'region',
        paint: { 'line-color': '#c6953b', 'line-width': 2, 'line-dasharray': [6, 3] },
      })
      map.addLayer({
        id: 'region-label', type: 'symbol', source: 'region',
        layout: { 'text-field': REGION_251.name, 'text-size': 13, 'text-anchor': 'top' },
        paint: { 'text-color': '#c6953b', 'text-halo-color': '#000', 'text-halo-width': 1.5 },
      })

      // שטחי אש — פוליגונים + מרקרים
      REGION_251.displayFields.forEach(field => {
        const isAvail     = field.available
        const isRecommend = field.recommended
        const isSelected  = field.id === selectedFieldId

        // פוליגון
        const polyGeo = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [[...field.polygon, field.polygon[0]]] },
          }],
        }
        map.addSource(`field-${field.id}`, { type: 'geojson', data: polyGeo })
        map.addLayer({
          id: `field-fill-${field.id}`, type: 'fill', source: `field-${field.id}`,
          paint: {
            'fill-color': isSelected ? '#c6953b'
              : mode === 'urgent' && isAvail ? '#22c55e'
              : mode === 'urgent' ? '#ef4444'
              : isRecommend ? '#c6953b'
              : isAvail ? '#3b82f6'
              : '#6b7280',
            'fill-opacity': isSelected ? 0.25 : 0.12,
          },
        })
        map.addLayer({
          id: `field-border-${field.id}`, type: 'line', source: `field-${field.id}`,
          paint: {
            'line-color': isSelected ? '#c6953b'
              : mode === 'urgent' && isAvail ? '#22c55e'
              : mode === 'urgent' ? '#ef4444'
              : isRecommend ? '#c6953b'
              : isAvail ? '#3b82f6'
              : '#6b7280',
            'line-width': isSelected || isRecommend ? 2.5 : 1.5,
          },
        })

        // ── מרקר כוחות (ציון + זמינות) ──────────────────────
        const color = isSelected ? '#c6953b'
          : mode === 'urgent' && isAvail ? '#22c55e'
          : mode === 'urgent' ? '#ef4444'
          : isRecommend ? '#c6953b'
          : isAvail ? '#3b82f6'
          : '#6b7280'

        const el = document.createElement('div')
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer'

        const dot = document.createElement('div')
        dot.style.cssText = [
          'width:44px', 'height:44px', 'border-radius:12px',
          `background:${color}22`, `border:2.5px solid ${color}`,
          'display:flex', 'align-items:center', 'justify-content:center', 'flex-direction:column',
          `box-shadow:0 0 ${isRecommend ? '18px' : '10px'} ${color}55`,
          'transition:box-shadow 0.2s',
          isRecommend ? 'animation:regionPulse 2.5s ease-in-out infinite' : '',
        ].join(';')

        const scoreEl = document.createElement('div')
        scoreEl.style.cssText = `color:${color};font-size:11px;font-weight:900;line-height:1`
        scoreEl.textContent = field.score
        const availEl = document.createElement('div')
        availEl.style.cssText = 'color:#9ca3af;font-size:8px;font-weight:700;line-height:1'
        availEl.textContent = isAvail ? '✓' : '✗'
        dot.appendChild(scoreEl)
        dot.appendChild(availEl)

        const nameEl = document.createElement('div')
        nameEl.style.cssText = [
          `color:${color}`, 'font-size:10px', 'font-weight:700', 'white-space:nowrap',
          'text-shadow:0 1px 4px #000,0 0 8px #000',
          'background:rgba(0,0,0,0.6)', 'padding:1px 5px', 'border-radius:4px',
        ].join(';')
        nameEl.textContent = field.code
        el.appendChild(dot)
        el.appendChild(nameEl)

        // hover — לא לגעת ב-transform של el (MapLibre מנהל אותו); סקייל על dot בלבד
        el.addEventListener('mouseenter', () => { dot.style.boxShadow = `0 0 22px ${color}cc`; dot.style.zIndex = '200' })
        el.addEventListener('mouseleave', () => { dot.style.boxShadow = `0 0 ${isRecommend ? '18px' : '10px'} ${color}55`; dot.style.zIndex = '1' })
        el.addEventListener('click', e => {
          e.stopPropagation()
          popup.setLngLat(field.center).setHTML(buildPopupHTML(field)).addTo(map)
          if (onFieldSelect) onFieldSelect(field)
        })

        const fm = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(field.center)
          .addTo(map)
        markersRef.current.forces.push(fm)

        // ── מרקרי מפגעים ───────────────────────────��─────────
        if (field.hazards?.length > 0) {
          const hEl = document.createElement('div')
          const topSeverity = field.hazards[0].severity
          const hColor = topSeverity === 'high' ? '#ef4444' : topSeverity === 'medium' ? '#f59e0b' : '#9ca3af'
          hEl.style.cssText = [
            'width:26px', 'height:26px', 'border-radius:50%',
            `background:${hColor}22`, `border:2px solid ${hColor}`,
            'display:flex', 'align-items:center', 'justify-content:center',
            'font-size:13px', 'cursor:pointer',
            `box-shadow:0 0 8px ${hColor}66`,
          ].join(';')
          hEl.textContent = '⚠️'
          hEl.title = field.hazards.map(h => h.label).join(' | ')
          hEl.addEventListener('click', e => {
            e.stopPropagation()
            const html = `<div style="direction:rtl;text-align:right;font-family:sans-serif">
              <div style="font-weight:700;font-size:13px;color:#f9fafb;margin-bottom:6px">מפגעים — ${field.code}</div>
              ${field.hazards.map(h => `<div style="font-size:11px;color:${h.severity==='high'?'#ef4444':h.severity==='medium'?'#f59e0b':'#9ca3af'};margin-bottom:3px">⚠️ ${h.label}</div>`).join('')}
            </div>`
            popup.setLngLat([field.center[0] + 0.005, field.center[1] + 0.005]).setHTML(html).addTo(map)
          })
          const hm = new maplibregl.Marker({ element: hEl, anchor: 'center' })
            .setLngLat([field.center[0] + 0.008, field.center[1] + 0.006])
            .addTo(map)
          markersRef.current.hazards.push(hm)
        }

        // ── מרקרי תשתיות ─────────────────────────────────────
        if (field.infrastructure?.length > 0) {
          const iEl = document.createElement('div')
          iEl.style.cssText = [
            'width:26px', 'height:26px', 'border-radius:6px',
            'background:rgba(59,130,246,0.2)', 'border:2px solid #3b82f6',
            'display:flex', 'align-items:center', 'justify-content:center',
            'font-size:13px', 'cursor:pointer',
            'box-shadow:0 0 8px rgba(59,130,246,0.4)',
          ].join(';')
          iEl.textContent = field.infrastructure[0].icon
          iEl.title = field.infrastructure.map(i => i.label).join(' | ')
          iEl.addEventListener('click', e => {
            e.stopPropagation()
            const html = `<div style="direction:rtl;text-align:right;font-family:sans-serif">
              <div style="font-weight:700;font-size:13px;color:#f9fafb;margin-bottom:6px">תשתיות — ${field.code}</div>
              ${field.infrastructure.map(i => `<div style="font-size:11px;color:#9ca3af;margin-bottom:3px">${i.icon} ${i.label}</div>`).join('')}
            </div>`
            popup.setLngLat([field.center[0] - 0.005, field.center[1] + 0.005]).setHTML(html).addTo(map)
          })
          const im = new maplibregl.Marker({ element: iEl, anchor: 'center' })
            .setLngLat([field.center[0] - 0.008, field.center[1] + 0.006])
            .addTo(map)
          markersRef.current.infrastructure.push(im)
        }
      })
    })

    map.on('error', e => console.error('[RegionMapView]', e.error?.message || e))
    mapObj.current = map
    const t = setTimeout(() => map.resize(), 120)

    return () => {
      clearTimeout(t)
      Object.values(markersRef.current).flat().forEach(m => m.remove())
      markersRef.current = { forces: [], hazards: [], infrastructure: [] }
      map.remove()
      mapObj.current = null
    }
  }, []) // eslint-disable-line

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* כפתור 3D — צד ימין עליון (אחיד עם MapView) */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
        <button
          onClick={toggle3D}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg
            ${is3D
              ? 'bg-demo-gold text-black'
              : 'bg-demo-surface/90 text-demo-gold border border-demo-gold/40 backdrop-blur-sm'}`}
        >
          ⛰️ {is3D ? '2D' : '3D'}
        </button>
      </div>

      {/* אינדיקטור מצב urgent */}
      {mode === 'urgent' && (
        <div
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}
          className="flex items-center gap-2 bg-green-900/80 border border-green-500/40 rounded-xl px-4 py-2.5 shadow-xl"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          <span className="text-green-400 text-sm font-bold">3 שטחים פנויים השבוע</span>
        </div>
      )}

      {/* מקרא מינימלי */}
      <div
        style={{ position: 'absolute', bottom: 36, right: 12, zIndex: 10 }}
        className="bg-demo-surface/90 backdrop-blur-sm border border-demo-border rounded-xl px-3 py-2 text-xs space-y-1"
        dir="rtl"
      >
        <div className="text-gray-500 font-semibold text-[10px] uppercase tracking-wide mb-1">מקרא</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#c6953b]/20 border border-[#c6953b] inline-block"/>
          <span className="text-[#c6953b]">מומלץ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#3b82f6]/20 border border-[#3b82f6] inline-block"/>
          <span className="text-gray-300">זמין</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#6b7280]/20 border border-[#6b7280] inline-block"/>
          <span className="text-gray-400">תפוס</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-0 border-t-2 border-dashed border-[#c6953b] inline-block"/>
          <span className="text-gray-400">גבול גזרה</span>
        </div>
      </div>

      {/* Popup CSS + animation */}
      <style>{`
        @keyframes regionPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(198,149,59,0.4); }
          50%       { box-shadow: 0 0 28px rgba(198,149,59,0.9); }
        }
        .sadan-popup .maplibregl-popup-content {
          background: #111827;
          border: 1px solid rgba(198,149,59,0.3);
          border-radius: 12px;
          padding: 12px 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        }
        .sadan-popup .maplibregl-popup-tip { border-top-color: #111827; }
        .sadan-popup .maplibregl-popup-close-button { color: #9ca3af; font-size: 16px; padding: 4px 8px; }
        .sadan-popup .maplibregl-popup-close-button:hover { color: #fff; }
      `}</style>
    </div>
  )
}

/**
 * FiringConesLayer — מצייר קונוסי ירי על MapLibre map
 * מחזיר פונקציית cleanup
 */
import { firingCones, buildConePolygon } from '../../data/firingCones.js'

const SOURCE_ID = 'firing-cones-source'
const FILL_ID   = 'firing-cones-fill'
const LINE_ID   = 'firing-cones-line'

function buildPopupHTML(cone) {
  return `
    <div style="direction:rtl;text-align:right;font-family:sans-serif;max-width:200px">
      <div style="font-weight:700;font-size:13px;color:#f9fafb;margin-bottom:4px">
        🔫 ${cone.phase}
      </div>
      <div style="font-size:11px;color:#9ca3af;line-height:1.6">
        ${cone.label}<br/>
        אמל"ח: <span style="color:#f59e0b">${cone.ammo}</span>
      </div>
    </div>
  `
}

export function addFiringCones(map, planId, popup) {
  const cones = firingCones[planId] || []

  // בנה GeoJSON
  const features = cones.map(cone => ({
    type: 'Feature',
    properties: {
      phase: cone.phase,
      label: cone.label,
      ammo:  cone.ammo,
      color: cone.color,
      popup_title: `🔫 ${cone.phase}`,
      popup_body:  `${cone.label}\nאמל"ח: ${cone.ammo}`,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [buildConePolygon(cone.origin, cone.azimuth, cone.spread, cone.range)],
    },
  }))

  const geojson = { type: 'FeatureCollection', features }

  // הסר שכבות קיימות אם יש
  removeFiringCones(map)

  if (features.length === 0) return

  map.addSource(SOURCE_ID, { type: 'geojson', data: geojson })

  map.addLayer({
    id: FILL_ID, type: 'fill', source: SOURCE_ID,
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.15,
    },
  })

  map.addLayer({
    id: LINE_ID, type: 'line', source: SOURCE_ID,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 1.5,
      'line-opacity': 0.8,
    },
  })

  // קליקביליות
  map.on('click', FILL_ID, e => {
    const props = e.features?.[0]?.properties
    if (!props) return
    popup
      .setLngLat(e.lngLat)
      .setHTML(buildPopupHTML(props))
      .addTo(map)
  })

  map.on('mouseenter', FILL_ID, () => { map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', FILL_ID, () => { map.getCanvas().style.cursor = '' })
}

export function removeFiringCones(map) {
  if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID)
  if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID)
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
}

export function setFiringConesVisibility(map, visible) {
  const vis = visible ? 'visible' : 'none'
  if (map.getLayer(FILL_ID)) map.setLayoutProperty(FILL_ID, 'visibility', vis)
  if (map.getLayer(LINE_ID)) map.setLayoutProperty(LINE_ID, 'visibility', vis)
}

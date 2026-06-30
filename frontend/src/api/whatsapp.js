// Relative paths — proxied by Vite (vite.config.js) to the real services.
// Works identically on localhost (desktop dev) and through the tunnel (phone).
const WA_BASE  = '/wa'
const API_BASE = '/api'

// URL לתמונת שטח 309ה — OpenStreetMap static map
// lat=31.830, lng=35.228, zoom=13 — מראה את כל אזור הפעילות
export const AREA_309_MAP_URL =
  'https://staticmap.openstreetmap.de/staticmap.php' +
  '?center=31.830,35.228&zoom=13&size=640x480' +
  '&markers=31.836,35.225,ol-marker-red|31.842,35.241,ol-marker-red'

export async function getWAStatus() {
  const r = await fetch(`${WA_BASE}/status`)
  return r.json()
}

// שליחת הודעת טקסט בלבד
export async function sendWhatsApp(message, phone) {
  const r = await fetch(`${WA_BASE}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, phone }),
  })
  return r.json()
}

// שליחת הודעה עם תמונה (MediaMessage)
// mediaUrl — URL לתמונה; caption — טקסט שמתחת לתמונה
export async function sendWhatsAppMedia({ phone, mediaUrl, caption }) {
  const r = await fetch(`${WA_BASE}/send-media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, mediaUrl, caption }),
  })
  return r.json()
}

export async function getIncomingMessages() {
  const r = await fetch(`${WA_BASE}/messages`)
  const data = await r.json()
  return data.messages || []
}

export async function sendVoiceNote(to, scriptId) {
  const r = await fetch(`${API_BASE}/voice/voice-note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, script_id: scriptId }),
  })
  return r.json()  // { sent, script_text, error }
}

export function buildRtgMessage({ unit, field, date, ammo }) {
  return (
    `🌿 *תיאום תרגיל — SADAN*\n` +
    `• יחידה: ${unit}\n` +
    `• שטח: ${field}\n` +
    `• תאריך: ${date}\n` +
    `• תחמוש: ${ammo}\n` +
    `📍 צילום שטח מצורף\n` +
    `✅ לאישור — השב *מאשר*`
  )
}

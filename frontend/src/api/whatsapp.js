const WA_BASE = 'http://localhost:3001'

export async function getWAStatus() {
  const r = await fetch(`${WA_BASE}/status`)
  return r.json()
}

export async function sendWhatsApp(message, phone) {
  const r = await fetch(`${WA_BASE}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, phone }),
  })
  return r.json()
}

export async function getIncomingMessages() {
  const r = await fetch(`${WA_BASE}/messages`)
  const data = await r.json()
  return data.messages || []
}

export function buildRtgMessage({ unit, field, date, ammo }) {
  return (
    `🌿 *תיאום תרגיל — SADAN*\n` +
    `• יחידה: ${unit}\n` +
    `• שטח: ${field}\n` +
    `• תאריך: ${date}\n` +
    `• תחמוש: ${ammo}\n` +
    `✅ לאישור — השב *מאשר*`
  )
}

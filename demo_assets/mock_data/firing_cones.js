/**
 * משפכי ירי — לכל מתווה
 * נקודת ירי + כיוון אזימוט + זווית + טווח
 */

// חישוב polygon משולש (קונוס) מנקודת ירי
export function buildConePolygon(origin, azimuthDeg, spreadDeg, rangeMeters) {
  const toRad  = d => d * Math.PI / 180
  const LNG_M  = 111320 // מטרים לדרגת קו אורך (בקירוב לגולן)
  const LAT_M  = 110540 // מטרים לדרגת קו רוחב
  const [lng, lat] = origin

  const leftAz  = azimuthDeg - spreadDeg / 2
  const rightAz = azimuthDeg + spreadDeg / 2

  function dest(az) {
    return [
      lng + (rangeMeters * Math.sin(toRad(az))) / LNG_M,
      lat + (rangeMeters * Math.cos(toRad(az))) / LAT_M,
    ]
  }

  const left  = dest(leftAz)
  const right = dest(rightAz)
  return [origin, left, right, origin]
}

// ── קונוסים לכל מתווה ────────────────────────────────────
export const firingCones = {

  // מתווה 1 — איגוף מדרום (ירי חי, 3 קווי שלב)
  plan_1: [
    {
      phase: 'קו שלב א׳',
      origin: [35.228, 31.820],
      azimuth: 10,
      spread: 20,
      range: 350,
      ammo: '5.56',
      color: '#ef4444',
      label: 'קש"א — 5.56, טווח 350מ׳',
    },
    {
      phase: 'קו שלב ב׳',
      origin: [35.235, 31.830],
      azimuth: 350,
      spread: 18,
      range: 300,
      ammo: '5.56 + חבלה',
      color: '#f97316',
      label: 'קש"ב — 5.56 + חבלה, טווח 300מ׳',
    },
    {
      phase: 'קו שלב ג׳',
      origin: [35.245, 31.836],
      azimuth: 15,
      spread: 15,
      range: 280,
      ammo: '5.56',
      color: '#eab308',
      label: 'קש"ג — 5.56, טווח 280מ׳',
    },
  ],

  // מתווה 2 — חזיתי ברצף
  plan_2: [
    {
      phase: 'גל ראשון',
      origin: [35.230, 31.812],
      azimuth: 0,
      spread: 25,
      range: 400,
      ammo: '5.56',
      color: '#3b82f6',
      label: 'גל א׳ — 5.56, טווח 400מ׳',
    },
    {
      phase: 'גל שני',
      origin: [35.240, 31.820],
      azimuth: 5,
      spread: 20,
      range: 350,
      ammo: '5.56',
      color: '#6366f1',
      label: 'גל ב׳ — 5.56, טווח 350מ׳',
    },
    {
      phase: 'גל שלישי',
      origin: [35.245, 31.830],
      azimuth: 358,
      spread: 18,
      range: 300,
      ammo: '5.56',
      color: '#8b5cf6',
      label: 'גל ג׳ — 5.56, טווח 300מ׳',
    },
  ],

  // מתווה 3 — לילי חבלה (ירי מוגבל)
  plan_3: [
    {
      phase: 'נקודת חבלה',
      origin: [35.240, 31.825],
      azimuth: 270,
      spread: 30,
      range: 150,
      ammo: 'חבלה',
      color: '#f59e0b',
      label: 'אזור חבלה — רדיוס 150מ׳',
    },
    {
      phase: 'ירי כיסוי',
      origin: [35.228, 31.820],
      azimuth: 45,
      spread: 15,
      range: 200,
      ammo: '5.56',
      color: '#9ca3af',
      label: 'כיסוי — 5.56, טווח 200מ׳',
    },
  ],

  // מאפס — ריק (יתמלא אם המפקד בונה מאפס)
  plan_custom: [],
}

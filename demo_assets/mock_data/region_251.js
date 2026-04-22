/**
 * גזרת הגולן — אזור 251
 * 5 שטחי אש מייצגים לתצוגת בחירה בדמו
 * נתונים סינתטיים — לדמו בלבד
 */

// ── פוליגון גבול הגזרה ────────────────────────────────────
const REGION_BOUNDARY_GEOJSON = {
  type: 'Feature',
  properties: { category: 'region_boundary', name: 'גזרת הגולן — אזור 251' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [35.64, 33.28],
      [35.78, 33.32],
      [35.97, 33.18],
      [36.00, 32.98],
      [35.97, 32.75],
      [35.78, 32.65],
      [35.62, 32.72],
      [35.60, 32.92],
      [35.64, 33.10],
      [35.64, 33.28],
    ]],
  },
}

// ── 5 שטחי אש נבחרים ────────────────────────────────────
export const DEMO_FIELDS_251 = [
  {
    id: '131a',
    code: '131 א׳',
    name: 'ש.א. אל פוראן',
    region: 'צפון-מרכז',
    center: [35.80, 33.02],
    score: 78,
    scoreLabel: 'התאמה טובה',
    available: true,
    type: 'שטח_אש',
    size_km2: 9.8,
    capacity: 'מחלקה מוגברת',
    capabilities: ['ירי חי — חי"ר', 'תרגול כיבוש', 'תרגיל לילה', 'חבלה'],
    hazards: [
      { type: 'קו מתח גבוה', severity: 'high', label: 'קו 161KV — צפון-מזרח' },
      { type: 'שמורת טבע', severity: 'medium', label: 'שמורת נחל עיון' },
    ],
    history: { lastExercise: 'מרץ 2026', lastUnit: 'גדוד 13', lastScore: 76, totalExercises: 9 },
    manager: 'יוסי גרין — מתא"ם שטחי אש צפון',
    polygon: [
      [35.788, 33.030], [35.812, 33.030], [35.812, 33.010],
      [35.788, 33.010], [35.788, 33.030],
    ],
  },
  {
    id: '131b',
    code: '131 ב׳',
    name: 'ש.א. דלווה',
    region: 'צפון-מרכז',
    center: [35.83, 32.99],
    score: 72,
    scoreLabel: 'התאמה בינונית',
    available: true,
    type: 'שטח_אש',
    size_km2: 7.2,
    capacity: 'מחלקה',
    capabilities: ['ירי חי — חי"ר', 'תרגיל לילה'],
    hazards: [
      { type: 'ישוב קרוב', severity: 'high', label: 'אורטל — מגבלת ירי כבד 23:00–06:00' },
    ],
    history: { lastExercise: 'ינואר 2026', lastUnit: 'גדוד 17', lastScore: 68, totalExercises: 6 },
    manager: 'מיכל אורן — מתא"ם שטחי אש מרכז',
    polygon: [
      [35.818, 33.000], [35.842, 33.000], [35.842, 32.980],
      [35.818, 32.980], [35.818, 33.000],
    ],
  },
  {
    id: '309h',
    code: '309ה',
    name: 'ש.א. 309ה',
    region: 'מרכז-דרום',
    center: [35.88, 32.86],
    score: 92,
    scoreLabel: 'מומלץ ביותר',
    available: true,
    recommended: true,
    type: 'שטח_אש',
    size_km2: 12.4,
    capacity: 'גדוד מוגבר',
    capabilities: [
      'ירי חי — כל הנשק האורגני',
      'תרגול כיבוש בשטח פתוח',
      'תרגיל לילה',
      'חבלה — אזור מורשה',
      'נחיתת מסוקים (2 נקודות)',
    ],
    hazards: [
      { type: 'שמורת טבע', severity: 'medium', label: 'שמורת נחל קדרון — צד מזרח' },
      { type: 'קו מתח גבוה', severity: 'high', label: 'קו חשמל 161KV — צלב צפוני' },
      { type: 'עתיקות', severity: 'low', label: 'תל עתיקות — לא לכלי רכב כבדים' },
    ],
    history: {
      lastExercise: 'פברואר 2026',
      lastUnit: 'גדוד 51',
      lastScore: 82,
      weakness: 'ניווט לילי — חולשה מתועדת (3 תרגילים)',
      totalExercises: 14,
    },
    infrastructure: [
      { icon: '🏕️', label: 'אזור כינוס — קיבולת 400 כ"א' },
      { icon: '🏢', label: 'מבנה מנהלה + שירותים' },
      { icon: '💧', label: 'נקודת מים (2 ברזי מילוי)' },
      { icon: '🚁', label: '2 נקודות נחיתת מסוקים' },
    ],
    manager: 'קרן ג\'ימס — מתא"ם שטחי אש',
    polygon: [
      [35.862, 32.878], [35.898, 32.878], [35.898, 32.842],
      [35.862, 32.842], [35.862, 32.878],
    ],
  },
  {
    id: '120m',
    code: '120 מ׳',
    name: 'ש.א. 120 מרכז',
    region: 'מרכז',
    center: [35.86, 32.93],
    score: 85,
    scoreLabel: 'התאמה גבוהה',
    available: false,
    availableDate: '12.5.2026',
    type: 'שטח_אש',
    size_km2: 10.1,
    capacity: 'גדוד',
    capabilities: ['ירי חי — חי"ר', 'שריון', 'תרגיל לילה', 'ירי כבד'],
    hazards: [
      { type: 'ישובים שכנים', severity: 'high', label: 'שעל / גון — ירי כבד עד 01:00 בלבד' },
    ],
    history: { lastExercise: 'אפריל 2026', lastUnit: 'גדוד 53', lastScore: 88, totalExercises: 19 },
    manager: 'ניר שרון — מתא"ם שטחי אש מרכז',
    polygon: [
      [35.848, 32.942], [35.872, 32.942], [35.872, 32.918],
      [35.848, 32.918], [35.848, 32.942],
    ],
  },
  {
    id: '122a',
    code: '122 א׳',
    name: 'ש.א. משתא',
    region: 'דרום',
    center: [35.81, 32.77],
    score: 68,
    scoreLabel: 'התאמה נמוכה',
    available: true,
    type: 'שטח_אש',
    size_km2: 8.6,
    capacity: 'מחלקה',
    capabilities: ['ירי חי — חי"ר', 'שריון', 'ירי כבד'],
    hazards: [
      { type: 'ישובים שכנים', severity: 'high', label: 'יונתן / קשת — מגבלות ירי' },
      { type: 'שמורת טבע', severity: 'medium', label: 'שמורת יהודיה' },
    ],
    history: { lastExercise: 'דצמבר 2025', lastUnit: 'גדוד 74', lastScore: 71, totalExercises: 11 },
    manager: 'רותם כהן — מתא"ם שטחי אש דרום',
    polygon: [
      [35.798, 32.782], [35.822, 32.782], [35.822, 32.758],
      [35.798, 32.758], [35.798, 32.782],
    ],
  },
]

// ── אובייקט הגזרה המלאה ────────────────────────────────
export const REGION_251 = {
  id: '251',
  name: 'גזרת הגולן',
  code: 'אזור 251',
  division: 'אוגדה 210',
  center: [35.82, 32.93],
  zoom: 9.8,
  totalFields: 31,
  displayFields: DEMO_FIELDS_251,
  boundary: REGION_BOUNDARY_GEOJSON,
}

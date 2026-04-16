// ============================================================
// SADAN — נתוני Demo (hardcoded)
// כל הנתונים סינתטיים. יש לאמת עם רז לפני הדמו.
// ============================================================

// ── שטח אש 309ה ──────────────────────────────────────────
export const AREA_309 = {
  id: '309h',
  name: 'שטח אש 309ה',
  type: 'שטח_אש',
  region: 'גזרה צפונית',
  size_km2: 12.4,
  capacity: 'גדוד מוגבר',
  score: 78,
  scoreLabel: 'התאמה גבוהה',
  manager: 'קרן ג\'ימס — מתא"ם שטחי אש',
  managerPhone: '050-XXX-XXXX',

  capabilities: [
    'ירי חי — כל הנשק האורגני',
    'תרגול כיבוש בשטח פתוח',
    'תרגיל לילה',
    'חבלה — אזור מורשה',
    'נחיתת מסוקים (2 נקודות)',
  ],

  hazards: [
    { id: 'h1', type: 'שמורת טבע',    severity: 'medium', label: 'שמורת נחל קדרון — צד מזרח' },
    { id: 'h2', type: 'קו מתח גבוה',  severity: 'high',   label: 'קו חשמל 161KV — צלב צפוני' },
    { id: 'h3', type: 'עתיקות',        severity: 'low',    label: 'תל עתיקות — לא לכלי רכב כבדים' },
  ],

  infrastructure: [
    { icon: '🏕️', label: 'אזור כינוס — קיבולת 400 כ"א' },
    { icon: '🏢', label: 'מבנה מנהלה + שירותים' },
    { icon: '💧', label: 'נקודת מים (2 ברזי מילוי)' },
    { icon: '🚁', label: '2 נקודות נחיתת מסוקים' },
  ],

  history: {
    lastExercise: 'פברואר 2026',
    lastUnit: 'גדוד 51',
    lastScore: 82,
    weakness: 'ניווט לילי — חולשה מתועדת (3 תרגילים)',
    totalExercises: 14,
  },

  // GeoJSON — גבולות השטח + נקודות עניין (סינתטי)
  geojson: {
    type: 'FeatureCollection',
    features: [

      // ══ גבול השטח ════════════════════════════════════════
      {
        type: 'Feature',
        properties: { category: 'boundary', name: 'שטח אש 309ה' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [35.21, 31.85], [35.28, 31.85], [35.28, 31.79],
            [35.21, 31.79], [35.21, 31.85],
          ]],
        },
      },

      // ══ מפגעים — פוליגונים ═══════════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'hazard_zone',
          label: 'שמורת נחל קדרון',
          severity: 'medium',
          icon: '🌿',
          popup_title: '🌿 שמורת נחל קדרון',
          popup_body: 'סוג: שמורת טבע | חומרה: בינונית\nמגבלה: אין כניסה ל-200מ׳ מגדר הצפון-מזרחי\nאחראי: רשות הטבע והגנים',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [35.262, 31.832], [35.280, 31.832], [35.280, 31.810],
            [35.262, 31.810], [35.262, 31.832],
          ]],
        },
      },

      // ══ מפגעים — קו חשמל (LineString) ═══════════════════
      {
        type: 'Feature',
        properties: {
          category: 'powerline',
          label: 'קו חשמל 161KV',
          severity: 'high',
          popup_title: '⚡ קו חשמל 161KV',
          popup_body: 'סוג: קו מתח גבוה | חומרה: גבוהה\nמגבלה: מרחק מינימום 100מ׳ מהקו\nאיסור: ירי/חפירה ברדיוס 50מ׳\nאחראי: חברת חשמל — קצין בטיחות',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [35.200, 31.847], [35.230, 31.845], [35.260, 31.843],
            [35.290, 31.841], [35.310, 31.840],
          ],
        },
      },

      // ══ מפגעים — נקודות ══════════════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'hazard',
          label: 'תל עתיקות',
          severity: 'low',
          icon: '🏺',
          popup_title: '🏺 תל עתיקות',
          popup_body: 'סוג: אתר מורשת | חומרה: נמוכה\nמגבלה: אין כלי רכב כבדים\nאיסור: ירי ממוקד לעבר התל\nאחראי: רשות העתיקות',
        },
        geometry: { type: 'Point', coordinates: [35.223, 31.810] },
      },

      // ══ תשתיות ═══════════════════════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'infrastructure',
          label: 'אזור כינוס',
          icon: '🏕️',
          popup_title: '🏕️ אזור כינוס',
          popup_body: 'קיבולת: 400 כ״א\nמים: נקודת מילוי פעילה\nחשמל: גנרטור 50KW\nחניית רכב: עד 80 כלים',
        },
        geometry: { type: 'Point', coordinates: [35.233, 31.832] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'infrastructure',
          label: 'מבנה מנהלה',
          icon: '🏢',
          popup_title: '🏢 מבנה מנהלה',
          popup_body: 'חדרים: 4 | שירותים: כן\nאחסנה: 2 מחסנים\nתקשורת: רשת קווית + אנטנה\nקיבולת לינה: 20 מ״פ',
        },
        geometry: { type: 'Point', coordinates: [35.240, 31.826] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'infrastructure',
          label: 'נקודת מים',
          icon: '💧',
          popup_title: '💧 נקודת מים',
          popup_body: 'ברזי מילוי: 2\nקיבולת: 2,000 ל׳/שעה\nלחץ: 4 בר\nתוקף בדיקה: 03/2026',
        },
        geometry: { type: 'Point', coordinates: [35.257, 31.814] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'infrastructure',
          label: 'נחיתת מסוקים',
          icon: '🚁',
          popup_title: '🚁 נקודת נחיתה',
          popup_body: 'מדרגה: 2 מסוקים בו-זמנית\nסוגים מאושרים: UH-60, CH-53\nתאורת לילה: כן\nאישור נדרש: 24ש׳ מראש',
        },
        geometry: { type: 'Point', coordinates: [35.218, 31.838] },
      },

      // ══ כוחות שכנים — פוליגונים + נקודות מרכז ════════════
      {
        type: 'Feature',
        properties: {
          category: 'neighbor_zone',
          label: 'גדוד 202',
          popup_title: '🔵 גדוד 202 — כוח ידידותי',
          popup_body: 'יחידה: גדוד 202 חי״ר\nשטח: 2.1 קמ״ר\nתאריכים: 01–08/05/2026\nמפקד: רס״ן כהן א׳\nתיאום נדרש: 48ש׳ לפני כניסה',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [35.212, 31.855], [35.258, 31.855],
            [35.258, 31.878], [35.212, 31.878],
            [35.212, 31.855],
          ]],
        },
      },
      {
        type: 'Feature',
        properties: {
          category: 'neighbor_zone',
          label: 'סוללת תותחנים 411',
          popup_title: '🟣 סוללת תותחנים 411',
          popup_body: 'יחידה: סוללת תותחנים 411\nשטח: 3.2 קמ״ר\nתאריכים: 03–07/05/2026\nמפקד: רס״ן לוי מ׳\nהערה: ירי חי — תיאום חובה',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [35.285, 31.792], [35.318, 31.792],
            [35.318, 31.820], [35.285, 31.820],
            [35.285, 31.792],
          ]],
        },
      },
      // נקודות מרכז לתוויות השכנים
      {
        type: 'Feature',
        properties: { category: 'neighbor', label: 'גד׳ 202' },
        geometry: { type: 'Point', coordinates: [35.235, 31.866] },
      },
      {
        type: 'Feature',
        properties: { category: 'neighbor', label: 'סול׳ תותחנים 411' },
        geometry: { type: 'Point', coordinates: [35.301, 31.806] },
      },

      // ══ היסטוריה ══════════════════════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'history',
          label: 'פבר׳ 26',
          icon: '📋',
          popup_title: '📋 תרגיל פברואר 2026',
          popup_body: 'סוג: כיבוש בשטח פתוח\nיחידה: גדוד 51 / פל׳ ב׳\nציון: 82/100\nחולשה: ניווט לילי — 3 אירועים\nהמלצה: הדגש ניווט ב-AO צפוני',
        },
        geometry: { type: 'Point', coordinates: [35.245, 31.826] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'history',
          label: 'ינו׳ 26',
          icon: '📋',
          popup_title: '📋 תרגיל ינואר 2026',
          popup_body: 'סוג: הגנה מעמיקה\nיחידה: גדוד 77\nציון: 71/100\nחולשה: תיאום תותחנים איחר ב-40 דקות\nהמלצה: הכנה מוקדמת לתיאום אש',
        },
        geometry: { type: 'Point', coordinates: [35.232, 31.818] },
      },
    ],
  },
}

// ── 3 מתווי אימון ─────────────────────────────────────────
export const PLANS = [
  {
    id: 'plan_1',
    name: 'איגוף מדרום',
    tag: 'מומלץ',
    tagColor: 'gold',
    score: 92,
    duration: '3 ימים',
    risk: 'בינוני',
    riskColor: 'orange',
    story: 'תמרון כיבוש בשני גלים — גל סיור ראשוני ולאחריו כיבוש מכיוון ז\'נובי תוך עקיפת ציר ראשי. מנצל את ארכיטקטורת השטח ואת החולשות המוכרות מהמודיעין.',
    objectives: ['כיבוש שלוש בטונדות', 'תיאום חפ"ק-פלוגה', 'ניהול אמל"ח בשטח'],
    ammo: ['5.56 — 30 קליפים לחייל', 'חבלה מוגבלת', 'עשן צבעוני'],
    notes: 'מתיק המדף — אומת ע"י רז',
    // נתיבי SVG לחיצים במפה מוקטנת
    arrows: [
      { from: [20, 80], to: [50, 40], color: '#c6953b' },
      { from: [50, 40], to: [80, 20], color: '#c6953b' },
    ],
    objectives_points: [
      { x: 80, y: 20, label: 'יעד א׳' },
      { x: 50, y: 40, label: 'יעד ב׳' },
    ],
  },
  {
    id: 'plan_2',
    name: 'חזיתי ברצף',
    tag: 'פשוט',
    tagColor: 'blue',
    score: 74,
    duration: '2 ימים',
    risk: 'נמוך',
    riskColor: 'green',
    story: 'התקפה חזיתית בשלושה גלים רצופים, ללא עקיפה. פשוט לתיאום, מתאים לכוח שנדרש לחזרה על בסיסי הכיבוש.',
    objectives: ['כיבוש שתי בטונדות', 'עבודת יחידות קטנות', 'ניהול פינוי'],
    ammo: ['5.56 — 20 קליפים לחייל', 'ללא חבלה'],
    notes: 'מתווה ב׳ — סינתטי',
    arrows: [
      { from: [50, 90], to: [50, 20], color: '#3b82f6' },
    ],
    objectives_points: [
      { x: 50, y: 20, label: 'יעד' },
    ],
  },
  {
    id: 'plan_3',
    name: 'לילי חבלה',
    tag: 'ניווט',
    tagColor: 'gray',
    score: 81,
    duration: '2 לילות',
    risk: 'גבוה',
    riskColor: 'red',
    story: 'תרגיל לילי עם מרכיב חבלה. הכוח יוצא בחשכה, מנווט 8 ק"מ, מבצע הרס מבנה ונסוג. דורש הכנה מלאה של קצין בטיחות.',
    objectives: ['ניווט לילה 8 ק"מ', 'חבלה מבוקרת', 'נסיגה מסודרת'],
    ammo: ['5.56 — 15 קליפים', 'חבלה — כמות מלאה', 'תאורה'],
    notes: 'מתווה ג׳ — סינתטי. דורש אישור בטיחות נוסף.',
    arrows: [
      { from: [10, 50], to: [40, 30], color: '#9ca3af' },
      { from: [40, 30], to: [70, 70], color: '#9ca3af' },
      { from: [70, 70], to: [10, 50], color: '#9ca3af' },
    ],
    objectives_points: [
      { x: 40, y: 30, label: 'חבלה' },
    ],
  },
]

// ── תיק תרגיל — 7 חלקים ──────────────────────────────────
export const EXERCISE_FILE = {
  name: 'תרגיל איגוף מדרום — גדוד 51',
  field: 'שטח אש 309ה',
  date: '05.05.2026',
  duration: '3 ימים',
  commander: 'רס"ן א. לוי',
  unit: 'גדוד 51 / פלוגה ב׳',
  status: 'טיוטה',

  sections: [
    {
      id: 'general',
      icon: 'ClipboardList',
      label: 'כללי',
      status: 'ok',
      content: {
        title: 'פקודה כללית',
        lines: [
          'שלב א׳ — כינוס ותדריך (H-4)',
          'שלב ב׳ — יציאה לשטח (H-2)',
          'שלב ג׳ — סיור ראשוני (H)',
          'שלב ד׳ — התקפה (H+2)',
          'שלב ה׳ — כיבוש וביסוס (H+4)',
          'שלב ו׳ — תחקיר ונסיגה (H+6)',
        ],
      },
    },
    {
      id: 'safety',
      icon: 'ShieldCheck',
      label: 'בטיחות',
      status: 'ok',
      content: {
        title: 'הוראות בטיחות',
        items: [
          'כלי נשק — מחסנית חוץ עד לשלב ההתקפה',
          'קצין בטיחות: סרן מ. כהן — נייד 050-XXX-XXXX',
          'רפואה: חובש גדוד + ניידת רפואה',
          'חדל — 3 יריות באוויר + עשן אדום',
          'סריקת מוקשים לפני כניסה לאזור חבלה',
        ],
      },
    },
    {
      id: 'fire',
      icon: 'Target',
      label: 'ירי ושטחים',
      status: 'pending',
      statusLabel: 'ממתין לקרקע בטוחה',
      content: {
        title: 'אזימוטי ירי',
        note: '[ממתין לאישור קרקע בטוחה מהמתא"ם]',
        items: [
          'קו ירי ראשי: אזימוט XXX — [יש להשלים]',
          'קו ירי משני: אזימוט XXX — [יש להשלים]',
          'גבול בטוח צפוני: [יש להשלים]',
          'גבול בטוח דרומי: [יש להשלים]',
        ],
      },
    },
    {
      id: 'natbam',
      icon: 'AlertTriangle',
      label: 'נת"בים',
      status: 'critical',
      statusLabel: 'נדרש עיון מיידי',
      content: {
        title: 'נת"בים — פרטים קריטיים',
        items: [
          '🔴 דו"צ: כל חייל מצויד בשתי חבישות אישיות',
          '🔴 פינוי רפואי: ניידת + מסלול פינוי מאושר',
          '🔴 נוהל אדם חסר: ספירה כל שעה',
          '🟡 מזג אוויר: ביטול אם גשם > 5 מ"מ/שעה',
          '🟡 תקשורת: חלופה בתדר 46.500',
        ],
      },
    },
    {
      id: 'checklist',
      icon: 'CheckSquare',
      label: 'בד"ח',
      status: 'ok',
      statusLabel: '30 פעולות',
      content: {
        title: 'בדיקות חובה — 30 פעולות',
        items: Array.from({ length: 30 }, (_, i) => `פעולה ${i + 1}: [פרט בד"ח ${i + 1}]`),
      },
    },
    {
      id: 'briefing',
      icon: 'Megaphone',
      label: 'תדריך',
      status: 'ok',
      statusLabel: '14 סעיפים',
      content: {
        title: 'תדריך מפקד — 14 סעיפים',
        items: [
          '1. מצב האויב', '2. מצב כוחות ידידותיים', '3. משימה',
          '4. ביצוע — תפיסה כללית', '5. משימות כפופים', '6. תיאום ושת"פ',
          '7. קשר', '8. לוגיסטיקה', '9. פיקוד ושליטה',
          '10. בטיחות', '11. רפואה', '12. פינוי',
          '13. שלבי האירוע', '14. סיכום ושאלות',
        ],
      },
    },
    {
      id: 'annex24',
      icon: 'FileText',
      label: 'נספח 24',
      status: 'ok',
      content: {
        title: 'נספח 24 — תיאומים',
        items: [
          'שטחים — אושר (קרן ג׳ימס, 01.05.2026)',
          'בטיחות — ממתין לאישור',
          'רפואה — אושר עם תנאים',
          'קשר — אושר (תדרים מוקצים)',
          'לוגיסטיקה — אושר',
          'תחמוש — ממתין',
        ],
      },
    },
  ],
}

// ── בוחן — 5 שאלות ───────────────────────────────────────
export const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'מה האזימוט הבטוח לירי בשלב ד׳?',
    options: ['270°', 'לפי פקודת הירי בשטח', '180°', '90°'],
    correct: 1,
    source: 'סעיף ירי ושטחים',
  },
  {
    id: 2,
    question: 'מה נוהל "חדל" בתרגיל זה?',
    options: [
      'ירייה אחת באוויר',
      '3 יריות באוויר + עשן אדום',
      'קריאה בקשר "חדל חדל חדל"',
      'נפנוף ביד',
    ],
    correct: 1,
    source: 'סעיף בטיחות',
  },
  {
    id: 3,
    question: 'מי קצין הבטיחות בתרגיל?',
    options: ['רס"ן א. לוי', 'סרן מ. כהן', 'רב"ט ג. דוד', 'מח"ט החטיבה'],
    correct: 1,
    source: 'סעיף בטיחות',
  },
  {
    id: 4,
    question: 'מתי מתבצעת ספירת כוח?',
    options: ['כל שעתיים', 'רק בתחילת כל שלב', 'כל שעה', 'פעמיים ביום'],
    correct: 2,
    source: 'סעיף נת"בים',
  },
  {
    id: 5,
    question: 'באיזה תנאי מזג אוויר מבטלים את התרגיל?',
    options: ['כל גשם', 'גשם > 5 מ"מ/שעה', 'רוח > 30 קמ"ש', 'ערפל מתחת ל-100 מ׳'],
    correct: 1,
    source: 'סעיף נת"בים',
  },
]

// ── גורמי תיאום ───────────────────────────────────────────
export const COORDINATION_PARTIES = [
  { id: 'rtg',       name: 'רטג (שטחים)',      icon: 'MapPin',      blocker: true,  status: 'pending',  contact: 'קרן ג׳ימס' },
  { id: 'safety',    name: 'בטיחות',            icon: 'ShieldCheck', blocker: true,  status: 'pending',  contact: 'סא"ל ביטחון שדה' },
  { id: 'medical',   name: 'רפואה',             icon: 'Heart',       blocker: true,  status: 'approved', contact: 'קצין רפואה גדוד' },
  { id: 'ammo',      name: 'תחמוש',             icon: 'Crosshair',   blocker: true,  status: 'pending',  contact: 'קצין תחמוש' },
  { id: 'logistics', name: 'לוגיסטיקה (אג"מ)', icon: 'Truck',       blocker: false, status: 'approved', contact: 'קצין אג"מ' },
  { id: 'comms',     name: 'קשר',               icon: 'Radio',       blocker: false, status: 'approved', contact: 'קצין קשר' },
  { id: 'intel',     name: 'מודיעין',           icon: 'Eye',         blocker: false, status: 'approved', contact: 'קמ"ן' },
  { id: 'hr',        name: 'כ"א',               icon: 'Users',       blocker: false, status: 'pending',  contact: 'קצין כ"א' },
  { id: 'civil',     name: 'תיאום אזרחי',      icon: 'Globe',       blocker: false, status: 'approved', contact: 'קצין תאום אזרחי' },
]

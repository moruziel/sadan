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

      // ══ ציר התקדמות — איגוף מדרום ══════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'axis',
          label: 'ציר התקדמות',
          popup_title: '→ ציר כוחות — איגוף מדרום',
          popup_body: 'מתווה: איגוף מדרום\nכיוון: דרום → מערב → צפון-מזרח\nגל א׳: סיור H | גל ב׳: כיבוש H+2\nכוח: פלוגה ב׳ גדוד 51',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [35.237, 31.797],
            [35.218, 31.803],
            [35.215, 31.820],
            [35.228, 31.837],
            [35.240, 31.842],
          ],
        },
      },

      // ══ נקודות דיווח — plan_1 (מוסתרות עד לבחירת מתווה) ══
      {
        type: 'Feature',
        properties: {
          category: 'reporting_point', plan: 'plan_1', label: 'נ.ד. 1',
          popup_title: '🔵 נקודת דיווח 1',
          popup_body: 'שלב: H-1\nמיקום: תחנה דרומית — יציאה לשטח\nדיווח לחפ"ק: "הגעת נ.ד. 1, ממשיכים"',
        },
        geometry: { type: 'Point', coordinates: [35.227, 31.800] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'reporting_point', plan: 'plan_1', label: 'נ.ד. 2',
          popup_title: '🔵 נקודת דיווח 2',
          popup_body: 'שלב: H — כניסה לשטח\nמיקום: ציר מערבי — לאחר עקיפה\nדיווח לחפ"ק: "הגעת נ.ד. 2, מוכן לסיור"',
        },
        geometry: { type: 'Point', coordinates: [35.216, 31.811] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'reporting_point', plan: 'plan_1', label: 'נ.ד. 3',
          popup_title: '🔵 נקודת דיווח 3',
          popup_body: 'שלב: H+1 — לפני יעד א׳\nמיקום: 200מ׳ דרומית ליעד א׳\nדיווח לחפ"ק: "מוכן להסתערות"',
        },
        geometry: { type: 'Point', coordinates: [35.222, 31.830] },
      },

      // ══ עמדות ירי ברתק — plan_1 ══════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'sbf_position', plan: 'plan_1', label: 'עמדת ירי א׳',
          popup_title: '🔫 עמדת ירי ברתק — א׳',
          popup_body: 'כוח: כיתה ב׳\nנשק: M16 + מקלע\nמטרה: יעד א׳ — בטונדה מערבית\nשלב: H+2 עד H+3 | תדר: 46.500',
        },
        geometry: { type: 'Point', coordinates: [35.228, 31.820] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'sbf_position', plan: 'plan_1', label: 'עמדת ירי ב׳',
          popup_title: '🔫 עמדת ירי ברתק — ב׳',
          popup_body: 'כוח: כיתה ג׳\nנשק: M16 + מקלע\nמטרה: יעד ב׳ — בטונדה מרכזית\nשלב: H+3 עד H+4 | תדר: 46.500',
        },
        geometry: { type: 'Point', coordinates: [35.245, 31.836] },
      },

      // ══ אזורי ירי בהסתערות — plan_1 ══════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'assault_area', plan: 'plan_1', label: 'א.ה. א׳',
          popup_title: '⚔️ אזור ירי בהסתערות — א׳',
          popup_body: 'יעד: יעד א׳ — בטונדה מערבית\nכוח: כיתה א׳\nשלב: H+2 | אמל"ח: 5.56 + חבלה\nאחראי בטיחות: סרן מ. כהן',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[35.222, 31.833], [35.234, 31.833], [35.234, 31.841], [35.222, 31.841], [35.222, 31.833]]],
        },
      },
      {
        type: 'Feature',
        properties: {
          category: 'assault_area', plan: 'plan_1', label: 'א.ה. ב׳',
          popup_title: '⚔️ אזור ירי בהסתערות — ב׳',
          popup_body: 'יעד: יעד ב׳ — בטונדה מרכזית (עיקרי)\nכוח: כיתה א׳ + כיתה ב׳\nשלב: H+3 | אמל"ח: 5.56\nאחראי בטיחות: סרן מ. כהן',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[35.235, 31.838], [35.246, 31.838], [35.246, 31.847], [35.235, 31.847], [35.235, 31.838]]],
        },
      },

      // ══ גבולות גזרה לירי — plan_1 ═════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'sector_boundary', plan: 'plan_1', label: 'ג.ג. שמאל',
          popup_title: '— גבול גזרה שמאל',
          popup_body: 'גבול ירי שמאלי — מוחלט\nאיסור: ירי מעבר לקו\nאחראי: מ"מ אברהם לוי',
        },
        geometry: {
          type: 'LineString',
          coordinates: [[35.210, 31.793], [35.210, 31.850]],
        },
      },
      {
        type: 'Feature',
        properties: {
          category: 'sector_boundary', plan: 'plan_1', label: 'ג.ג. ימין',
          popup_title: '— גבול גזרה ימין',
          popup_body: 'גבול ירי ימני — מוחלט\nאיסור: ירי מעבר לקו\nאחראי: מ"מ אברהם לוי',
        },
        geometry: {
          type: 'LineString',
          coordinates: [[35.258, 31.793], [35.258, 31.850]],
        },
      },

      // ══ נתיר — plan_1 ══════════════════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'clearance_route', plan: 'plan_1', label: 'נתיר א׳',
          popup_title: '✅ נתיר א׳ — מסלול מאושר',
          popup_body: 'סוג: נתיר כלי רכב + רגלים\nאושר: H-6 ע"י קצין הנדסה\nמגבלה: רכב עד 10 טון\nהערה: ייתכן שצידי הדרך לא נוקו',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [35.237, 31.797], [35.228, 31.800],
            [35.220, 31.803], [35.217, 31.812],
            [35.215, 31.820],
          ],
        },
      },

      // ══ נקודות תורפה בטיחותיות (נת"ב) ══════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'safety_hazard',
          hazard_type: 'water_pit',
          label: 'בור מים',
          severity: 'high',
          icon: '💧',
          popup_title: '⚠️ בור מים — נת"ב גבוה',
          popup_body: 'סוג: בור מים עתיק ללא גידור\nעומק משוער: 6–8 מטר\nקוטר: ~3 מטר\nמיקום: גזרת א.ה. ב׳ — 18מ׳ מהציר\nהגבלה: איסור כניסה לרדיוס 25מ׳',
        },
        geometry: { type: 'Point', coordinates: [35.249, 31.840] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'safety_hazard',
          hazard_type: 'ruins',
          label: 'חירבה',
          severity: 'high',
          icon: '🏚️',
          popup_title: '⚠️ חירבה ישנה — נת"ב גבוה',
          popup_body: 'סוג: מבנה אבן ישן מתפורר\nמצב: כשל מבנה אפשרי בגישה\nמיקום: 12מ׳ ממסלול ההסתערות ליעד א׳\nהגבלה: תחקיר מבנה נדרש H-48',
        },
        geometry: { type: 'Point', coordinates: [35.241, 31.833] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'safety_hazard',
          hazard_type: 'cliff',
          label: 'מצוק',
          severity: 'medium',
          icon: '🪨',
          popup_title: '⚠️ מצוק — נת"ב בינוני',
          popup_body: 'סוג: שפת מצוק טבעית\nגובה: ~4 מטר\nמיקום: גבול צפוני-מערבי של גזרת ג.ג. שמאל\nהגבלה: ירי מעבר לקו אסור — שטח מוות',
        },
        geometry: { type: 'Point', coordinates: [35.227, 31.832] },
      },

      // ══ כוחות ידידותיים ═══════════════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'friendly_start',
          label: 'חפ"ק גדוד 51',
          icon: '★',
          popup_title: '★ חפ"ק גדוד 51',
          popup_body: 'מפקד: רס"ן א. לוי\nתדר: 46.500 MHz\nשלב: H-4 — כינוס ותדריך\nמיקום: נקודת כינוס דרומית',
        },
        geometry: { type: 'Point', coordinates: [35.237, 31.797] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'friendly_start',
          label: 'תחנה רפואית',
          icon: '✚',
          popup_title: '✚ תחנה רפואית',
          popup_body: 'אחראי: חובש גדוד\nרכב: אמבולנס — נ.צ. מאושר\nקיבולת: 8 נפגעים\nציוד: עגלת חירום + MARCHPAWS',
        },
        geometry: { type: 'Point', coordinates: [35.232, 31.795] },
      },

      // ══ מטרות ══════════════════════════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'objective',
          label: 'יעד א׳',
          popup_title: '⊕ יעד א׳ — בטונדה מערבית',
          popup_body: 'סוג: בטונדה מחוזקת\nסדר כיבוש: ראשון\nשלב: H+2\nכוח מבצע: מחלקה א׳',
        },
        geometry: { type: 'Point', coordinates: [35.228, 31.837] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'objective',
          label: 'יעד ב׳',
          popup_title: '⊕ יעד ב׳ — בטונדה מרכזית',
          popup_body: 'סוג: בטונדה מחוזקת\nסדר כיבוש: שני (עיקרי)\nשלב: H+3\nכוח מבצע: מחלקה ב׳',
        },
        geometry: { type: 'Point', coordinates: [35.240, 31.842] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'objective',
          label: 'יעד ג׳',
          popup_title: '⊕ יעד ג׳ — עמדה מזרחית',
          popup_body: 'סוג: עמדה מחוזקת\nסדר כיבוש: שלישי\nשלב: H+4\nכוח מבצע: מחלקה ג׳',
        },
        geometry: { type: 'Point', coordinates: [35.252, 31.836] },
      },

      // ══ עמדות אויב (בימוי) ════════════════════════════════
      {
        type: 'Feature',
        properties: {
          category: 'enemy',
          label: 'מוצב אויב מרכז',
          popup_title: '✕ מוצב אויב — מרכז (בימוי)',
          popup_body: 'סוג: עמדה מחוזקת\nחוזק: מחלקה — 12 כ"א\nנשק: M16 + מקלע\nמרחק גילוי: ~400מ׳',
        },
        geometry: { type: 'Point', coordinates: [35.236, 31.831] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'enemy',
          label: 'עמדת אויב מזרח',
          popup_title: '✕ עמדת אויב — מזרח (בימוי)',
          popup_body: 'סוג: עמדה קלה\nחוזק: כיתה — 6 כ"א\nנשק: M16\nמרחק גילוי: ~250מ׳',
        },
        geometry: { type: 'Point', coordinates: [35.250, 31.828] },
      },
      {
        type: 'Feature',
        properties: {
          category: 'enemy',
          label: 'נ.ק. אויב',
          popup_title: '✕ נ.ק. אויב — נקודת קבוצה (בימוי)',
          popup_body: 'סוג: נקודת קבוצה\nחוזק: מחלקה — 10 כ"א\nנשק: M16 + RPG\nהערה: ממוקם בנקודת גובה',
        },
        geometry: { type: 'Point', coordinates: [35.244, 31.839] },
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
    ammo: ['5.56 — 30 קליעים לחייל', 'חבלה מוגבלת', 'עשן צבעוני'],
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
    ammo: ['5.56 — 20 קליעים לחייל', 'ללא חבלה'],
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
    ammo: ['5.56 — 15 קליעים', 'חבלה — כמות מלאה', 'תאורה'],
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
  name: 'תרגיל לוחמה בשטח פתוח — מחלקה ב׳',
  field: 'שטח אש 309ה',
  date: '05.05.2026',
  duration: '3 ימים',
  commander: 'סגן אברהם לוי',
  unit: 'גדוד 51 / מחלקה ב׳',
  approvalRank: 'סגן אלוף ומעלה',
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
          {
            text: 'שלב א׳ — כינוס ותדריך (H-4)',
            desc: 'ריכוז כלל הכוחות בנקודת המוצא. חלוקת תחמושת וציוד, בדיקת תקינות נשק, תדריך מפקד 14 סעיפים. כניסה לשטח מאושרת רק לאחר אישור קצין בטיחות.',
          },
          {
            text: 'שלב ב׳ — יציאה לשטח (H-2)',
            desc: 'תנועה בסדר קרב לאורך ציר אלון. דיווח בנ.ד. 1 ונ.ד. 2 לחפ"ק. שמירת מרווח 50מ׳ בין יחידות. כלי נשק — מחסנית בכיס.',
          },
          {
            text: 'שלב ג׳ — סיור ראשוני (H)',
            desc: 'בחינת שטח האימון, זיהוי יעדים א׳ ו-ב׳, אישור מיקום נת"בים בשטח. תיאום עם מ"פ שריון על חלון הריכוך. דיווח מנ.ד. 3 — "מוכן להסתערות".',
          },
          {
            text: 'שלב ד׳ — התקפה (H+2)',
            desc: 'ריכוך יעד א׳ ע"י טנק שריון. כיתה ב׳ מכסה מעמדת ירי א׳ (אזימוט 020°). כיתה א׳ מסתערת על יעד א׳ — ירי מהמותן בתנועה. ביטול ירי לפני כניסה.',
          },
          {
            text: 'שלב ה׳ — כיבוש וביסוס (H+4)',
            desc: 'כיבוש יעד ב׳ לאחר ביסוס יעד א׳. כיתה ג׳ מכסה מעמדת ירי ב׳ (אזימוט 015°). כיתות א׳+ב׳ מסתערות. סריקה, עצירת מחבלים, ביסוס עמדות הגנתיות.',
          },
          {
            text: 'שלב ו׳ — תחקיר ונסיגה (H+6)',
            desc: 'ספירת כוחות ובדיקת פצועים. סריקת שטח לנפלים ושאריות חבלה. תחקיר מפקד בשטח (15 דקות). נסיגה מסודרת לנ.ס. 11 — סיום אימון.',
          },
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
          'כלי נשק — מחסנית מחוץ לנשק בתנועה',
          'הכנסת מחסנית ביישור קו לפני ירי',
          'קצין בטיחות: סרן יואב שמיר',
          'רפואה: חובש גדוד + ניידת רפואה',
          'חדל — צעקות עד לווידוא חדל של כולם',
          'סריקת שטח לנפלים/שאריות חבלה לפני תחילת תרגיל',
        ],
        dilemmas: [
          {
            id: 'd1',
            severity: 'high',
            title: 'מסלול הסתערות סמוך לחירבה',
            description: 'מסלול ההסתערות ליעד א׳ עובר ב-12מ׳ מחירבה ישנה מתפוררת — סיכון כשל מבנה בעת תנועה תחת אש.',
            solution: 'הגבלת ציר ל-020° + חובת תחקיר מבנה על ידי קצין הנדסה H-48. סימון החירבה כ"אזור מחוץ לתחום" בתדריך.',
          },
          {
            id: 'd2',
            severity: 'high',
            title: 'בור מים ללא גידור בגזרת יעד ב׳',
            description: 'בור מים עתיק ללא גידור בפער של 18מ׳ מציר ההתקדמות לאזור הסתערות ב׳ — סיכון נפילה בתנאי לילה/לחץ.',
            solution: 'סימון הבור בסרטים ו-2 אורות מהבהבים. קביעת רדיוס מגבלה 25מ׳ בפקודת הבטיחות. הכרזה בתדריך.',
          },
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
        hasMap: true,
        pendingNote: 'ממתין לאישור קרקע בטוחה סופי מהמתא"ם — נדרש H−48',
        sectors: {
          left:  { label: 'ג.ג. שמאל', azimuth: '350°' },
          right: { label: 'ג.ג. ימין',  azimuth: '035°' },
        },
        clearance: {
          name:       'נתיר א׳',
          approvedBy: 'קצין הנדסה',
          time:       'H−6',
          constraint: 'כלי רכב עד 10 טון בלבד',
        },
        phases: [
          {
            id: 'a',
            stage: 'שלב ד׳',
            type: 'ירי נייח',
            label: 'ירי ברתק',
            position: 'עמדת ירי א׳',
            coord: "31°49′12″N / 35°13′41″E", lngLat: [35.228, 31.820],
            activatedAt: 'נ.ד. 3 — פקודת מ"מ',
            azimuth: '020°',
            leftLimit: '005°',
            rightLimit: '035°',
            target: 'יעד א׳',
            ammo: ['5.56 × 45 — 15 קליעים', 'מקלע — 200 כ"ד'],
            notes: 'כיתה ב׳ מכסה מ-ע.י.ב. א׳. כיתה א׳ מתקדמת מנ.ד. 3 לאזור הסתערות.',
          },
          {
            id: 'b',
            stage: 'שלב ד׳',
            type: 'ירי בתנועה',
            label: 'הסתערות',
            position: 'אזור הסתערות א׳',
            coord: "31°49′48″N / 35°14′06″E", lngLat: [35.235, 31.830],
            activatedAt: 'פקודת מ"מ — אחרי ביטול ירי ברתק',
            azimuth: '010°',
            leftLimit: '355°',
            rightLimit: '025°',
            target: 'יעד א׳',
            ammo: ['5.56 × 45 — 15 קליעים'],
            notes: 'כיתה א׳ — ירי מהמותן בתנועה. איסור מקלע. ביטול ירי בקשר עם כניסה לאזור.',
          },
          {
            id: 'c',
            stage: 'שלב ה׳',
            type: 'ירי נייח',
            label: 'ירי ברתק',
            position: 'עמדת ירי ב׳',
            coord: "31°50′10″N / 35°14′42″E", lngLat: [35.245, 31.836],
            activatedAt: 'נ.ד. 3 — לאחר ביסוס יעד א׳',
            azimuth: '015°',
            leftLimit: '000°',
            rightLimit: '030°',
            target: 'יעד ב׳',
            ammo: ['5.56 × 45 — 15 קליעים', 'מקלע — 200 כ"ד'],
            notes: 'כיתה ג׳ מכסה מ-ע.י.ב. ב׳. כיתות א׳+ב׳ מתקדמות.',
          },
          {
            id: 'd',
            stage: 'שלב ה׳',
            type: 'ירי בתנועה',
            label: 'הסתערות',
            position: 'אזור הסתערות ב׳',
            coord: "31°50′28″N / 35°14′53″E", lngLat: [35.248, 31.840],
            activatedAt: 'פקודת מ"מ — אחרי ביטול ירי ברתק',
            azimuth: '005°',
            leftLimit: '350°',
            rightLimit: '020°',
            target: 'יעד ב׳',
            ammo: ['5.56 × 45 — 15 קליעים'],
            notes: 'כיתות א׳+ב׳ — ירי מהמותן. סמל מלווה ועוצר לפני כל חפץ.',
          },
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
        title: 'נקודות תורפה בטיחותיות',
        hazards: [
          {
            id: 'n1',
            severity: 'high',
            icon: '💧',
            title: 'בור מים — ללא גידור',
            location: 'גזרת אזור הסתערות ב׳ — 18מ׳ מציר ההתקדמות',
            restriction: 'איסור כניסה לרדיוס 25מ׳ — מוחלט',
            details: 'בור עתיק, עומק משוער 6–8 מ׳, קוטר ~3 מ׳. אין גידור. סכנת נפילה קטלנית.',
          },
          {
            id: 'n2',
            severity: 'high',
            icon: '🏚️',
            title: 'חירבה ישנה — מבנה מתפורר',
            location: '12מ׳ ממסלול ההסתערות ליעד א׳',
            restriction: 'אסור להיכנס | תחקיר מבנה נדרש H-48',
            details: 'קירות אבן ישנים, כשל מבנה אפשרי בגישה. חייל שייגע במבנה — מפסיק ומדווח.',
          },
          {
            id: 'n3',
            severity: 'medium',
            icon: '🪨',
            title: 'שפת מצוק — גבול צפוני',
            location: 'גבול צפוני-מערבי, גזרת ג.ג. שמאל',
            restriction: 'ירי בכיוון זה — שטח מוות | סמן בסרט אדום',
            details: 'גובה ~4 מ׳. ירי מעבר לקו מוחלט אסור. חייל שמגיע לקו — מפסיק ומדווח.',
          },
          {
            id: 'n4',
            severity: 'medium',
            icon: '🌡️',
            title: 'סכנת התייבשות — עונתי',
            location: 'כל שטח האימון',
            restriction: 'מינימום 3 ל׳ לחייל | עצירה בצל כל 90 דק׳',
            details: 'אפריל–מאי: 28–35°C. שעות 10:00–14:00 קריטיות. תסמינים: כאב ראש, סחרחורת — מפנים מיד.',
          },
        ],
      },
    },
    {
      id: 'logistics',
      icon: 'Package',
      label: 'לוגיסטיקה',
      status: 'ok',
      content: {
        title: 'לוגיסטיקה ותמיכה',
        medical: {
          location: 'עמדת חובש — נ.ס. 11, כביש 375 (מערב לשטח)',
          evacuationMethod: 'רכוב: ניידת 4×4 + חובש | אווירי: UH-60 (טייסת 124)',
          evacuationRoute: 'ציר אלון — ממערב לשטח, יציאה בצומת כביש 375',
          responseTime: 'רכוב: 3–7 דק׳ | אווירי: ~20 דק׳',
          medic: 'רס"ל דביר כהן',
          medicPhone: '052-611-4422',
          emergencyPhone: '1221',
        },
        comms: {
          callSign: 'נמר-7',
          hmul: 'חמ"ל מתא"ם פיקוד מרכז',
          hmulPhone: '03-737-5500',
          mainFreq: '46.250 MHz',
          altFreq: '46.500 MHz',
          medFreq: '46.750 MHz',
        },
        food: {
          waterPoints: ['נ.ד. 2 — מיכלית', 'נ.ד. 5 — מיכלית', 'נ.ס. 11 — ג׳ריקנים'],
          minWaterPerSoldier: '3 ליטר לחייל ליום',
          mealsLocation: 'נ.ס. 11 — אחורי הגדוד',
          mealTimes: ['06:30 — ארוחת בוקר', '13:00 — ארוחת צהריים', '19:00 — ארוחת ערב'],
        },
        supply: {
          point: 'נ.ס. 11 — פלוגת אחור (רכז לוגיסטי)',
          logOfficer: 'רס"מ ירון לוי',
          vehicles: '2× נגמ"ש לוגיסטי, 1× פלס"ר',
          ammoReserve: 'ברשות קצין התחמוש — על-פי ביקוש',
        },
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
        accordion: [
          { title: '1. מצב האויב',                body: '' },
          { title: '2. מצב כוחות ידידותיים',      body: '' },
          { title: '3. משימה',                     body: '' },
          { title: '4. ביצוע — תפיסה כללית',      body: '' },
          { title: '5. משימות כפופים',             body: '' },
          { title: '6. תיאום ושת"פ',               body: '' },
          { title: '7. קשר',                       body: '' },
          { title: '8. לוגיסטיקה',                 body: '' },
          { title: '9. פיקוד ושליטה',              body: '' },
          { title: '10. בטיחות',                   body: '' },
          { title: '11. רפואה',                    body: '' },
          { title: '12. פינוי',                    body: '' },
          { title: '13. שלבי האירוע',              body: '' },
          { title: '14. סיכום ושאלות',             body: '' },
        ],
      },
    },
    {
      id: 'annex24',
      icon: 'FileText',
      label: 'נספח 24',
      status: 'pending',
      statusLabel: 'יתווסף בהמשך',
      content: {
        title: 'נספח 24 — תיאומים',
        note: 'יתווסף בהמשך',
        items: [],
      },
    },
  ],
}

// ── בוחן — 8 שאלות ───────────────────────────────────────
export const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'מה האזימוט לירי ברתק בשלב ד׳ — עמדת ירי א׳?',
    options: ['005°', '015°', '020°', '035°'],
    correct: 2,
    source: 'ירי ושטחים — שלב ד׳',
    tab: 'fire',
  },
  {
    id: 2,
    question: 'נוהל "חדל" — כיצד מסמנים עצירת ירי?',
    options: ['3 יריות באוויר + עשן', 'קריאה בקשר בלבד', 'צעקות עד לווידוא חדל של כולם', 'ירייה אחת + נפנוף'],
    correct: 2,
    source: 'בטיחות',
    tab: 'safety',
  },
  {
    id: 3,
    question: 'מי קצין הבטיחות האחראי בתרגיל?',
    options: ['רס"ן א. לוי', 'סרן יואב שמיר', 'רס"מ ירון לוי', 'מח"ט החטיבה'],
    correct: 1,
    source: 'בטיחות',
    tab: 'safety',
  },
  {
    id: 4,
    question: 'מה מינימום המים לחייל ליום בתרגיל זה?',
    options: ['1 ליטר', '1.5 ליטר', '2 ליטר', '3 ליטר'],
    correct: 3,
    source: 'לוגיסטיקה',
    tab: 'logistics',
  },
  {
    id: 5,
    question: 'מה אות הקריאה של הגדוד בקשר?',
    options: ['ארי-7', 'נמר-7', 'דוב-3', 'שועל-1'],
    correct: 1,
    source: 'לוגיסטיקה — קשר',
    tab: 'logistics',
  },
  {
    id: 6,
    question: 'מה ההגבלה מסביב לנת"ב "בור מים"?',
    options: ['איסור כניסה לרדיוס 10מ׳', 'סימון בסרט צהוב בלבד', 'איסור כניסה לרדיוס 25מ׳', 'אין הגבלה תנועה'],
    correct: 2,
    source: 'נת"בים',
    tab: 'natbam',
  },
  {
    id: 7,
    question: 'מה מטרת שלב ה׳ בתרגיל?',
    options: ['יציאה לשטח וסיור', 'ירי ברתק על יעד א׳', 'כיבוש וביסוס יעד ב׳', 'תחקיר ונסיגה'],
    correct: 2,
    source: 'כללי — שלב ה׳',
    tab: 'general',
  },
  {
    id: 8,
    question: 'באיזה תנאי מזג אוויר מבטלים את התרגיל?',
    options: ['כל גשם', 'גשם > 5 מ"מ/שעה', 'רוח > 30 קמ"ש', 'ברק במרחק 10 ק"מ'],
    correct: 1,
    source: 'נת"בים',
    tab: 'natbam',
  },
]

export const QUIZ_OPEN_QUESTION = {
  question: 'תאר בקצרה: כיצד מתואמת הפעולה בין כיתה ב׳ לבין הסתערות כיתה א׳ על יעד א׳? מה הצעד הקריטי לפני כניסת הכוח הרגלי?',
  keywords: ['ירי ברתק', 'עמדת ירי', 'ביטול ירי', 'קשר', 'הסתערות', 'כיתה'],
  minLength: 40,
}

// ── נוהל קרב ─────────────────────────────────────────────
export const COMBAT_PROCEDURE = {
  classification: 'סודי',
  exercise: 'תרגיל לוחמה בשטח פתוח — מחלקה ב׳',
  date: '05.05.2026',
  commander: 'סגן אברהם לוי',

  sections: {
    missionReceived: {
      id: 'missionReceived',
      title: 'קבלת פקודה',
      fields: [
        { id: 'mission_source',   label: 'מקור הפקודה',       value: 'פקודת גדוד 51 — אימון לוחמה בשטח פתוח' },
        { id: 'mission_time',     label: 'זמן קבלת הפקודה',   value: '03.05.2026 — 08:00' },
        { id: 'mission_location', label: 'מיקום קבלת הפקודה', value: 'מפקדת גדוד 51 — חדר מצב' },
        { id: 'mission_essence',  label: 'תמצית המשימה',       value: 'מחלקה ב׳ תתאמן בתרגיל כיבוש, ירי חי ונסיגה מסודרת בשטח 309ה' },
      ],
    },

    situationAssessment: {
      id: 'situationAssessment',
      title: 'הערכת מצב',
      fields: [
        { id: 'enemy',      label: 'אויב (מדומה)',       value: 'כוח מדומה — 8 לוחמים בעמדות מבוצרות ביעדים א׳ וב׳' },
        { id: 'terrain',    label: 'שטח',                value: 'שטח גלי פתוח, צמחייה נמוכה. שפת מצוק בגבול צפוני — מסוכן. בור מים 18מ׳ מציר ב׳.' },
        { id: 'ownForces',  label: 'כוחות עצמיים',       value: 'מחלקה ב׳: 3 כיתות × 9 לוחמים + מ"מ + סמל. סה"כ 30 לוחמים.' },
        { id: 'time',       label: 'זמן',                value: 'H=07:00. שלב ה׳ (ירי) — H+2:30. תום תרגיל — H+5:00.' },
        { id: 'conclusion', label: 'מסקנה',              value: 'כיבוש אפשרי. נת"ב עיקרי — בור מים. לשמור גזרות בבירור בין כיתות.' },
      ],
    },

    plan: {
      id: 'plan',
      title: 'גיבוש תוכנית',
      fields: [
        { id: 'plan_concept',   label: 'תפיסת הפעולה',    value: 'כיתה ב׳ מכסה מ-ע.י.ב. א׳ → כיתות א׳+ג׳ כובשות יעד א׳ → כיתה ג׳ מכסה → כיתות א׳+ב׳ כובשות יעד ב׳.' },
        { id: 'plan_main',      label: 'מאמץ עיקרי',      value: 'יעד ב׳ — הכיבוש הסופי. מאמץ משני: יעד א׳ (ביסוס למאמץ עיקרי).' },
        { id: 'plan_reserve',   label: 'כוח עתודה',       value: 'כיתה ג׳ לאחר ביסוס יעד א׳ — זמינה לחיזוק על יעד ב׳.' },
        { id: 'plan_alt',       label: 'תוכנית חלופית',   value: 'אם יעד א׳ לא מובטח בH+3 — עצירה, תחקיר ביניים, המשך בפקודה נוספת.' },
      ],
    },

    order: {
      id: 'order',
      title: 'פקודה',
      subsections: [
        {
          id: 'kapak1',
          label: 'כ"פ 1 — מצב',
          fields: [
            { id: 'enemy_detail',  label: 'א. אויב',     value: 'כוח מדומה בשתי עמדות. לא נושא נשק חי.' },
            { id: 'friendly',      label: 'ב. ידידותי',  value: 'גדוד 51 מחוץ לשטח. טייסת 124 זמינה לפינוי.' },
          ],
        },
        {
          id: 'kapak2',
          label: 'כ"פ 2 — משימה',
          fields: [
            { id: 'mission_full',  label: 'משימה',       value: 'מחלקה ב׳ תכבוש ותבסס יעדים א׳ וב׳ בשטח 309ה ביום 05.05.26 על מנת לתרגל לוחמה בשטח פתוח.' },
          ],
        },
        {
          id: 'execution',
          label: 'ביצוע',
          fields: [
            { id: 'phase1', label: 'שלב א׳ — כינוס',    value: 'H-4: ריכוז, בדיקת נשק, תדריך 14 סעיפים. כניסה מותרת רק אחרי אישור ק"ב.' },
            { id: 'phase2', label: 'שלב ב׳ — תנועה',    value: 'H-2: יציאה מנקודת מוצא. ציר ראשי — צפון-מזרח. מרחק 2.4 ק"מ.' },
            { id: 'phase3', label: 'שלב ג׳ — ביסוס',    value: 'H: ביסוס עמדות יציאה. כיתות מקבלות אישור ירי מ-מ"מ בלבד.' },
            { id: 'phase4', label: 'שלב ד׳ — כיסוי',    value: 'H+1: כיתה ב׳ ירי ברתק. כיתות א׳+ג׳ מתקדמות ליעד א׳.' },
            { id: 'phase5', label: 'שלב ה׳ — כיבוש',    value: 'H+2:30: ירי בתנועה + הסתערות. ביטול ירי בפקודת מ"מ בקשר בלבד.' },
            { id: 'phase6', label: 'שלב ו׳ — נסיגה',    value: 'H+4: ביסוס, תחקיר, נסיגה מסודרת. איסוף כלל הלוחמים ב-נ.כ.' },
          ],
        },
        {
          id: 'adminLogistics',
          label: 'מנה"ל ולוגיסטיקה',
          fields: [
            { id: 'ammo_log',   label: 'תחמושת',  value: '5.56 × 15 כ"ד לחייל. מקלע 200 כ"ד. חבלה לפי תוכנית. מגיע H-24.' },
            { id: 'medical_l',  label: 'רפואה',   value: 'חובש מחלקתי + ניידת. אט"ן בנ.ס. 11. חפ"ק רפואי מאוחז אחרי שלב ב׳.' },
            { id: 'water_l',    label: 'מים',     value: 'מינימום 3 ליטר לחייל. נקודת חלוקה ב-נ.כ. — חידוש כל שלב.' },
          ],
        },
        {
          id: 'commandControl',
          label: 'פיקוד ושליטה',
          fields: [
            { id: 'cmd_loc',   label: 'מיקום מ"מ',  value: 'מ"מ עם כיתה א׳ בשלב ד׳+ה׳. סמל עם כיתה ב׳.' },
            { id: 'callsign',  label: 'אות קריאה',  value: 'מ"מ: "נמר-7". כיתה א׳: "נמר-71". כיתה ב׳: "נמר-72". כיתה ג׳: "נמר-73".' },
            { id: 'freq',      label: 'תדר',         value: 'רשת מחלקה — 48.500 MHz. ערוץ חירום — 47.000 MHz.' },
          ],
        },
      ],
    },

    preparations: {
      id: 'preparations',
      title: 'הכנות',
      fields: [
        { id: 'prep_h72',  label: 'H-72',  value: 'תיאום שטח (רטג). קבלת אישור בטיחות. הזמנת תחמושת.' },
        { id: 'prep_h48',  label: 'H-48',  value: 'תחקיר מבנה חירבה. הכנת ציוד קשר. תרגיל חדל ובטיחות.' },
        { id: 'prep_h24',  label: 'H-24',  value: 'קבלת תחמושת. בדיקת כלל הציוד. תדריך סמלים ומ"כים.' },
        { id: 'prep_h4',   label: 'H-4',   value: 'ריכוז הכוח. בדיקת נשק ותחמושת. תדריך מ"מ 14 סעיפים.' },
        { id: 'prep_h1',   label: 'H-1',   value: 'כניסה לשטח רק אחרי אישור ק"ב. כיתות לעמדות יציאה.' },
      ],
    },
  },
}

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

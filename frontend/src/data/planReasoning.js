// Score breakdown per plan — powers the wall's "SADAN thinking" moment (W3)
// and SADAN's "why 92?" answers. Weights and texts pending Raz validation.
// Weighted sum: fit 40% + safety 30% + resources 20% + history 10% = total score.

export const CRITERIA = [
  { id: 'fit',       label: 'התאמה למטרות האימון', weight: 0.4 },
  { id: 'safety',    label: 'בטיחות',              weight: 0.3 },
  { id: 'resources', label: 'זמינות שטח ומשאבים',  weight: 0.2 },
  { id: 'history',   label: 'היסטוריית תרגילים',   weight: 0.1 },
]

export const PLAN_REASONING = {
  plan_1: {
    scores: { fit: 95, safety: 88, resources: 94, history: 90 },
    headline: 'מנצל את ארכיטקטורת השטח — רכס שולט מדרום',
    reasons: [
      'עונה על כל שלוש מטרות האימון: כיבוש בטונדות, תיאום חפ"ק-פלוגה, ניהול אמל"ח',
      'סיכון דו"צ מנוהל — הסטת אש מתוכננת בין הגלים',
      'שטח 309ה פנוי בתאריך המבוקש, ציר דרומי מוכן',
      'מבוסס תיק מדף מאומת — נתוני עבר זמינים',
    ],
  },
  plan_2: {
    scores: { fit: 65, safety: 92, resources: 75, history: 55 },
    headline: 'פשוט ובטוח — אבל ערך אימוני מוגבל',
    reasons: [
      'ללא חבלה וללא פיצול כוחות — סיכון נמוך',
      'אין תרגול תמרון ואיגוף — פחות ערך למטרות האימון',
      'דורש רצועת זמן כפולה לחזרות על בסיסי הכיבוש',
    ],
  },
  plan_3: {
    scores: { fit: 90, safety: 65, resources: 90, history: 75 },
    headline: 'ערך אימוני גבוה — בסיכון בטיחותי גבוה',
    reasons: [
      'ניווט לילה 8 ק"מ + חבלה מבוקרת — תרגול יכולות מתקדמות',
      'חבלה בתנאי לילה מחייבת אישור בטיחות נוסף וקצין הנדסה',
      'מתאים לכוח בכשירות גבוהה בלבד',
    ],
  },
}

// weighted total, rounded — should match PLANS[i].score
export function computeScore(planId) {
  const r = PLAN_REASONING[planId]
  if (!r) return null
  return Math.round(CRITERIA.reduce((sum, c) => sum + r.scores[c.id] * c.weight, 0))
}

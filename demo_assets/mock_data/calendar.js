/**
 * זמינות שטחי אש — לוח הזמנות
 * נתונים סינתטיים לדמו
 */
export const fieldBookings = {
  "309h": [
    { date: "2026-04-28", unit: "גדוד 52",  type: "מחלקה רטוב",   time: "06:00–18:00" },
    { date: "2026-04-29", unit: "גדוד 52",  type: "מחלקה רטוב",   time: "06:00–14:00" },
    { date: "2026-05-08", unit: "גדוד 53",  type: "כיתה יבש",     time: "08:00–16:00" },
  ],
  "131a": [
    { date: "2026-04-27", unit: "גדוד 14",  type: "גדוד יבש",     time: "06:00–22:00" },
    { date: "2026-05-03", unit: "גדוד 61",  type: "מחלקה רטוב",   time: "08:00–20:00" },
  ],
  "131b": [
    { date: "2026-05-01", unit: "גדוד 54",  type: "מחלקה יבש",    time: "08:00–16:00" },
    { date: "2026-05-04", unit: "גדוד 54",  type: "כיתה יבש",     time: "08:00–14:00" },
  ],
  "120m": [
    { date: "2026-04-26", unit: "גדוד 53",  type: "גדוד רטוב",    time: "06:00–23:00" },
    { date: "2026-04-27", unit: "גדוד 53",  type: "גדוד רטוב",    time: "06:00–23:00" },
    { date: "2026-04-28", unit: "גדוד 53",  type: "גדוד רטוב",    time: "06:00–18:00" },
    { date: "2026-05-01", unit: "גדוד 11",  type: "מחלקה רטוב",   time: "07:00–19:00" },
    { date: "2026-05-02", unit: "גדוד 11",  type: "מחלקה רטוב",   time: "07:00–15:00" },
  ],
  "122a": [
    { date: "2026-05-05", unit: "גדוד 55",  type: "כיתה ש\"ב",    time: "06:00–14:00" },
  ],
}

// שדות לתצוגה
export const calendarFields = [
  { id: "309h",  name: "309ה",    region: "מרכז-דרום", recommended: true  },
  { id: "131a",  name: "131 א׳",  region: "צפון-מרכז", recommended: false },
  { id: "131b",  name: "131 ב׳",  region: "צפון-מרכז", recommended: false },
  { id: "120m",  name: "120 מ׳",  region: "מרכז",      recommended: false },
  { id: "122a",  name: "122 א׳",  region: "דרום",       recommended: false },
]

// ייצור 14 ימים מהיום
export function generate14Days(startDate = new Date('2026-04-25')) {
  const days = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    days.push({
      date: d.toISOString().slice(0, 10),
      dayNum: d.getDate(),
      dayName: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'][d.getDay()],
      isWeekend: d.getDay() === 5 || d.getDay() === 6,
    })
  }
  return days
}

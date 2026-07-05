import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, ChevronLeft, Volume2, Send, Loader } from 'lucide-react'
import { sendWhatsAppMedia, sendWhatsApp } from '../../api/whatsapp'
import { CONTACTS, buildSisoAirforceMessage } from '../../data/contacts'

// Relative to current origin — works identically on localhost (desktop dev)
// and through the Cloudflare tunnel (phone), both proxied by Vite (vite.config.js).
const API_REST = '/api/voice'
const WS_URL   = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/gemini-voice/ws'
const NUM_BARS = 12

// ── helpers ───────────────────────────────────────────────────────────────────
function simDispatch(event, detail = {}) {
  window.dispatchEvent(new CustomEvent(event, { detail }))
}

// ── פקודות SADAN — טקטיקה + שליטה בסימולציה ─────────────────────────────────
//
// כל פקודה: { re, handler }
// handler(text) → { handled:true, reply:string }
//
const SADAN_COMMANDS = [

  // ── ווצאפ לסיסו ────────────────────────────────────────────────────────────
  {
    re: /תתקשר לסיסו|שלח לסיסו|שת.?פ חיל.?האוויר|אשר מסוקים|confirm.?heli|call.?siso/i,
    handler: async () => {
      const msg = buildSisoAirforceMessage()
      try { await sendWhatsApp(msg, CONTACTS.siso.wa) } catch (_) {}
      return {
        handled: true,
        reply: `✅ נשלחה הודעה לסיסו (${CONTACTS.siso.phone}) בוואטסאפ.\n\nבקשת אישור שת"פ עם חיל האוויר — מסוק פינוי רפואי לתרגיל 309ה, 05.05.2026.\n\nממתין לתגובה...`,
      }
    },
  },

  // ── תלת מימד ───────────────────────────────────────────────────────────────
  {
    re: /תלת.?מימד|3d|הראה.*(תלת|עומק)|תצוגת.?תלת|הפעל.*(3d|תלת)/i,
    handler: () => {
      simDispatch('sadan:toggle3d')
      return {
        handled: true,
        reply: `🗺️ עוברת לתצוגת תלת-מימד.\n\nבתצוגה זו ניתן לראות את העומק הטופוגרפי של שטח 309ה — כיפות הבטון, הצלעות, והרמות השולטות.\n\nהכוח המחפה יוצב על הכיפה השולטת לפי עיקרון "שליטה — ירי — מחסה".`,
      }
    },
  },

  // ── מקרא המפה ──────────────────────────────────────────────────────────────
  {
    re: /מקרא|הסבר.?סימונים|מה.?הסימונים|legend/i,
    handler: () => {
      simDispatch('sadan:toggle_legend')
      return { handled: true, reply: '🗺️ מציגה/מסתירה את מקרא הסימונים על המפה.' }
    },
  },

  // ── כוח מחפה / כוח הרתק ────────────────────────────────────────────────────
  {
    re: /כוח.?מחפה|כוח.?מכסה|כיתה.?ב|נמר.?72|רתק|כוח.?תמיכה|sbf/i,
    handler: () => {
      simDispatch('sadan:toggle3d') // ensure 3D
      simDispatch('sadan:sim_focus_unit', { unit_id: 'kitaB' })
      return {
        handled: true,
        reply: `🔭 מתמקדת בכוח המחפה — כיתה ב׳, נמר-72 (רב"ט משה דוד).\n\n📍 עמדת ירי ברתק א׳ (ע.י.ב. א׳):\n• קואורדינטות: 35.228°E / 31.820°N\n• כיפה שולטת מימין לציר — שליטה מלאה על קו הגישה ליעד א׳\n• אזימוט ירי: 010°\n• גבולות ירי: 355°–025°\n\n⚠️ מחסנית בטיחות: כאשר דגל כיתת התק (נמר-71) נכנס לטווח 200 מ׳ מאזור ההשפעה — "נמר-72 חדל" בקשר. ביטול ירי מיידי.`,
      }
    },
  },

  // ── כוח מסתער ──────────────────────────────────────────────────────────────
  {
    re: /כוח.?מסתער|כוח.?תוקף|כיתה.?א|נמר.?71|הסתערות.?ראשית/i,
    handler: () => {
      simDispatch('sadan:sim_focus_unit', { unit_id: 'kitaA' })
      return {
        handled: true,
        reply: `⚔️ כיתה א׳ — נמר-71 (רב"ט ירדן כהן) — כוח ההסתערות הראשי.\n\n🏃 מסלול ההסתערות על יעד א׳:\n• נקודת פתיחת ירי: [35.221°E / 31.830°N]\n• יעד — בטונדה מערבית: [35.225°E / 31.836°N]\n• מרחק הסתערות: ~750 מ׳\n• זמן הסתערות משוער: 8–12 דקות (בציר מוגן)\n\n🔫 ירי בתנועה: כיתה א׳ מבצעת ירי מהמותן לאורך כל ההסתערות.\n\n⏱️ H+2:30 — רגע פתיחת ההסתערות.`,
      }
    },
  },

  // ── כיתה ג / כוח הסתערות שני ──────────────────────────────────────────────
  {
    re: /כיתה.?ג|נמר.?73|הסתערות.?שני|כוח.?ג/i,
    handler: () => {
      simDispatch('sadan:sim_focus_unit', { unit_id: 'kitaG' })
      return {
        handled: true,
        reply: `🔀 כיתה ג׳ — נמר-73 (רב"ט דניאל לוי) — כוח גמיש: הסתערות + כיסוי.\n\n📋 תפקיד דואלי:\n• שלבים 3–4: מסתערת יחד עם כיתה א׳ על יעד א׳\n• שלב 5: עוברת לע.י.ב. ב׳ (35.245°E) — כיסוי יעד ב׳\n• שלב 6: כיסוי בזמן כיתות א׳+ב׳ מסתערות על יעד ב׳\n\n📍 ע.י.ב. ב׳: אזימוט 015°, גבולות 000°–030°`,
      }
    },
  },

  // ── מ"מ ────────────────────────────────────────────────────────────────────
  {
    re: /מ.?מ|מפקד.?מחלקה|נמר.?7[^0-9]|אברהם.?לוי/i,
    handler: () => {
      simDispatch('sadan:sim_focus_unit', { unit_id: 'mm' })
      return {
        handled: true,
        reply: `⭐ מ"מ — נמר-7 (סגן אברהם לוי) — מפקד המחלקה.\n\n📡 תפקיד בתרגיל:\n• שולט בכל הכוחות מנקודת ח.ש. (חוד שליטה)\n• אחראי על פקודת "נמר-72 חדל" — ביטול הרתק\n• תיאום עם קצין בטיחות לאורך כל שלבי הירי\n• אישור כניסה לכל שלב בירי חי\n\n🔑 הפקודות הקריטיות שלו:\n• "נמר-72 חדל" — עצור ירי ברתק\n• "נמר-71 קדימה" — הסתערות\n• "נ-7 ביטחון" — עצור הכל`,
      }
    },
  },

  // ── מחסנית בטיחות ──────────────────────────────────────────────────────────
  {
    re: /מחסנית.?בטיח|בטיחות.?ירי|דוצ|כניסה.?לטווח|safety.?dist|cease.?fire/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 4 }) // phase 4 = הסתערות — המקום הקריטי
      return {
        handled: true,
        reply: `⚠️ מחסנית בטיחות — עיקרון ורציה (VRAE)\n\n📏 ההגדרה:\nהמרחק המינימלי שבין כיתת ההסתערות המתקדמת לבין אזור נפילת הכדורים של כוח הרתק, שמתחתיו חייבים לחדול ירי.\n\n🛑 בתרגיל זה:\n• מחסנית בטיחות: 200 מ׳\n• כאשר נמר-71 מגיע ל-200 מ׳ מיעד א׳ — המ"מ מבטל "נמר-72 חדל"\n• דגלן כיתת התק נושא דגל אדום — נראה לכוח הרתק\n\n🔴 עברתי לשלב ה׳ — ניתן לראות את המרחק הקריטי בין נמר-71 לנמר-72 בזמן ההסתערות.`,
      }
    },
  },

  // ── מרחק הסתערות ───────────────────────────────────────────────────────────
  {
    re: /מרחק.?הסתערות|כמה.?מ.?(הסתערות|קדמה)|כמה.?רחוק|distance/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 3 })
      return {
        handled: true,
        reply: `📐 מרחק ההסתערות — יעד א׳ (בטונדה מערבית):\n\n• נקודת מוצא להסתערות (נ.ד. 3): [35.221°E / 31.830°N]\n• יעד א׳: [35.225°E / 31.836°N]\n• מרחק ישיר: ~750 מ׳\n• מסלול בשטח (תוך כדי מחסה): ~900–950 מ׳\n\n📐 מרחק הסתערות — יעד ב׳ (מטרה עיקרית):\n• נ.ד. 4: [35.228°E / 31.837°N]\n• יעד ב׳: [35.241°E / 31.842°N]\n• מרחק: ~1,150 מ׳\n\n⏱️ קצב התקדמות בתרגיל חי: ~80 מ׳/דקה → הסתערות א׳ ≈ 10 דקות.`,
      }
    },
  },

  // ── הסתערות — עבור לשלב 4 ──────────────────────────────────────────────────
  {
    re: /הסתערות|מתי.*הסתערות|הצג.*הסתערות|עבור.*הסתערות|^הסתע/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 4 })
      simDispatch('sadan:sim_focus_unit', { unit_id: 'kitaA' })
      return {
        handled: true,
        reply: `⚔️ שלב ה׳ — הסתערות על יעד א׳ (H+2:30)\n\n🔴 כיתות א׳ וג׳ מסתערות על בטונדה מערבית בירי מהמותן.\n🔵 כיתה ב׳ ממשיכה ירי ברתק מע.י.ב. א׳ עד לפקודה.\n\n📋 סדר הפעולות:\n1. מ"מ מוודא כוחות מוכנים בקשר\n2. "נמר-71 קדימה" — כיתה א׳ פותחת בריצה\n3. ירי מהמותן לאורך כל ההסתערות\n4. דגלן מרחק 200 מ׳ → מ"מ: "נמר-72 חדל"\n5. כניסה ליעד, ניקוי, "יעד א׳ בידינו"`,
      }
    },
  },

  // ── ניווט שלבים: כינוס / תנועה / ביסוס / כיסוי / מעבר / נסיגה ────────────
  {
    re: /שלב.?כינוס|כינוס|h.?4|התארגנות.?ראשונית/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 0 })
      return { handled: true, reply: `📋 שלב א׳ — כינוס (H-4)\n\nהמחלקה מתכנסת. תדריך 14 סעיפים, בדיקת נשק, חלוקת תחמושת. קצין בטיחות מאשר יציאה.` }
    },
  },
  {
    re: /שלב.?תנועה|תנועה|h.?2|יוצאים/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 1 })
      return { handled: true, reply: `🚶 שלב ב׳ — תנועה (H-2)\n\nהכוח יוצא לאורך ציר נמר. 2.4 ק"מ. נ.ד. 1 — תחנה דרומית.` }
    },
  },
  {
    re: /שלב.?ביסוס|ביסוס|h[^+\-]|התפרסות/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 2 })
      return { handled: true, reply: `🗺️ שלב ג׳ — ביסוס (H)\n\nכיתה ב׳ מתפצלת לע.י.ב. א׳. כיתות א׳+ג׳ ממשיכות צפונה. תדר: 46.500 MHz.` }
    },
  },
  {
    re: /שלב.?כיסוי|ירי.?ברתק|רתק|h\+1/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 3 })
      simDispatch('sadan:sim_focus_unit', { unit_id: 'kitaB' })
      return { handled: true, reply: `🔥 שלב ד׳ — כיסוי (H+1)\n\nכיתה ב׳ פותחת ירי ברתק. אזימוט 010°, גבולות 355°–025°. כיתות א׳+ג׳ מתקדמות ליעד א׳.` }
    },
  },
  {
    re: /שלב.?מעבר|מעבר|h\+3[^:]/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 5 })
      return { handled: true, reply: `🔀 שלב ה׳ המשך — מעבר (H+3)\n\nביסוס יעד א׳. כיתה ג׳ עוברת לע.י.ב. ב׳. כיתות א׳+ב׳ מתארגנות ליעד ב׳.` }
    },
  },
  {
    re: /יעד.?א|בטונדה.?מערבית/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 4 })
      return { handled: true, reply: `🏁 שלב ה׳ — הסתערות יעד א׳ (H+2:30)\n\nבטונדה מערבית. כיתות א׳+ג׳ מסתערות. ביטול ירי בפקודת מ"מ.` }
    },
  },
  {
    re: /יעד.?ב|בטונדה.?מרכזית|מטרה.?עיקרית/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 6 })
      return { handled: true, reply: `🏆 שלב ה׳ סיום — כיבוש יעד ב׳ (H+3:30)\n\nבטונדה מרכזית — המטרה העיקרית. כיתות א׳+ב׳ מסתערות. כיתה ג׳ מכסה מע.י.ב. ב׳.` }
    },
  },
  {
    re: /שלב.?נסיגה|נסיגה|חזרה|ביסוס.?סיום/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 7 })
      return { handled: true, reply: `🔙 שלב ו׳ — נסיגה (H+4)\n\nתחקיר ביניים. נסיגה הפוכה לסדר הכניסה. הכוח מתכנס בנ.כ.` }
    },
  },

  // ── עמדת ירי ברתק / SBF position ──────────────────────────────────────────
  {
    re: /עמדת.?ירי|ע.?י.?ב|sbf.?position|כיפה.?שולטת|עמדת.?רתק/i,
    handler: () => {
      simDispatch('sadan:sim_set_phase', { phase: 3 })
      simDispatch('sadan:sim_focus_unit', { unit_id: 'kitaB' })
      return {
        handled: true,
        reply: `📍 עמדת ירי ברתק — עיקרון ההצבה:\n\n🔑 כלל הבסיס: "ממוקצי כוח מחפה — רתק על כיפה שולטת."\n\n✅ ע.י.ב. א׳ — כיתה ב׳:\n• כיפה שולטת מימין לציר ההתקדמות\n• גובה יתרון: ~15 מ׳ מעל קו ההסתערות\n• שדה ירי נקי על יעד א׳ ויעד ב׳\n• מרחק מהמסתעריםG: 820–1,050 מ׳ (מחוץ לטווח מחסנית בטיחות)\n\n⚠️ עיקרון DoCF:\nהמחפה לא נמצא בקו ירי שמסכן את המסתעריםG. אזימוט ירי 010° — המסתעריםG מתקדמים מדרום (355°–010° = זוית בטוחה בשל גיאוגרפיה).`,
      }
    },
  },

  // ── כלל הסימולציה / הנחה ───────────────────────────────────────────────────
  {
    re: /נהל.?סימולציה|שלוט.?בסימולציה|הנחה.?אותי|תנרטב|תסביר.?סימולציה|הסבר.?תרגיל/i,
    handler: () => {
      simDispatch('sadan:toggle3d')
      simDispatch('sadan:sim_set_phase', { phase: 0 })
      return {
        handled: true,
        reply: `🎬 מתחילה ניהול סימולציה — תרגיל מחלקה ב׳, שטח 309ה.\n\nהפעלתי תצוגת תלת-מימד ועברתי לשלב א׳ — כינוס.\n\n📋 מבנה הכוח:\n• נמר-7: מ"מ (מפקד)\n• נמר-71: כיתה א׳ — הסתערות ראשית\n• נמר-72: כיתה ב׳ — ירי ברתק (כיסוי)\n• נמר-73: כיתה ג׳ — הסתערות + כיסוי\n\n💬 תוכל לשאול אותי:\n• "תתמקד על הכוח המחפה"\n• "מרחק ההסתערות"\n• "הסבר מחסנית בטיחות"\n• "עבור לשלב הסתערות"\n• "הצג 3D"\n\nאני שולטת בסימולציה בזמן אמת. 👇`,
      }
    },
  },

  // ── מילוי שדות שאלון ─────────────────────────────────────────────────────

  // כשירות א
  {
    re: /כשיר[ות]?\s*(?:דרג[הת]?)?\s*א(?:לף)?(?:\s|$)|מדרג[הת]\s*א(?:\s|$)|רמ[הת]\s*א(?:\s|$)|first.*ready|readiness.*a/i,
    handler: () => {
      simDispatch('fillField', { field_id: 'readiness', value: 'aleph' })
      return { handled: true, reply: '✅ רמת כשירות **א׳** נבחרה בשאלון.\n\nכשיר לחלוטין — כל מסלולי האש פתוחים.' }
    },
  },
  // כשירות ב
  {
    re: /כשיר[ות]?\s*(?:דרג[הת]?)?\s*ב(?:ית)?(?:\s|$)|מדרג[הת]\s*ב(?:\s|$)|רמ[הת]\s*ב(?:\s|$)/i,
    handler: () => {
      simDispatch('fillField', { field_id: 'readiness', value: 'bet' })
      return { handled: true, reply: '✅ רמת כשירות **ב׳** נבחרה בשאלון.\n\n⚠️ נדרש קצין מאשר מדרגת סא"ל ומעלה.' }
    },
  },
  // כשירות ג
  {
    re: /כשיר[ות]?\s*(?:דרג[הת]?)?\s*ג(?:ימל)?(?:\s|$)|מדרג[הת]\s*ג(?:\s|$)|רמ[הת]\s*ג(?:\s|$)/i,
    handler: () => {
      simDispatch('fillField', { field_id: 'readiness', value: 'gimel' })
      return { handled: true, reply: '⚠️ כשירות ג׳ — כשירות חלקית.\n\n🚫 אסור לתרגל ירי חי. יש לשדרג לפני תרגיל.' }
    },
  },
  // כשירות ד
  {
    re: /כשיר[ות]?\s*(?:דרג[הת]?)?\s*ד(?:לת)?(?:\s|$)|מדרג[הת]\s*ד(?:\s|$)|רמ[הת]\s*ד(?:\s|$)/i,
    handler: () => {
      simDispatch('fillField', { field_id: 'readiness', value: 'dalet' })
      return { handled: true, reply: '🚫 כשירות ד׳ — לא כשיר.\n\nיש לשדרג לפני כל פעילות אש.' }
    },
  },
  // שיטה / נושא — מחלץ את הטקסט אחרי מילת המפתח
  {
    re: /(?:שיט[הת]|הנושא|הנוש)\s*(?:שלי\s*)?(?:היא|הוא|:)?\s+(.{4,})/i,
    handler: (text) => {
      const m = text.match(/(?:שיט[הת]|הנושא|הנוש)\s*(?:שלי\s*)?(?:היא|הוא|:)?\s+(.{4,})/i)
      const value = m?.[1]?.trim()
      if (!value) return { handled: false }
      simDispatch('fillField', { field_id: 'topic', value })
      return { handled: true, reply: `✅ שיטה עודכנה בשאלון:\n\n"${value}"` }
    },
  },

  // ── תשובות לבוחן ─────────────────────────────────────────────────────────
  // "שאלה 3 תשובה ב" / "שאלה 3 — ב" / "בשאלה 5 בחרתי ג"
  {
    re: /שאל[הת]?\s*(\d)\s*[—\-,\s]*(?:תשוב[הת]|בחרתי|בוחר|ענה)?\s*([אבגד1-4](?:\s|$))/i,
    handler: (text) => {
      const m = text.match(/שאל[הת]?\s*(\d)[—\-,\s]*(?:תשוב[הת]|בחרתי|בוחר|ענה)?\s*([אבגד1-4])/i)
      const qId = parseInt(m?.[1])
      const ans = m?.[2]?.trim()
      if (!qId || qId < 1 || qId > 8 || !ans) return { handled: false }
      const ansMap = { 'א': 0, '1': 0, 'ב': 1, '2': 1, 'ג': 2, '3': 2, 'ד': 3, '4': 3 }
      const ansIdx = ansMap[ans]
      if (ansIdx === undefined) return { handled: false }
      simDispatch('fillField', { field_id: 'answer', question_id: qId, answer_idx: ansIdx })
      return { handled: true, reply: `✅ שאלה ${qId} — אפשרות ${'אבגד'[ansIdx]} נבחרה.\nתוכל לראות אותה מסומנת בבוחן.` }
    },
  },

  // ── גודל סימונים ─────────────────────────────────────────────────────────
  {
    re: /הקטן.*(סימון|סמל|מרקר|כוח)|סימונ.*קטנ|קטן.*סימון|smaller.*(marker|unit)/i,
    handler: () => {
      simDispatch('sadan:marker_scale', { delta: -0.25 })
      return { handled: true, reply: '🔽 הקטנתי את סימוני הכוחות — תוואי השטח גלוי יותר עכשיו.' }
    },
  },
  {
    re: /הגדל.*(סימון|סמל|מרקר|כוח)|סימונ.*גדול|גדול.*סימון|larger.*(marker|unit)/i,
    handler: () => {
      simDispatch('sadan:marker_scale', { delta: +0.25 })
      return { handled: true, reply: '🔼 הגדלתי את סימוני הכוחות.' }
    },
  },
  {
    re: /סימונ.*רגיל|אפס.*(סימון|גודל)|גודל.*(רגיל|ברירת.?מחדל)|reset.*marker/i,
    handler: () => {
      simDispatch('sadan:marker_scale', { scale: 1.0 })
      return { handled: true, reply: '⚖️ החזרתי את סימוני הכוחות לגודל ברירת המחדל.' }
    },
  },

  // ── מסלול לשלב הבא ──────────────────────────────────────────────────────
  {
    re: /הבלט.*(מסלול|תנועה)|הצג.*(מסלול|מסל|קו.?תנועה)|מסלול.*(הבא|שלב|כוח)/i,
    handler: () => {
      simDispatch('sadan:toggle_route')
      return {
        handled: true,
        reply: `🗺️ מציגה קווי תנועה לשלב הבא — צבע כל קו לפי הכוח:\n• 🔵 כיתה א׳ (נמר-71)\n• 🔵 כיתה ב׳ (נמר-72)\n• 🔵 כיתה ג׳ (נמר-73)\n• 🟡 מ"מ (נמר-7)\n\nנקודה בסוף הקו = מיקום יעד בשלב הבא. לחץ שוב כדי להסתיר.`,
      }
    },
  },
  {
    re: /הסתר.*(מסלול|קו.?תנועה)|כבה.*(מסלול)/i,
    handler: () => {
      simDispatch('sadan:toggle_route')
      return { handled: true, reply: '✅ הסתרתי את קווי התנועה.' }
    },
  },

  // ── בימוי אויב / OPFOR ───────────────────────────────────────────────────
  {
    re: /הבלט.*(אויב|אוייב|opfor|בימוי)|הצג.*(אויב|opfor|בימוי)|איפה.*(אויב|בימוי|מטרה|יעד.*אויב)/i,
    handler: () => {
      simDispatch('sadan:toggle_opfor')
      return {
        handled: true,
        reply: `🎯 מבליטה עמדות בימוי האויב:\n\n• 👁 יעד א׳ — בטונדה מערבית [35.225°E / 31.839°N]\n• 👁 יעד ב׳ — בטונדה מרכזית [35.241°E / 31.845°N]\n• 🔭 תצפית צפון — חיישן שזוהה\n• ⚠️ מארב דרום — עמדת ירי\n\nמסמנים אדומים ✕ כבר מסומנים על המפה. OPFOR מחזיק עמדות עד להסתערות.`,
      }
    },
  },
  {
    re: /הסתר.*(אויב|opfor|בימוי)|כבה.*(אויב|opfor)/i,
    handler: () => {
      simDispatch('sadan:toggle_opfor')
      return { handled: true, reply: '✅ הסתרתי את סימוני הבימוי.' }
    },
  },

  // ── ניווט בין מסכים ─────────────────────────────────────────────────────
  {
    re: /עבור.*(כניסה|לוגין|התחבר)|חזור.*כניסה|מסך.?ראשי/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/' })
      return { handled: true, reply: '🏠 עוברת למסך הכניסה.' }
    },
  },
  {
    re: /עבור.*(בחירת.?שטח|בחר.?שטח)|מסך.?שטח(?!.*אש|.*309)/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/field-selection' })
      return { handled: true, reply: '📍 עוברת לבחירת שטח אש.' }
    },
  },
  {
    re: /עבור.*(מפה|שטח.309|area)|פתח.?מפה|הצג.?מפה(?!.*שאלון)/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/area' })
      return { handled: true, reply: '🗺️ עוברת למפת השטח — שטח אש 309ה.' }
    },
  },
  {
    re: /עבור.*(שאלון|הגדרת.?תרגיל)|פתח.?שאלון|מסך.?שאלון/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/questionnaire' })
      return { handled: true, reply: '📋 עוברת לשאלון הגדרת התרגיל.' }
    },
  },
  {
    re: /עבור.*(מתווים|תכניות|plans)|הצג.?מתווים|בחר.?מתווה(?!.*(א|ב|ג))/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/plans' })
      return { handled: true, reply: '🗂️ עוברת למסך המתווים — 3 הצעות לתרגיל.' }
    },
  },
  {
    re: /עבור.*(תיק.?תרגיל|exercise)|פתח.?תיק|מסך.?תיק/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/exercise' })
      return { handled: true, reply: '📁 עוברת לתיק התרגיל.' }
    },
  },
  {
    re: /עבור.*(בוחן|quiz)|פתח.?בוחן|מסך.?בוחן/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/quiz' })
      return { handled: true, reply: '📝 עוברת לבוחן הכנה לתרגיל.' }
    },
  },
  {
    re: /עבור.*(אישורים|approvals)|פתח.?אישורים|מסך.?אישורים/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/approvals' })
      return { handled: true, reply: '✅ עוברת למסך האישורים.' }
    },
  },
  {
    re: /עבור.*(סימולציה|simulation)|פתח.?סימולציה|מסך.?סימולציה/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/simulation' })
      return { handled: true, reply: '🎬 עוברת לסימולציה הטקטית.' }
    },
  },

  // ── פעולות בכל מסך ────────────────────────────────────────────────────────
  // כניסה עם קוד אישי
  {
    re: /(?:כנס|כניסה|כניסה.?עם|הזן.?קוד|היכנס).*(?:52365|מספר.?אישי|קוד)|^5236521$/i,
    handler: (text) => {
      const code = text.match(/\b5\d{6}\b/)?.[0] || '5236521'
      simDispatch('fillField', { field_id: 'login_id', value: code })
      return { handled: true, reply: `🔐 מכניסה קוד אישי ${code} ומתחברת למערכת...` }
    },
  },

  // יעד לבדיקה — מספר טלפון להתקשרות/וואטסאפ (מסך אישורים)
  {
    re: /(?:תתקשר|התקשר|שלח.?(וואטסאפ|וצאפ)|חייג).{0,12}(?:אל[יי]|למספר|במספר).{0,4}\d{7,}/i,
    handler: (text) => {
      const m = text.match(/(0\d{8,9}|972\d{8,9})/)
      if (!m) return { handled: false }
      const digits = m[1].startsWith('0') ? '972' + m[1].slice(1) : m[1]
      simDispatch('fillField', { field_id: 'target_phone', value: digits })
      return { handled: true, reply: `📞 עדכנתי את מספר היעד לבדיקה ל-+${digits}.` }
    },
  },

  // בחר שטח מוקצה
  {
    re: /בחר.?שטח.?מוקצה|שטח.?309|עבור.?לשטח.?(מוקצה|309)|המשך.?לשטח/i,
    handler: () => {
      simDispatch('sadan:action', { action: 'select_field' })
      return { handled: true, reply: '📍 בוחרת שטח מוקצה — שטח אש 309ה, גולן.' }
    },
  },

  // המשך / עבור למתווים (מהשאלון)
  {
    re: /המשך.?(לשלב|למתווים|לתוכניות|קדימה)|צור.?מתווים|עבור.?ל?מתווה/i,
    handler: () => {
      simDispatch('sadan:action', { action: 'proceed' })
      return { handled: true, reply: '▶️ ממשיכה לשלב המתווים — מייצרת 3 הצעות לתרגיל...' }
    },
  },

  // בחר מתווה א / ב / ג
  {
    re: /בחר.?מתווה\s*א(?:לף)?(?:\s|$)|מתווה\s*א(?:לף)?(?:\s|$)|תכנית\s*א(?:\s|$)|plan.?1(?:\s|$)/i,
    handler: () => {
      simDispatch('sadan:action', { action: 'select_plan', plan_id: 'plan_1' })
      return { handled: true, reply: '✅ בחרתי **מתווה א׳** — 9 יעדים, פיצול כיסוי ומאגף. ציון 89.\n\nממשיכה לבניית תיק התרגיל...' }
    },
  },
  {
    re: /בחר.?מתווה\s*ב(?:ית)?(?:\s|$)|מתווה\s*ב(?:ית)?(?:\s|$)|תכנית\s*ב(?:\s|$)|plan.?2(?:\s|$)/i,
    handler: () => {
      simDispatch('sadan:action', { action: 'select_plan', plan_id: 'plan_2' })
      return { handled: true, reply: '✅ בחרתי **מתווה ב׳** — 5 יעדים, כיבוש ישיר. ציון 76.\n\nממשיכה לבניית תיק התרגיל...' }
    },
  },
  {
    re: /בחר.?מתווה\s*ג(?:ימל)?(?:\s|$)|מתווה\s*ג(?:ימל)?(?:\s|$)|תכנית\s*ג(?:\s|$)|plan.?3(?:\s|$)/i,
    handler: () => {
      simDispatch('sadan:action', { action: 'select_plan', plan_id: 'plan_3' })
      return { handled: true, reply: '✅ בחרתי **מתווה ג׳** — ניווט לילה, 4 יעדים, ללא ירי חי. ציון 72.\n\nממשיכה לבניית תיק התרגיל...' }
    },
  },

  // הגש בוחן
  {
    re: /הגש.?בוחן|שלח.?בוחן|שלח.?תשובות|submit.?quiz/i,
    handler: () => {
      simDispatch('sadan:action', { action: 'submit_quiz' })
      return { handled: true, reply: '📤 מגישה את הבוחן לבדיקה...' }
    },
  },

  // עבור לאישורים (מהבוחן לאחר מעבר)
  {
    re: /עבור.?ל?אישורים|המשך.?ל?אישורים|go.?approvals/i,
    handler: () => {
      simDispatch('sadan:action', { action: 'go_approvals' })
      return { handled: true, reply: '✅ עוברת לסבב האישורים...' }
    },
  },

  // התקשר לגורם ספציפי — ניווט לאישורים + הודעה
  {
    re: /(?:תתקשר|התקשר|חייג|שיחה?|אישור.?טלפוני?).{0,12}(?:רטג|ר\.ט\.ג|שטחים|קרן|james)/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/approvals' })
      simDispatch('sadan:action',   { action: 'select_party', party_id: 'rtg' })
      return { handled: true, reply: '📞 עוברת לאישורים — בחרתי רטג (קרן ג׳ימס). לחץ "התקשר" להתחלת השיחה.' }
    },
  },
  {
    re: /(?:תתקשר|התקשר|חייג|שיחה?|אישור.?טלפוני?).{0,12}(?:בטיחות?|safety)/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/approvals' })
      simDispatch('sadan:action',   { action: 'select_party', party_id: 'safety' })
      return { handled: true, reply: '📞 עוברת לאישורים — בחרתי בטיחות. לחץ "התקשר".' }
    },
  },
  {
    re: /(?:תתקשר|התקשר|חייג|שיחה?|אישור.?טלפוני?).{0,12}(?:תחמוש?|ammo)/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/approvals' })
      simDispatch('sadan:action',   { action: 'select_party', party_id: 'ammo' })
      return { handled: true, reply: '📞 עוברת לאישורים — בחרתי תחמוש. לחץ "התקשר".' }
    },
  },
  // התקשר אלי / שיחת אישור כללי
  {
    re: /התקשר.?אל[יי]|תתקשר.?אל[יי]|call.?me|שיחת.?(אישור|טלפון)|תתקשר|חייג/i,
    handler: () => {
      simDispatch('sadan:navigate', { path: '/approvals' })
      return { handled: true, reply: '📞 עוברת למסך האישורים. בחר גורם ולחץ "התקשר".' }
    },
  },

  // ── PTT — הפעלה/כיבוי ─────────────────────────────────────────────────────
  {
    re: /עבר[יי].*(ptt|לחיצה|push.?to.?talk)|הפעל.*(ptt|לחיצה)|ptt.*הפעל|עבור.*ptt/i,
    handler: () => {
      simDispatch('sadan:ptt_mode', { enabled: true })
      return {
        handled: true,
        reply: '🎙️ מצב PTT מופעל.\n\nלחץ וחזור **רווח** כדי לדבר — שחרר כדי לשתוק.\n\nניתן לכבות עם "סדן כבי PTT".',
      }
    },
  },
  {
    re: /כב[יה].*(ptt|לחיצה|push.?to.?talk)|ptt.*כב[יה]|בטל.*ptt|vad|always.?on/i,
    handler: () => {
      simDispatch('sadan:ptt_mode', { enabled: false })
      return {
        handled: true,
        reply: '🎙️ מצב PTT כובה — חזרה למצב האזנה רציף (VAD).',
      }
    },
  },

  // ── ניווט טאבים בתיק תרגיל ─────────────────────────────────────────────────
  {
    re: /כלל[יי]|מידע.?כלל/i,
    handler: () => {
      simDispatch('sadan:open_tab', { tab_id: 'general' })
      return { handled: true, reply: '📋 פתחתי את טאב **כללי**.' }
    },
  },
  {
    re: /בטיח(ות)?(?!.{0,4}(ירי|שדה|קצין))|^בטיחות$/i,
    handler: () => {
      simDispatch('sadan:open_tab', { tab_id: 'safety' })
      return { handled: true, reply: '🛡️ פתחתי את טאב **בטיחות**.' }
    },
  },
  {
    re: /ירי.?ושטח|שטח.?ירי|(?:פתח|עבור.?ל|תראה).{0,6}ירי/i,
    handler: () => {
      simDispatch('sadan:open_tab', { tab_id: 'fire' })
      return { handled: true, reply: '🎯 פתחתי את טאב **ירי ושטחים**.' }
    },
  },
  {
    re: /נת.?ב(ים)?/i,
    handler: () => {
      simDispatch('sadan:open_tab', { tab_id: 'natbam' })
      return { handled: true, reply: '⚠️ פתחתי את טאב **נת"בים**.' }
    },
  },
  {
    re: /לוגיסטיק(ה|י)|אג.?מ.{0,6}טאב/i,
    handler: () => {
      simDispatch('sadan:open_tab', { tab_id: 'logistics' })
      return { handled: true, reply: '📦 פתחתי את טאב **לוגיסטיקה**.' }
    },
  },
  {
    re: /תדריך|תדרוך/i,
    handler: () => {
      simDispatch('sadan:open_tab', { tab_id: 'briefing' })
      return { handled: true, reply: '📢 פתחתי את טאב **תדריך**.' }
    },
  },
  {
    re: /שת.?פ.{0,6}(טאב|יחידות|פתח)|(?:פתח|עבור.?ל).{0,6}שת.?פ/i,
    handler: () => {
      simDispatch('sadan:open_tab', { tab_id: 'collab' })
      return { handled: true, reply: '🤝 פתחתי את טאב **שת"פ יחידות**.' }
    },
  },
  {
    re: /נוהל.?קרב|(?:פתח|עבור.?ל).{0,6}(קרב|נוהל)/i,
    handler: () => {
      simDispatch('sadan:open_tab', { tab_id: 'combat' })
      return { handled: true, reply: '⚔️ פתחתי את טאב **נוהל קרב**.' }
    },
  },
]

// ── dispatch + match ──────────────────────────────────────────────────────────
async function handleSadanCommand(text) {
  for (const cmd of SADAN_COMMANDS) {
    if (cmd.re.test(text)) {
      return await cmd.handler(text)
    }
  }
  return { handled: false }
}

// ── REST fallback for text input ─────────────────────────
async function apiChatText(text) {
  const res = await fetch(`${API_REST}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, with_audio: false }),
  })
  if (!res.ok) throw new Error(`chat error ${res.status}`)
  return res.json()   // { reply, source }
}

// ── Message bubble ────────────────────────────────────────
function ChatBubble({ msg }) {
  if (msg.role === 'system') {
    return (
      <div className="flex justify-center mb-3">
        <div className="px-3 py-1.5 bg-green-900/30 border border-green-500/30 rounded-full text-green-400 text-xs" dir="rtl">
          {msg.content}
        </div>
      </div>
    )
  }
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#c6953b] flex items-center justify-center text-xs font-bold text-black ml-2 flex-shrink-0 mt-0.5">
          ס
        </div>
      )}
      <div
        className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-[#1f2937] text-gray-200 rounded-tr-sm'
            : 'bg-[#c6953b]/15 border border-[#c6953b]/30 text-gray-100 rounded-tl-sm'
          }`}
        dir="rtl"
      >
        {msg.content}
      </div>
    </div>
  )
}

// ── Live waveform — reads real audio levels from AnalyserNode ─────────────────
function LiveWaveform({ analyserRef, active }) {
  const [bars, setBars] = useState(Array(NUM_BARS).fill(4))
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active) {
      setBars(Array(NUM_BARS).fill(4))
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    let dataArray = null

    function tick() {
      if (!analyserRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      if (!dataArray) {
        dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      }
      analyserRef.current.getByteFrequencyData(dataArray)
      const bucketSize = Math.floor(dataArray.length / NUM_BARS)
      const newBars = Array.from({ length: NUM_BARS }, (_, i) => {
        let sum = 0
        for (let j = i * bucketSize; j < (i + 1) * bucketSize; j++) sum += dataArray[j]
        return Math.max(4, Math.min(30, (sum / bucketSize) / 3.5))
      })
      setBars(newBars)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, analyserRef])

  return (
    <div className="flex items-end justify-center gap-0.5" style={{ height: '32px' }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}px`, transition: 'height 0.07s ease' }}
          className={`w-1 rounded-full ${active ? 'bg-[#c6953b]' : 'bg-gray-600 opacity-20'}`}
        />
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export default function SadanChat({ autoOpen = false, visible = true, currentScreen = '/' }) {
  const [open, setOpen]           = useState(autoOpen)
  const [messages, setMessages]   = useState([{
    id: 0,
    role: 'assistant',
    content: 'שלום. אני סדן — לחץ על המיקרופון לשיחה קולית, או כתוב שאלה.',
  }])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [connected, setConnected] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking]   = useState(false)
  const [error, setError]         = useState(null)
  const [pttMode, setPttMode]     = useState(false)   // PTT mode on/off
  const [pttActive, setPttActive] = useState(false)   // spacebar currently held

  // Audio refs
  const wsRef             = useRef(null)
  const micContextRef     = useRef(null)
  const playContextRef    = useRef(null)
  const processorRef      = useRef(null)
  const analyserRef       = useRef(null)   // mic analyser
  const playAnalyserRef   = useRef(null)   // playback analyser (Gemini audio)
  const micStreamRef      = useRef(null)
  const nextPlayTime      = useRef(0)
  const activeSources     = useRef([])
  const messagesEnd       = useRef(null)
  const liveTranscript    = useRef({ user: null, assistant: null })  // { id, accumulated } | null
  const speakingRef       = useRef(false)   // mirrors speaking state — readable from ScriptProcessor closure
  const speakingEndTimer  = useRef(null)    // timer to re-enable mic after Gemini finishes speaking
  const sendingRef        = useRef(false)   // synchronous in-flight guard — prevents race condition on double-send
  const pttModeRef        = useRef(false)   // mirrors pttMode — readable from onaudioprocess closure
  const pttActiveRef      = useRef(false)   // mirrors pttActive — readable from onaudioprocess closure
  // Auto-reconnect
  const wantConnected     = useRef(false)   // user intent: true = stay connected
  const reconnectTimer    = useRef(null)
  // Screen Wake Lock moved to App.jsx — keeps the screen awake for the whole app
  // session (not just while voice is connected), with a fallback for browsers that
  // don't support the Wake Lock API (older iOS Safari etc).

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])

  useEffect(() => {
    const handleOpen = (e) => {
      setOpen(true)
      const msg = e?.detail?.message
      if (!msg) return
      // שלח הודעה ישירות — אותה לוגיקה כמו sendText, בלי תלות ב-closure
      setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: msg }])
      setLoading(true)
      apiChatText(msg)
        .then(data => setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.reply }]))
        .catch(() => setMessages(prev => [...prev, { id: Date.now() + 1, role: 'system', content: 'שגיאה בתקשורת' }]))
        .finally(() => setLoading(false))
    }
    window.addEventListener('sadanOpen', handleOpen)
    return () => window.removeEventListener('sadanOpen', handleOpen)
  }, [])

  // sadanVoiceConnect — Login screen triggers this to start voice without opening the panel
  // Note: connectVoice is NOT in deps (it's defined later in the file, TDZ issue).
  // Safe because connectVoice's own deps include `connected`, so it always changes with it.
  const connectVoiceRef    = useRef(null)
  const disconnectVoiceRef = useRef(null)
  const connectedRef       = useRef(false)
  useEffect(() => { connectedRef.current = connected }, [connected])

  useEffect(() => {
    function onVoiceConnect() {
      if (!connectedRef.current) connectVoiceRef.current?.()
    }
    window.addEventListener('sadanVoiceConnect', onVoiceConnect)
    return () => window.removeEventListener('sadanVoiceConnect', onVoiceConnect)
  }, [])

  // Manual login (typing the code) while the WS is already open — tell the backend
  // immediately, otherwise Gemini stays in login mode and keeps asking to authenticate.
  useEffect(() => {
    function onAuthenticated() {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'auth_context', authenticated: true, manual: true }))
      }
    }
    window.addEventListener('sadan:authenticated', onAuthenticated)
    return () => window.removeEventListener('sadan:authenticated', onAuthenticated)
  }, [])

  // sadanVoiceToggle — VoiceStatusOrb dispatches this on click
  // Connects (+ opens panel) when idle, disconnects when active.
  useEffect(() => {
    function onVoiceToggle() {
      if (connectedRef.current) {
        disconnectVoiceRef.current?.()
      } else {
        setOpen(true)
        connectVoiceRef.current?.()
      }
    }
    window.addEventListener('sadanVoiceToggle', onVoiceToggle)
    return () => window.removeEventListener('sadanVoiceToggle', onVoiceToggle)
  }, [])

  // Broadcast voice state → VoiceStatusOrb listens to this
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sadan:voice_state', {
      detail: { connected, listening, speaking }
    }))
  }, [connected, listening, speaking])

  // PTT mode toggle — driven by sadan:ptt_mode event (dispatched by SADAN_COMMANDS)
  useEffect(() => {
    function onPttMode(e) {
      const enabled = !!e.detail?.enabled
      setPttMode(enabled)
      pttModeRef.current = enabled
      if (!enabled) {
        // leaving PTT — release active hold if any
        setPttActive(false)
        pttActiveRef.current = false
      }
    }
    window.addEventListener('sadan:ptt_mode', onPttMode)
    return () => window.removeEventListener('sadan:ptt_mode', onPttMode)
  }, [])

  // Spacebar hold → PTT active (only when connected + PTT mode on)
  useEffect(() => {
    if (!connected) return
    function onKeyDown(e) {
      if (e.code !== 'Space' || e.repeat) return
      if (!pttModeRef.current) return
      // Don't intercept space when typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      e.preventDefault()
      setPttActive(true)
      pttActiveRef.current = true
    }
    function onKeyUp(e) {
      if (e.code !== 'Space') return
      if (!pttModeRef.current) return
      setPttActive(false)
      pttActiveRef.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [connected])

  // Toggle body class → compresses .sadan-main-content into remaining space
  useEffect(() => {
    if (open) {
      const scale = (window.innerWidth - 350) / window.innerWidth
      document.documentElement.style.setProperty('--sadan-scale', scale)
    }
    document.body.classList.toggle('sadan-chat-open', open)
    return () => document.body.classList.remove('sadan-chat-open')
  }, [open])

  // cleanup on unmount
  useEffect(() => () => teardown(), [])

  function addMessage(role, content) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, content }])
  }

  // Transcript: accumulate partial chunks into a live bubble, finalize on turn_complete.
  // liveTranscript.current[role] = { id, accumulated } | null
  function handleTranscript(role, text, final) {
    // Verbal disconnect — user says "תנתק" / "אמשיך לבד" etc.
    // Gemini will respond with a goodbye naturally; we disconnect after ~4s to let it finish.
    if (role === 'user' && final) {
      if (/תנתק|ניתוק|אמשיך.{0,4}לבד|תודה.{0,8}(לא.{0,4}צריך|סיימנו|מספיק)|לא.{0,4}צריך.{0,8}עזרה/i.test(text)) {
        setTimeout(() => disconnectVoiceRef.current?.(), 4500)
      }
    }

    const live = liveTranscript.current[role]
    if (live) {
      // We have an open bubble — append only the NEW text.
      // On `final` we REPLACE with the clean accumulated text so Gemini's
      // habit of re-sending the full text in the final chunk doesn't double it.
      if (final) {
        // Use whichever is longer: accumulated so far, or the incoming final text
        const finalContent = text.length >= live.accumulated.length ? text : live.accumulated
        setMessages(prev => prev.map(m =>
          m.id === live.id ? { ...m, content: finalContent } : m
        ))
        liveTranscript.current[role] = null
      } else {
        const updated = live.accumulated + text
        setMessages(prev => prev.map(m =>
          m.id === live.id ? { ...m, content: updated } : m
        ))
        liveTranscript.current[role] = { id: live.id, accumulated: updated }
      }
    } else {
      // New bubble
      const id = Date.now() + Math.random()
      setMessages(prev => [...prev, { id, role, content: text }])
      if (!final) liveTranscript.current[role] = { id, accumulated: text }
      // If final immediately (e.g. user input_transcription), no tracking needed
    }
  }

  // Close any open live-transcript bubbles on turn end
  function closeLiveTranscripts() {
    liveTranscript.current.user = null
    liveTranscript.current.assistant = null
  }

  // ── PCM 24kHz scheduled playback ─────────────────────
  function schedulePCM(buffer) {
    if (!playContextRef.current || playContextRef.current.state === 'closed') {
      playContextRef.current = new AudioContext({ sampleRate: 24000 })
    }
    const ctx = playContextRef.current
    // Browser suspends AudioContext when no user gesture is recent — resume it.
    if (ctx.state === 'suspended') ctx.resume()
    const int16 = new Int16Array(buffer)
    if (int16.length === 0) return

    const f32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768.0

    const ab = ctx.createBuffer(1, f32.length, 24000)
    ab.getChannelData(0).set(f32)

    // Ensure playback analyser exists and is connected to this context
    if (!playAnalyserRef.current || playAnalyserRef.current.context !== ctx) {
      const a = ctx.createAnalyser()
      a.fftSize = 256
      a.connect(ctx.destination)
      playAnalyserRef.current = a
    }

    const src = ctx.createBufferSource()
    src.buffer = ab
    src.connect(playAnalyserRef.current)

    const now = ctx.currentTime
    const startAt = Math.max(now, nextPlayTime.current)
    src.start(startAt)
    nextPlayTime.current = startAt + ab.duration

    activeSources.current.push(src)
    setSpeaking(true)
    speakingRef.current = true
    // Cancel any pending "re-enable mic" timer — new audio chunk arrived
    clearTimeout(speakingEndTimer.current)
    src.onended = () => {
      activeSources.current = activeSources.current.filter(s => s !== src)
      if (activeSources.current.length === 0) {
        // ⚠️  DO NOT set speakingRef immediately — the physical speaker still has
        // ~200-500ms of audio buffered after Web Audio marks the buffer done.
        // If we re-enable the mic too early, it picks up the tail of SADAN's own
        // voice, Gemini transcribes it, and SADAN replies to itself (self-echo).
        // 1800ms: increased from 1200 — covers room reverberation + inter-chunk gaps.
        speakingEndTimer.current = setTimeout(() => {
          setSpeaking(false)
          speakingRef.current = false
        }, 1800)
      }
    }
  }

  function stopPlayback() {
    activeSources.current.forEach(s => { try { s.stop() } catch (_) {} })
    activeSources.current = []
    if (playContextRef.current) nextPlayTime.current = playContextRef.current.currentTime
    clearTimeout(speakingEndTimer.current)
    setSpeaking(false)
    speakingRef.current = false
  }

  // ── Connect / Disconnect ──────────────────────────────
  function teardown() {
    stopPlayback()
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null }
    if (micContextRef.current) { micContextRef.current.close(); micContextRef.current = null }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    analyserRef.current = null
    nextPlayTime.current = 0
  }

  const connectVoice = useCallback(async () => {
    if (connected) return
    wantConnected.current = true
    setError(null)
    try {
      // Pre-initialize playback AudioContext during the user gesture so the browser
      // starts it in 'running' state. If we wait until the first audio chunk arrives
      // (seconds later), the browser may have suspended it already.
      if (!playContextRef.current || playContextRef.current.state === 'closed') {
        playContextRef.current = new AudioContext({ sampleRate: 24000 })
      }
      if (playContextRef.current.state === 'suspended') {
        playContextRef.current.resume()
      }

      // Mic stream — echo cancellation prevents Gemini hearing its own audio output
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      micStreamRef.current = stream

      // AudioContext 16kHz for capture
      const micCtx = new AudioContext({ sampleRate: 16000 })
      micContextRef.current = micCtx
      const source = micCtx.createMediaStreamSource(stream)

      // Analyser for live waveform
      const analyser = micCtx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      // ScriptProcessor → raw PCM Int16 chunks → WebSocket
      const processor = micCtx.createScriptProcessor(4096, 1, 1)
      source.connect(processor)
      processor.connect(micCtx.destination)
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return
        // Don't send mic audio while Gemini is speaking — prevents echo self-triggering
        if (speakingRef.current) return
        // PTT gate: in PTT mode, only send while spacebar (or touch button) is held
        if (pttModeRef.current && !pttActiveRef.current) return
        const f32 = e.inputBuffer.getChannelData(0)
        const i16 = new Int16Array(f32.length)
        for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768))
        wsRef.current.send(i16.buffer)
      }
      processorRef.current = processor

      // WebSocket
      const ws = new WebSocket(WS_URL)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setListening(true)
        // Notify any screen listening for voice connection status (e.g. Login)
        window.dispatchEvent(new CustomEvent('sadan:voice_status', { detail: { status: 'connected' } }))

        // If already authenticated in this session, tell backend to skip auth flow
        if (sessionStorage.getItem('sadan_authenticated')) {
          const skipGreeting = sessionStorage.getItem('sadan_skip_greeting') === 'true'
          sessionStorage.removeItem('sadan_skip_greeting')  // one-time flag — consume immediately
          ws.send(JSON.stringify({ type: 'auth_context', authenticated: true, skip_greeting: skipGreeting }))
        }

      }

      ws.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) {
          schedulePCM(e.data)
        } else if (typeof e.data === 'string') {
          try {
            const msg = JSON.parse(e.data)
            if (msg.type === 'interrupted') {
              stopPlayback()
              closeLiveTranscripts()
              window.dispatchEvent(new CustomEvent('sadan:voice_status', { detail: { status: 'sadan_idle' } }))
            } else if (msg.type === 'turn_complete') {
              setTimeout(() => closeLiveTranscripts(), 250)
              window.dispatchEvent(new CustomEvent('sadan:voice_status', { detail: { status: 'sadan_idle' } }))
            } else if (msg.type === 'transcript') {
              handleTranscript(msg.role, msg.text, msg.final)
              // כשסדן מתחיל לדבר — עדכן Login ואחרים
              if (msg.role === 'assistant') {
                window.dispatchEvent(new CustomEvent('sadan:voice_status', { detail: { status: 'sadan_speaking' } }))
              }
            } else if (msg.type === 'whatsapp_sent') {
              setMessages(prev => [...prev, {
                id: Date.now() + Math.random(),
                role: 'system',
                content: `📱 וואטסאפ נשלח: "${msg.message}"`,
              }])
            } else if (msg.type === 'toggle_3d') {
              window.dispatchEvent(new CustomEvent('sadan:toggle3d'))
            } else if (msg.type === 'toggle_legend') {
              window.dispatchEvent(new CustomEvent('sadan:toggle_legend'))
            } else if (msg.type === 'toggle_layers_panel') {
              window.dispatchEvent(new CustomEvent('sadan:toggle_layers_panel'))
            } else if (msg.type === 'map_fly_to') {
              window.dispatchEvent(new CustomEvent('sadan:map_command', {
                detail: { action: 'fly_to', lng: msg.lng, lat: msg.lat, zoom: msg.zoom, bearing: msg.bearing, pitch: msg.pitch, duration_ms: msg.duration_ms }
              }))
            } else if (msg.type === 'map_zoom') {
              window.dispatchEvent(new CustomEvent('sadan:map_command', {
                detail: { action: 'zoom', delta: msg.delta }
              }))
            } else if (msg.type === 'map_rotate') {
              window.dispatchEvent(new CustomEvent('sadan:map_command', {
                detail: { action: 'rotate', bearing: msg.bearing, pitch: msg.pitch }
              }))
            } else if (msg.type === 'map_show_layer') {
              window.dispatchEvent(new CustomEvent('sadan:show_layer', {
                detail: { layer: msg.layer, visible: msg.visible }
              }))
            } else if (msg.type === 'app_navigate') {
              window.dispatchEvent(new CustomEvent('sadan:navigate', {
                detail: { path: msg.path }
              }))
            } else if (msg.type === 'fill_field') {
              window.dispatchEvent(new CustomEvent('fillField', {
                detail: { field_id: msg.field_id, value: msg.value, section: msg.section }
              }))
            } else if (msg.type === 'sim_pause') {
              window.dispatchEvent(new CustomEvent('sadan:sim_pause'))
            } else if (msg.type === 'sim_resume') {
              window.dispatchEvent(new CustomEvent('sadan:sim_resume'))
            } else if (msg.type === 'sim_goto_phase') {
              window.dispatchEvent(new CustomEvent('sadan:sim_goto_phase', {
                detail: { phase: msg.phase }
              }))
            } else if (msg.type === 'sim_show_unit') {
              window.dispatchEvent(new CustomEvent('sadan:sim_show_unit', {
                detail: { unit_id: msg.unit_id }
              }))
            }
          } catch (_) {}
        }
      }

      ws.onclose  = () => {
        setConnected(false); setListening(false); setSpeaking(false)
        window.dispatchEvent(new CustomEvent('sadan:voice_status', { detail: { status: 'disconnected' } }))
        // Auto-reconnect if user didn't manually disconnect
        if (wantConnected.current) {
          reconnectTimer.current = setTimeout(() => {
            if (wantConnected.current) connectVoice()
          }, 2000)
        }
      }
      ws.onerror  = () => { setError('שגיאת חיבור — בדוק שהשרת פועל'); setConnected(false); setListening(false) }

    } catch (e) {
      setError('אין גישה למיקרופון')
    }
  }, [connected])

  // Sync connectVoice ref (disconnectVoice ref synced below, after it's defined)
  connectVoiceRef.current = connectVoice

  // ── Screen sync — notify Gemini when user navigates ───────
  const screenSentRef = useRef('')
  useEffect(() => {
    if (!connected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    if (currentScreen === '/' || currentScreen === '/demo-check') return
    if (currentScreen === screenSentRef.current) return
    screenSentRef.current = currentScreen

    // Just logged in on the same WS session — skip first screen_change so Gemini
    // doesn't greet again. Consume the flag here (ws.onopen won't fire on same session).
    if (sessionStorage.getItem('sadan_skip_greeting') === 'true') {
      sessionStorage.removeItem('sadan_skip_greeting')
      return  // silent — Gemini already said goodbye on login screen
    }

    wsRef.current.send(JSON.stringify({ type: 'screen_change', screen: currentScreen }))
  }, [connected, currentScreen])

  // Reset screenSentRef on disconnect so reconnect re-sends the current screen
  useEffect(() => {
    if (!connected) screenSentRef.current = ''
  }, [connected])

  // ── Real-time audio level → Login waveform ────────────────
  // Dispatches sadan:audio_level {level:0-1} at ~30fps when connected.
  // Reads from both mic analyser (user speaking) and playback analyser (Gemini speaking).
  useEffect(() => {
    if (!connected) return
    const buf = new Uint8Array(128)
    let raf
    function tick() {
      let level = 0
      // Playback (Gemini)
      if (playAnalyserRef.current) {
        playAnalyserRef.current.getByteFrequencyData(buf)
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length
        level = Math.max(level, avg / 128)
      }
      // Mic (user)
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(buf)
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length
        level = Math.max(level, avg / 128)
      }
      window.dispatchEvent(new CustomEvent('sadan:audio_level', { detail: { level } }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [connected])

  const disconnectVoice = useCallback(() => {
    wantConnected.current = false          // cancel auto-reconnect intent
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null }
    teardown()
    setConnected(false)
    setListening(false)
  }, [])

  // Sync disconnectVoice ref here — after it's defined (avoids TDZ error)
  disconnectVoiceRef.current = disconnectVoice

  const toggleVoice = () => connected ? disconnectVoice() : connectVoice()

  // ── Text send ─────────────────────────────────────────
  // Guard: sendingRef (useRef) instead of `loading` state — prevents race condition
  // where two rapid calls both pass `if (loading) return` before React re-renders.
  const sendText = useCallback(async (text) => {
    if (!text.trim() || sendingRef.current) return
    sendingRef.current = true   // synchronous — blocks any parallel call immediately
    const trimmed = text.trim()
    setInput('')
    setError(null)
    addMessage('user', trimmed)
    setLoading(true)
    try {
      // בדוק קודם אם זו פקודה מוכרת (ללא AI round-trip)
      const cmd = await handleSadanCommand(trimmed)
      if (cmd.handled) {
        addMessage('assistant', cmd.reply)
        return
      }
      const data = await apiChatText(trimmed)
      addMessage('assistant', data.reply)
    } catch (e) {
      setError('שגיאה בתקשורת עם השרת')
    } finally {
      sendingRef.current = false
      setLoading(false)
    }
  }, [])  // empty deps — guard is now a ref, not state

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(input) }
  }

  // Status
  const statusLabel = speaking
    ? 'סדן מדבר...'
    : pttMode
      ? pttActive ? '🔴 מקליט...' : 'PTT — לחץ רווח לדבר'
      : listening ? 'מקשיב...' : 'לחץ מיקרופון'
  const statusDot = speaking
    ? 'bg-blue-400 animate-pulse'
    : pttMode
      ? pttActive ? 'bg-red-500 animate-pulse' : 'bg-yellow-400'
      : listening ? 'bg-green-400 animate-pulse' : 'bg-gray-500'

  // When on a hidden path (login / field-selection / quiz) render nothing visually.
  // The component stays mounted → all hooks/refs/WS stay alive → context preserved.
  // Exception: if open=true (triggered via sadanOpen event) — always render.
  if (!visible && !open) return null

  return (
    <>
      {/* ── כפתור פתיחה — 💬 קטן, שקט, פינה שמאל תחתון ──── */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 left-6 z-40 w-10 h-10 rounded-full flex items-center justify-center
                   bg-[#111827] border border-[#c6953b]/30 text-[#c6953b]
                   hover:bg-[#c6953b]/15 hover:border-[#c6953b]/60 hover:scale-110
                   shadow-lg transition-all
                   ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ transition: 'opacity 0.2s ease, transform 0.15s ease' }}
        title="שיחה / transcript"
      >
        <MessageSquare size={16} />
      </button>

      {/* ── פאנל צ'אט — תמיד ב-DOM, מחליק פנימה/החוצה ──── */}
      <div
        className={`sadan-panel fixed bottom-0 left-0 top-0 z-50 flex flex-col w-full md:w-[350px] ${open ? 'open' : ''}`}
        dir="rtl"
      >
          <div
            className="absolute inset-0 bg-[#0c1117]/95 border-r border-[#c6953b]/20 shadow-2xl"
            style={{ backdropFilter: 'blur(4px)' }}
          />

          <div className="relative flex flex-col h-full">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0c1117] border-b border-[#c6953b]/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#c6953b] flex items-center justify-center text-sm font-bold text-black">ס</div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-white font-bold text-sm">סדן</div>
                    {connected && (
                      <span className="text-[9px] text-gray-500 border border-gray-700 rounded px-1 py-0.5 leading-none">
                        transcript
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusDot}`} />
                    {statusLabel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10 text-xs"
              >
                <ChevronLeft size={15} />
                סגור
              </button>
            </div>

            {/* הודעות */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
              {loading && (
                <div className="flex justify-end mb-3">
                  <div className="w-7 h-7 rounded-full bg-[#c6953b] flex items-center justify-center text-xs font-bold text-black ml-2">ס</div>
                  <div className="bg-[#c6953b]/15 border border-[#c6953b]/30 px-3 py-2 rounded-2xl rounded-tl-sm">
                    <Loader size={14} className="text-[#c6953b] animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>

            {/* שגיאה */}
            {error && (
              <div className="mx-3 mb-2 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-xs text-right flex-shrink-0">
                ⚠️ {error}
              </div>
            )}

            {/* Waveform / PTT — מוצגת כשמחובר */}
            {connected && (
              <div className={`mx-3 mb-2 px-4 py-3 rounded-xl flex flex-col items-center gap-1 flex-shrink-0 border transition-colors
                ${pttActive
                  ? 'bg-red-900/30 border-red-500/50'
                  : pttMode
                    ? 'bg-[#1a1f2e] border-yellow-500/30'
                    : 'bg-[#111827] border-[#c6953b]/20'
                }`}
              >
                {/* PTT mode: touch button + hint text */}
                {pttMode ? (
                  <>
                    <button
                      onPointerDown={() => { setPttActive(true); pttActiveRef.current = true }}
                      onPointerUp={() => { setPttActive(false); pttActiveRef.current = false }}
                      onPointerLeave={() => { setPttActive(false); pttActiveRef.current = false }}
                      className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl select-none transition-all
                        ${pttActive
                          ? 'bg-red-500 text-white scale-95 shadow-lg shadow-red-500/40'
                          : 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/40 hover:bg-yellow-500/30'
                        }`}
                      style={{ touchAction: 'none' }}
                    >
                      🎙️
                    </button>
                    <span className="text-[10px] mt-0.5 text-center leading-tight"
                      style={{ color: pttActive ? '#ef4444' : '#eab308' }}>
                      {pttActive ? '🔴 מקליט — שחרר לסיום' : 'לחץ רווח / כפתור לדבר'}
                    </span>
                    {/* PTT badge */}
                    <span className="text-[9px] text-yellow-600 bg-yellow-900/30 px-2 py-0.5 rounded-full border border-yellow-700/30">
                      מצב PTT פעיל
                    </span>
                  </>
                ) : (
                  <>
                    <LiveWaveform analyserRef={analyserRef} active={listening && !speaking} />
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      {speaking ? '💬 סדן מדבר' : '🎙️ מקשיב — דבר עכשיו'}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-800 flex items-center gap-2 flex-shrink-0 bg-[#0c1117]">
              {/* שלח */}
              <button
                onClick={() => sendText(input)}
                disabled={!input.trim() || loading}
                className="text-[#c6953b] hover:text-white disabled:opacity-30 transition-colors flex-shrink-0 p-1"
                title="שלח"
              >
                <Send size={18} />
              </button>

              {/* שדה טקסט */}
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="כתוב שאלה..."
                disabled={loading}
                className="flex-1 bg-[#1f2937] text-white text-sm rounded-xl px-3 py-2
                           focus:outline-none focus:ring-1 focus:ring-[#c6953b]
                           placeholder:text-gray-500 disabled:opacity-50"
                dir="rtl"
              />

              {/* עצור השמעה */}
              {speaking && (
                <button
                  onClick={stopPlayback}
                  className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-300 transition-colors animate-pulse"
                  title="עצור השמעה"
                >
                  <Volume2 size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
    </>
  )
}

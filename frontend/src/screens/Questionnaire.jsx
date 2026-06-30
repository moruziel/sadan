import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronLeft, Plus, X } from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'

const READINESS_LEVELS = [
  { value: 'aleph', label: 'א׳', sub: 'ראשונה', desc: 'כשיר לחלוטין — כל מסלולי אש פתוחים',         color: 'green',  blocked: false },
  { value: 'bet',   label: 'ב׳', sub: 'שנייה',  desc: 'כשיר — נדרש קצין מאשר מדרגת סא"ל ומעלה',    color: 'green',  blocked: false },
  { value: 'gimel', label: 'ג׳', sub: 'שלישית', desc: 'כשירות חלקית — אסור לתרגל ירי חי',           color: 'orange', blocked: true  },
  { value: 'dalet', label: 'ד׳', sub: 'רביעית', desc: 'לא כשיר — יש לשדרג לפני כל פעילות אש',       color: 'red',    blocked: true  },
]

const OBJECTIVES = [
  'תרגול לוחמה בשטח פתוח',
  'תרגול לוחמה בשטח בנוי',
  'תרגול לוגיסטיקה/רפואה/קשר',
  'תרגול פיקוד',
]
const AMMO_TYPES = ['5.56 בלבד', '5.56 + חבלה', 'ירי כבד', 'חי"ר + שריון', 'ללא חי']

// אפשרויות שת"פ (מלבד פינוי רכוב שנוסף אוטומטית)
const COLLAB_OPTIONS = [
  { id: 'air_evac',  icon: '🚁', label: 'פינוי אווירי (מסוק)',  unit: 'טייסת 124',    seder: '1 מסוק, חובש אוויר',   schedule: 'חלון 10:00–12:00' },
  { id: 'enemy_sim', icon: '🎯', label: "דימוי אויב (סדרה ג׳)", unit: "פל׳ ג׳ — סדרה", seder: '30 לוחמים',             schedule: 'כל היום' },
  { id: 'armor',     icon: '🛡️', label: 'שריון',                 unit: 'פלגת שריון',   seder: '3 טנקים / APCs',        schedule: 'לפי צורך' },
  { id: 'artillery', icon: '💥', label: 'תותחנים',               unit: 'סוללה 411',    seder: '4 תותחים',               schedule: 'ממתין לאישור' },
  { id: 'engineers', icon: '🔧', label: 'הנדסה קרבית',           unit: 'פל׳ הנדסה',    seder: '20 לוחמים + ציוד',      schedule: 'כל היום' },
  { id: 'airforce',  icon: '✈️', label: 'חי"א — סיוע אווירי',   unit: 'טייסת F-16',   seder: 'זמן טיסה 2 שעות',       schedule: 'ממתין לאישור' },
]

const AUTO_EVAC = {
  id:       'ground_evac',
  icon:     '🚑',
  label:    'פינוי רכוב',
  unit:     'נהג + חובש',
  seder:    '4x4 + ערכת חובש מתקדמת',
  schedule: '3–7 דקות זמן תגובה',
  auto:     true,
}

export default function Questionnaire() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    objective:   'תרגול לוחמה בשטח פתוח',
    topic:       '',
    area:        'שטח אש 309ה',
    duration:    '3',
    firingCond:  'יבש',   // יבש / רטוב / שניהם
    ammo:        '5.56 + חבלה',
    date:        '05/05/2026',
    readiness:   null,
    forceSize:   '30',
    composition: 'חי"ר',
  })

  const [collabItems,    setCollabItems]    = useState([])   // שת"פ נוסף ידנית
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [sadanDismissed, setSadanDismissed] = useState(false)
  const [sadanAccepted,  setSadanAccepted]  = useState(false)
  const [sadanFilled,    setSadanFilled]    = useState({})   // { fieldId: true } — brief gold flash
  const flashTimers = useRef({})

  // ── SADAN voice fill ──────────────────────────────────────────────────────
  useEffect(() => {
    function flash(key) {
      setSadanFilled(p => ({ ...p, [key]: true }))
      clearTimeout(flashTimers.current[key])
      flashTimers.current[key] = setTimeout(() =>
        setSadanFilled(p => { const n = { ...p }; delete n[key]; return n }), 1800)
    }
    function onFill(e) {
      const { field_id, value } = e.detail ?? {}
      if (!field_id) return
      if (field_id === 'readiness') { set('readiness', value); flash('readiness') }
      else if (['topic','objective','ammo','date','forceSize','composition'].includes(field_id)) {
        set(field_id, value); flash(field_id)
      }
    }
    window.addEventListener('fillField', onFill)
    return () => window.removeEventListener('fillField', onFill)
  }, [])

  // SADAN voice: "המשך" / "עבור למתווים" → navigate to /plans if canProceed
  useEffect(() => {
    function onAction(e) {
      const { action } = e.detail ?? {}
      if (action === 'proceed') {
        // read canProceed from current form state
        setForm(prev => {
          const bl = prev.readiness && READINESS_LEVELS.find(r => r.value === prev.readiness)?.blocked
          if (prev.readiness && !bl && prev.topic) navigate('/plans')
          return prev
        })
      }
    }
    window.addEventListener('sadan:action', onAction)
    return () => window.removeEventListener('sadan:action', onAction)
  }, [navigate])

  // האם תרגיל רטוב?
  const isWet = form.firingCond === 'רטוב'
  // כל שת"פ כולל פינוי אוטומטי
  const allCollab = [
    ...(isWet ? [AUTO_EVAC] : []),
    ...(sadanAccepted ? [COLLAB_OPTIONS.find(o => o.id === 'air_evac')].filter(Boolean) : []),
    ...collabItems,
  ].filter(Boolean)

  const blocked   = form.readiness && READINESS_LEVELS.find(r => r.value === form.readiness)?.blocked
  const canProceed = form.readiness && !blocked && form.topic

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  function addCollab(opt) {
    if (collabItems.find(c => c.id === opt.id)) return
    setCollabItems(prev => [...prev, opt])
    setShowDropdown(false)
  }

  function removeCollab(id) {
    setCollabItems(prev => prev.filter(c => c.id !== id))
    if (id === 'air_evac') setSadanAccepted(false)
  }

  // כשמשנים תנאי ירי, אם הופך ליבש — נקה sadan suggestion
  function setFiringCond(val) {
    set('firingCond', val)
    if (val === 'יבש') { setSadanAccepted(false); setSadanDismissed(false) }
  }

  return (
    <div className="flex flex-col h-screen bg-demo-bg overflow-x-hidden" dir="rtl">
      <Header currentPath="/questionnaire" />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-demo-border flex-shrink-0">
          <BackButton to="/area" label="חזרה למפה" />
          <h2 className="text-white font-bold text-base">הגדרת תרגיל — שטח אש 309ה</h2>
          <div />
        </div>

        {/* ⚠️ RULES-001: alert manager */}
        {form.readiness === 'bet' && (
          <div className="mx-4 mt-2 flex-shrink-0 bg-yellow-900/20 border border-yellow-500/30 rounded-xl px-4 py-2 text-yellow-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>קצין מאשר חייב להיות מדרגת סא"ל ומעלה.</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-0 min-h-0">
          {/* עמודה שמאל — פרטי תרגיל */}
          <div className="border-l border-demo-border p-5 overflow-y-auto space-y-3">
            <h3 className="text-demo-gold font-bold text-xs uppercase tracking-wide">פרטי התרגיל</h3>

            <Field label="מטרה עיקרית">
              <select value={form.objective} onChange={e => set('objective', e.target.value)} className={inputCls}>
                {OBJECTIVES.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>

            <Field label="שיטה">
              <div className="relative">
                <input
                  value={form.topic}
                  onChange={e => set('topic', e.target.value)}
                  placeholder="לדוגמה: ניווט לילי עד לאיתור בשטח בנוי"
                  className={`${inputCls} ${sadanFilled.topic ? 'border-demo-gold ring-1 ring-demo-gold/40' : ''}`}
                />
                {sadanFilled.topic && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 bg-demo-gold text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                    ✓ סדן
                  </span>
                )}
              </div>
            </Field>

            <Field label="שטח">
              <input value={form.area} readOnly className={`${inputCls} opacity-60`} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="משך (ימים)">
                <input type="number" value={form.duration} onChange={e => set('duration', e.target.value)} min={1} max={14} className={inputCls} />
              </Field>
              <Field label="תנאי ירי">
                <select value={form.firingCond} onChange={e => setFiringCond(e.target.value)} className={inputCls}>
                  {['יבש', 'רטוב'].map(w => <option key={w}>{w}</option>)}
                </select>
              </Field>
            </div>

            {/* Auto-alert: תרגיל רטוב */}
            {isWet && (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl px-3 py-2 text-xs text-orange-300 flex items-center gap-2">
                ⚠️ תרגיל רטוב — פינוי רכוב נדרש. נוסף אוטומטית.
              </div>
            )}

            <Field label='אמל"ח נדרש'>
              <select value={form.ammo} onChange={e => set('ammo', e.target.value)} className={inputCls}>
                {AMMO_TYPES.map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>

            <Field label="תאריך מיועד">
              <input value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </Field>

            {/* ── שת"פ יחידות ─────────────────────────────────── */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-demo-gold font-bold text-xs uppercase tracking-wide">שת"פ יחידות</h3>
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(v => !v)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-demo-gold transition-colors border border-demo-border hover:border-demo-gold/40 rounded-lg px-2 py-1"
                  >
                    <Plus size={12} />
                    הוסף שת"פ
                  </button>

                  {showDropdown && (
                    <div className="absolute bottom-8 left-0 z-30 bg-demo-surface border border-demo-border rounded-xl shadow-2xl overflow-hidden w-52">
                      {COLLAB_OPTIONS
                        .filter(o => !collabItems.find(c => c.id === o.id) && !(sadanAccepted && o.id === 'air_evac'))
                        .map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => addCollab(opt)}
                            className="w-full text-right px-3 py-2.5 text-xs text-gray-300 hover:bg-demo-card hover:text-white transition-all flex items-center gap-2 border-b border-demo-border/50"
                          >
                            <span>{opt.icon}</span>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {allCollab.length === 0 && (
                  <div className="text-gray-600 text-xs text-center py-2">אין שת"פ — לחץ "הוסף שת"פ" להוספה</div>
                )}
                {allCollab.map(item => (
                  <div key={item.id} className={`flex items-start justify-between px-3 py-2 rounded-xl border text-xs
                    ${item.auto ? 'bg-green-900/10 border-green-500/20' : 'bg-demo-card border-demo-border'}`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span className={`font-semibold ${item.auto ? 'text-green-400' : 'text-white'}`}>{item.label}</span>
                        {item.auto && <span className="text-green-500 text-[10px]">(אוטומטי)</span>}
                      </div>
                      <div className="text-gray-500">{item.unit} • {item.seder}</div>
                      <div className="text-gray-600">{item.schedule}</div>
                    </div>
                    {!item.auto && (
                      <button onClick={() => removeCollab(item.id)} className="text-gray-600 hover:text-red-400 p-0.5">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* עמודה ימין — כשירות + סדן suggestion + המשך */}
          <div className="p-5 overflow-y-auto space-y-4 min-h-0">
            <div>
              <h3 className="text-demo-gold font-bold text-xs uppercase tracking-wide mb-3">רמת כשירות</h3>
              <div className="grid grid-cols-2 gap-3">
                {READINESS_LEVELS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => set('readiness', r.value)}
                    className={`
                      relative flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all
                      ${form.readiness === r.value
                        ? r.blocked
                          ? 'border-demo-danger bg-demo-danger/10 text-demo-danger'
                          : 'border-demo-gold bg-demo-gold/10 text-demo-gold'
                        : 'border-demo-border bg-demo-card text-gray-400 hover:border-gray-500'
                      }
                      ${sadanFilled.readiness && form.readiness === r.value ? 'ring-2 ring-demo-gold ring-offset-2 ring-offset-demo-bg' : ''}
                    `}
                  >
                    {sadanFilled.readiness && form.readiness === r.value && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-demo-gold text-black text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap z-10 shadow-lg animate-bounce">
                        ✓ סדן
                      </span>
                    )}
                    {r.blocked && (
                      <span className="absolute top-2 right-2 text-demo-danger"><AlertCircle size={14} /></span>
                    )}
                    <span className="font-bold text-2xl">{r.label}</span>
                    <span className="text-xs font-normal mt-0.5 opacity-70">{r.sub}</span>
                    <span className={`text-[10px] mt-1.5 leading-tight text-center font-normal
                      ${form.readiness === r.value
                        ? r.blocked ? 'text-demo-danger/80' : 'text-demo-gold/80'
                        : 'text-gray-600'
                      }`}>
                      {r.desc}
                    </span>
                  </button>
                ))}
              </div>

              {blocked && (
                <div className="mt-2 bg-demo-danger/10 border border-demo-danger/30 rounded-xl px-3 py-2.5 flex items-center gap-2 text-demo-danger text-xs">
                  <AlertCircle size={14} />
                  <span>כשירות {form.readiness === 'gimel' ? 'ג׳' : 'ד׳'} — אינה מאפשרת תרגיל חי. יש לשדרג.</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label='גודל כוח (כ"א)'>
                <input type="number" value={form.forceSize} onChange={e => set('forceSize', e.target.value)} className={inputCls} />
                <div className="text-gray-500 text-xs leading-relaxed pt-0.5">
                  מ"מ · 3 מכ"ים · סמל · ~25 לוחמים
                </div>
              </Field>
              <Field label="הרכב">
                <select value={form.composition} onChange={e => set('composition', e.target.value)} className={inputCls}>
                  {['חי"ר', 'שריון', 'חי"ר + שריון', 'הנדסה', 'מיוחדות'].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {/* הצעת סדן — מופיעה רק כשרטוב ולא dismiss */}
            {isWet && !sadanDismissed && !sadanAccepted && (
              <div className="bg-[#1e2d45] border border-blue-500/30 rounded-xl px-4 py-3 text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-demo-gold flex items-center justify-center text-xs font-bold text-black flex-shrink-0">ס</div>
                  <div className="text-blue-200 text-xs leading-relaxed">
                    <span className="font-bold text-white">סדן מציעה: </span>
                    זיהינו שכוח מקביל (גדוד 52) מבצע תרגול מסוק סמוך אליך. תרצה לבדוק שת"פ עם יחידה מוטסת לטובת פינוי פצועים?
                  </div>
                </div>
                <div className="flex gap-2 pr-9">
                  <button
                    onClick={() => { setSadanAccepted(true); setSadanDismissed(true) }}
                    className="px-3 py-1.5 bg-demo-gold text-black text-xs font-bold rounded-lg hover:opacity-90"
                  >
                    כן, הוסף
                  </button>
                  <button
                    onClick={() => setSadanDismissed(true)}
                    className="px-3 py-1.5 text-gray-500 text-xs hover:text-white transition-colors"
                  >
                    לא תודה
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => navigate('/plans')}
                disabled={!canProceed}
                className={`
                  w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2
                  ${canProceed
                    ? 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black shadow-lg shadow-demo-gold/20 hover:opacity-90'
                    : 'bg-demo-card text-gray-600 cursor-not-allowed border border-demo-border'
                  }
                `}
              >
                <span>צור 3 מתווים</span>
                {canProceed && <ChevronLeft size={20} />}
              </button>
              {!canProceed && (
                <div className="mt-2 space-y-1">
                  {!form.readiness && (
                    <p className="text-gray-500 text-xs text-center">· יש לבחור רמת כשירות</p>
                  )}
                  {blocked && (
                    <p className="text-demo-danger text-xs text-center">· כשירות {form.readiness === 'gimel' ? 'ג׳' : 'ד׳'} אינה מאפשרת תרגיל — יש לשדרג</p>
                  )}
                  {!form.topic && (
                    <p className="text-gray-500 text-xs text-center">· יש למלא את שדה "שיטה"</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-demo-card border border-demo-border text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-demo-gold'

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-gray-300 text-sm font-semibold">{label}</label>
      {children}
    </div>
  )
}

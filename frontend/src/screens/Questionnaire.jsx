import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'

const READINESS_LEVELS = [
  { value: 'aleph', label: 'א׳', sub: 'ראשונה', color: 'green',  blocked: false },
  { value: 'bet',   label: 'ב׳', sub: 'שנייה',  color: 'green',  blocked: false },
  { value: 'gimel', label: 'ג׳', sub: 'שלישית', color: 'orange', blocked: true  },
  { value: 'dalet', label: 'ד׳', sub: 'רביעית', color: 'red',    blocked: true  },
]

const OBJECTIVES = ['כיבוש', 'הגנה', 'סיור', 'קרב בשטח בנוי', 'לוגיסטי', 'קשר', 'רפואי']
const AMMO_TYPES = ['5.56 בלבד', '5.56 + חבלה', 'ירי כבד', 'חי"ר + שריון', 'ללא חי']

export default function Questionnaire() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    objective:   'כיבוש',
    topic:       '',
    area:        'שטח אש 309ה',
    duration:    '3',
    weather:     'יבש',
    ammo:        '5.56 + חבלה',
    date:        '05/05/2026',
    readiness:   null,
    forceSize:   '150',
    composition: 'חי"ר',
  })

  const blocked = form.readiness && READINESS_LEVELS.find(r => r.value === form.readiness)?.blocked

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  const canProceed = form.readiness && !blocked && form.topic

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/questionnaire" />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-demo-border">
          <BackButton to="/area" label="חזרה למפה" />
          <h2 className="text-white font-bold text-base">הגדרת תרגיל — שטח אש 309ה</h2>
          <div />
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-0">
          {/* עמודה שמאל — פרטי תרגיל */}
          <div className="border-l border-demo-border p-6 overflow-y-auto space-y-4">
            <h3 className="text-demo-gold font-bold text-sm uppercase tracking-wide">פרטי התרגיל</h3>

            <Field label="מטרה עיקרית">
              <select value={form.objective} onChange={e => set('objective', e.target.value)} className={inputCls}>
                {OBJECTIVES.map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>

            <Field label="נושא / כותרת">
              <input
                value={form.topic}
                onChange={e => set('topic', e.target.value)}
                placeholder="לדוגמה: כיבוש בטונדה בגיבוי שריון"
                className={inputCls}
              />
            </Field>

            <Field label="שטח">
              <input value={form.area} readOnly className={`${inputCls} opacity-60`} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="משך (ימים)">
                <input type="number" value={form.duration} onChange={e => set('duration', e.target.value)} min={1} max={14} className={inputCls} />
              </Field>
              <Field label="תנאי רטיבות">
                <select value={form.weather} onChange={e => set('weather', e.target.value)} className={inputCls}>
                  {['יבש', 'לח', 'גשום'].map(w => <option key={w}>{w}</option>)}
                </select>
              </Field>
            </div>

            <Field label='אמל"ח נדרש'>
              <select value={form.ammo} onChange={e => set('ammo', e.target.value)} className={inputCls}>
                {AMMO_TYPES.map(a => <option key={a}>{a}</option>)}
              </select>
            </Field>

            <Field label="תאריך מיועד">
              <input value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
            </Field>
          </div>

          {/* עמודה ימין — כשירות + כוח */}
          <div className="p-6 overflow-y-auto space-y-6">
            <div>
              <h3 className="text-demo-gold font-bold text-sm uppercase tracking-wide mb-3">רמת כשירות</h3>
              <div className="grid grid-cols-2 gap-3">
                {READINESS_LEVELS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => set('readiness', r.value)}
                    className={`
                      relative flex flex-col items-center justify-center py-5 rounded-2xl border-2 transition-all font-bold text-2xl
                      ${form.readiness === r.value
                        ? r.blocked
                          ? 'border-demo-danger bg-demo-danger/10 text-demo-danger'
                          : 'border-demo-gold bg-demo-gold/10 text-demo-gold'
                        : 'border-demo-border bg-demo-card text-gray-400 hover:border-gray-500'
                      }
                    `}
                  >
                    {r.label}
                    <span className="text-xs font-normal mt-1 opacity-70">{r.sub}</span>
                    {r.blocked && (
                      <span className="absolute top-2 right-2 text-demo-danger">
                        <AlertCircle size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {blocked && (
                <div className="mt-3 bg-demo-danger/10 border border-demo-danger/30 rounded-xl px-4 py-3 flex items-center gap-2 text-demo-danger text-sm">
                  <AlertCircle size={16} />
                  <span>כשירות {form.readiness === 'gimel' ? 'ג׳' : 'ד׳'} — אינה מאפשרת תרגיל חי. יש לשדרג כשירות לפני המשך.</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label='גודל כוח (כ"א)'>
                <input type="number" value={form.forceSize} onChange={e => set('forceSize', e.target.value)} className={inputCls} />
              </Field>
              <Field label="הרכב">
                <select value={form.composition} onChange={e => set('composition', e.target.value)} className={inputCls}>
                  {['חי"ר', 'שריון', 'חי"ר + שריון', 'הנדסה', 'מיוחדות'].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <div className="pt-4">
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
              {!form.readiness && (
                <p className="text-gray-500 text-xs text-center mt-2">יש לבחור רמת כשירות</p>
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

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle, XCircle, Mic, Send, Loader2, Info, MessageCircle, X } from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'
import sadanContext from '../services/sadanContext'
import { QUIZ_QUESTIONS, QUIZ_OPEN_QUESTION } from '../data/mockData'

const TOTAL  = QUIZ_QUESTIONS.length
const LS_KEY = 'sadan_quiz_state'

// ── לוגיקת תגובה חכמה לסדן ────────────────────────────
function buildSadanResponse(userMsg) {
  const t = userMsg

  // זיהוי ניסיון "לרמות" — לבקש תשובה ישירה
  const isCheat = /תגל[הי]|תגיד|מה התשוב|תאמר לי|תת לי|תרמ[הו]|תספר לי|תחשוף|תפתור|פתור|מה נכון|מה בוחר|מה לענות/i.test(t)

  // זיהוי בקשת עזרה לגיטימית
  const isHelpRequest = /עזור|רמז|hint|לא מבין|לא מצא|איפה|היכן|כיצד|איך/i.test(t)

  // זיהוי נושא לפי מילות מפתח
  const isFire      = /ירי|אזימוט|עמד[הת]|ברתק|שלב|כיוון|מעבר לחי"ר/i.test(t)
  const isSafety    = /בטיח|חדל|עצור|קצין|נוהל|עצירה/i.test(t)
  const isNatbam    = /נת"?ב|בור|מצוק|חירב|מפגע|סכנה|שטח מסוכן/i.test(t)
  const isLogistics = /מים|מזון|ארוחה|קשר|תדר|אות קריא|פינוי|רפוא|חובש/i.test(t)
  const isMap       = /מפ[הת]|שטח|גזר[הת]|ממדי|נ"?צ|קואורד/i.test(t)

  const tab = isFire ? 'fire' : isSafety ? 'safety' : isNatbam ? 'natbam' : isLogistics ? 'logistics' : null
  const tabLabel = { fire: 'ירי ושטחים', safety: 'בטיחות', natbam: 'נת"בים', logistics: 'לוגיסטיקה' }[tab]

  if (isCheat) {
    return {
      text: 'לא אוכל לגלות את התשובה ישירות — זה חלק ממטרת הבוחן 😊\nאני יכול לפתוח עבורך את הסעיף המתאים בתיק כדי שתמצא בעצמך.',
      action: tab ? { label: `פתח "${tabLabel}"`, tab } : { label: 'פתח תיק התרגיל', tab: 'general' },
    }
  }

  if (isMap) {
    return {
      text: 'נסה לעיין במפת הגזרה — הנתונים הרלוונטיים מסומנים שם.',
      action: { label: 'פתח ירי ושטחים', tab: 'fire' },
    }
  }

  if (tab) {
    return {
      text: isHelpRequest
        ? `רמז: המידע שאתה מחפש נמצא בטאב "${tabLabel}". רוצה שאפתח?`
        : `בנושא זה תמצא מידע בטאב "${tabLabel}" בתיק התרגיל.`,
      action: { label: `פתח "${tabLabel}"`, tab },
    }
  }

  // ברירת מחדל
  return {
    text: 'לחץ על כפתור ℹ ליד שאלה ספציפית — אני אפתח ישירות את הסעיף הרלוונטי בתיק.',
  }
}

// ── שמירה / שחזור מ-localStorage ─────────────────────────
function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

// ── צ'אט סדן צף ─────────────────────────────────────────
function SadanChat({ onOpenTab }) {
  const [open,    setOpen]    = useState(false)
  const [text,    setText]    = useState('')
  const [msgs,    setMsgs]    = useState([
    { from: 'sadan', text: 'שלום! אני סדן. אשמח לעזור — אבל לא אגלה תשובות ישירות 😊\nשאל אותי ואפתח עבורך את הסעיף הנכון בתיק.' },
  ])
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  function handleSend() {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setText('')
    setMsgs(prev => [...prev, { from: 'user', text: userMsg }])
    setLoading(true)
    setTimeout(() => {
      const response = buildSadanResponse(userMsg)
      setMsgs(prev => [...prev, { from: 'sadan', ...response }])
      setLoading(false)
    }, 1200)
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 bg-demo-surface border border-demo-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* כותרת */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 border-b border-demo-border">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-black">AI</span>
            </div>
            <span className="text-white font-bold text-sm">סדן — עוזר הבוחן</span>
            <button onClick={() => setOpen(false)} className="mr-auto text-gray-500 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* הודעות */}
          <div className="px-3 py-2 max-h-52 overflow-y-auto space-y-2">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-start' : 'justify-end'}`} dir="rtl">
                <div className={`max-w-[90%] px-3 py-1.5 rounded-xl text-sm leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-demo-card text-gray-200 rounded-tr-none'
                    : 'bg-blue-600/25 text-blue-200 rounded-tl-none border border-blue-500/20'
                }`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                  {m.action && (
                    <button
                      onClick={() => { onOpenTab(m.action.tab); setOpen(false) }}
                      className="mt-2 flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/40 rounded-lg px-2.5 py-1 transition-colors"
                    >
                      <Info size={11} /> {m.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-blue-600/20 border border-blue-500/20 rounded-xl px-3 py-2">
                  <Loader2 size={14} className="text-blue-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* שורת קלט */}
          <div className="px-3 py-2 border-t border-demo-border flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="שאל את סדן..."
              dir="rtl"
              className="flex-1 bg-demo-card border border-demo-border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-demo-gold/50 placeholder-gray-600"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || loading}
              className="text-blue-400 hover:text-blue-300 disabled:opacity-30 transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* כפתור צף */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity relative"
        title="שאל את סדן"
      >
        {open ? <X size={18} className="text-white" /> : <MessageCircle size={18} className="text-white" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-demo-gold rounded-full text-[9px] font-black text-black flex items-center justify-center">AI</span>
        )}
      </button>
    </div>
  )
}

// ── כרטיס שאלה ───────────────────────────────────────────
function QuestionCard({ q, selected, submitted, onSelect, onInfo, sadanFlash }) {
  const isAnswered = selected !== undefined
  const isCorrect  = submitted && selected === q.correct
  const isWrong    = submitted && isAnswered && selected !== q.correct
  const locked     = submitted && isCorrect

  return (
    <div className={`h-full flex flex-col rounded-xl border transition-all
      ${isCorrect ? 'border-green-400 bg-green-950/30'
      : isWrong   ? 'border-red-400   bg-red-950/20'
      :             'border-demo-border bg-demo-surface'}`}
    >
      {/* שאלה + מקור + אינפו — שורה אחת */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-demo-border/60 flex items-start gap-2">
        {submitted && isAnswered && (
          isCorrect
            ? <CheckCircle size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
            : <XCircle     size={15} className="text-red-400   flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base leading-snug">{q.id}. {q.question}</p>
          <p className="text-gray-600 text-[10px] leading-none mt-0.5">מקור: {q.source}</p>
        </div>
        {/* כפתור אינפו — בולט יותר */}
        <button
          onClick={e => { e.stopPropagation(); onInfo(q.tab) }}
          className="flex-shrink-0 p-1.5 rounded-lg text-blue-400 hover:text-blue-200 hover:bg-blue-400/15 transition-colors"
          title="פתח בתיק התרגיל"
        >
          <Info size={17} />
        </button>
      </div>

      {/* תשובות — אין overflow-hidden, אין חיתוך */}
      <div className="flex-1 flex flex-col gap-1 px-2 pt-1.5 pb-2 min-h-0">
        {q.options.map((opt, idx) => {
          const isSel      = selected === idx
          // ✅ ירוק — רק אם המשתמש בחר ובחר נכון
          const isRight    = submitted && isSel && idx === q.correct
          // ❌ אדום — בחר וטעה
          const isBad      = submitted && isSel && idx !== q.correct
          // שאר הכפתורים — ניטרליים (לא מגלים תשובה נכונה)
          const isNeutral  = !isRight && !isBad

          return (
            <button
              key={idx}
              onClick={() => !locked && onSelect(q.id, idx)}
              disabled={locked}
              className={`relative flex-1 min-h-0 text-right px-3 rounded-lg border font-semibold text-base transition-all leading-tight
                ${isRight  ? 'bg-green-500/20 border-green-400 text-green-200' : ''}
                ${isBad    ? 'bg-red-500/20   border-red-400   text-red-200'   : ''}
                ${isNeutral && isSel && !submitted ? 'bg-demo-gold/10 border-demo-gold text-white' : ''}
                ${isNeutral && !isSel ? 'border-demo-border/50 text-gray-300 hover:border-gray-400 hover:text-white' : ''}
                ${isNeutral && isSel && submitted ? 'border-demo-border/50 text-gray-300' : ''}
                ${sadanFlash && isSel ? 'ring-2 ring-demo-gold ring-offset-1 ring-offset-demo-bg' : ''}
                ${locked ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              {sadanFlash && isSel && (
                <span className="absolute -top-2 left-2 bg-demo-gold text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow animate-bounce">
                  ✓ סדן
                </span>
              )}
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── גלי קול ─────────────────────────────────────────────
const WAVE_DELAYS = [0, 0.09, 0.18, 0.27, 0.18, 0.09, 0, 0.13, 0.22]

function WaveformBars({ count = 9, color = '#c6953b', height = 18 }) {
  return (
    <div className="flex items-center gap-px" style={{ height }}>
      {WAVE_DELAYS.slice(0, count).map((d, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 9999,
            background: color,
            height: 3,
            animation: `sadanWave 0.65s ease-in-out ${d}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// inject CSS keyframes once
let _waveCSS = false
function ensureWaveCSS() {
  if (_waveCSS) return
  _waveCSS = true
  const el = document.createElement('style')
  el.textContent = `@keyframes sadanWave{0%,100%{height:3px}50%{height:${18}px}}`
  document.head.appendChild(el)
}

// ── שאלה פתוחה ────────────────────────────────────────────
function OpenQuestion({ onPass }) {
  const [text,      setText]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [evaluated, setEvaluated] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    ensureWaveCSS()
    ref.current?.focus()
  }, [])

  // פתח את צ'אט סדן עם השאלה — אותה ארכיטקטורה כמו שאר המערכת
  function handleVoice() {
    window.dispatchEvent(new CustomEvent('sadanOpen', {
      detail: { message: QUIZ_OPEN_QUESTION.question },
    }))
  }

  function handleSubmit() {
    if (text.trim().length < QUIZ_OPEN_QUESTION.minLength || loading || evaluated) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setEvaluated(true); setTimeout(onPass, 800) }, 2200)
  }

  return (
    <div className="mt-3 flex-shrink-0 rounded-2xl border-2 border-demo-gold/40 bg-demo-gold/5 overflow-hidden animate-fade-in">

      {/* כותרת */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-demo-gold/20 bg-demo-gold/10">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-black">AI</span>
        </div>
        <div>
          <div className="text-white font-bold text-base">שאלת בקיאות — סדן שואל</div>
          <div className="text-gray-400 text-sm">{QUIZ_OPEN_QUESTION.question}</div>
        </div>
        <button
          onClick={handleVoice}
          className="mr-auto flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 text-demo-gold hover:bg-demo-gold/10 border border-transparent transition-all"
          title="פתח צ'אט סדן עם השאלה"
        >
          <Mic size={15} /> <span className="text-sm">קולי</span>
        </button>
      </div>

      <div className="px-5 py-3 flex items-start gap-3">
        {!evaluated ? (
          <>
            <textarea
              ref={ref} value={text} onChange={e => setText(e.target.value)}
              disabled={loading} rows={2}
              placeholder="כתוב את תשובתך כאן..."
              className="flex-1 bg-demo-card border border-demo-border rounded-xl px-4 py-2.5 text-white text-base font-medium resize-none focus:outline-none focus:border-demo-gold/60 placeholder-gray-600"
              dir="rtl"
            />
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={text.trim().length < QUIZ_OPEN_QUESTION.minLength || loading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-base transition-all ${
                  text.trim().length >= QUIZ_OPEN_QUESTION.minLength && !loading
                    ? 'bg-demo-gold text-black hover:opacity-90'
                    : 'bg-demo-card border border-demo-border text-gray-600 cursor-not-allowed'
                }`}
              >
                {loading ? <><Loader2 size={14} className="animate-spin" />מעריך...</> : <><Send size={14} />שלח</>}
              </button>
              <span className="text-xs text-gray-600">
                {text.length} תווים
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 w-full bg-green-900/30 border border-green-500/40 rounded-xl px-4 py-3">
            <CheckCircle size={22} className="text-green-400 flex-shrink-0" />
            <div>
              <div className="text-green-300 font-bold text-base">בקיאות מאומתת ✓</div>
              <div className="text-green-500 text-sm">סדן אימת הבנה מספקת של התרגיל</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── מסך ראשי ─────────────────────────────────────────────
export default function Quiz() {
  const navigate = useNavigate()

  // תמיד מתחילים נקי — לא משחזרים מ-localStorage
  const [answers,     setAnswers]     = useState({})
  const [submitted,   setSubmitted]   = useState(false)
  const [openDone,    setOpenDone]    = useState(false)
  const [sadanFilled, setSadanFilled] = useState({})   // { questionId: true } — gold flash
  const flashTimers = useRef({})

  // Report quiz progress to SADAN (voice context)
  useEffect(() => {
    const answered = Object.keys(answers).length
    const ctx = {
      'שאלות במבחן': TOTAL,
      'נענו': answered,
    }
    if (submitted) {
      ctx['הוגש'] = 'כן'
      ctx['ציון'] = `${QUIZ_QUESTIONS.filter(q => answers[q.id] === q.correct).length}/${TOTAL}`
    }
    sadanContext.setScreen('quiz', ctx)
  }, [answers, submitted])

  // SADAN voice → fill answer
  useEffect(() => {
    function onFill(e) {
      const { field_id, question_id, answer_idx } = e.detail ?? {}
      if (field_id !== 'answer' || !question_id || answer_idx === undefined) return
      selectAnswer(question_id, answer_idx)
      setSadanFilled(p => ({ ...p, [question_id]: true }))
      clearTimeout(flashTimers.current[question_id])
      flashTimers.current[question_id] = setTimeout(() =>
        setSadanFilled(p => { const n = { ...p }; delete n[question_id]; return n }), 1800)
    }
    window.addEventListener('fillField', onFill)
    return () => window.removeEventListener('fillField', onFill)
  }, [])

  // SADAN voice → submit quiz / go to approvals
  useEffect(() => {
    function onAction(e) {
      const { action } = e.detail ?? {}
      if (action === 'submit_quiz') {
        // read fresh answers from localStorage / state via ref
        setAnswers(prev => {
          const allDone = QUIZ_QUESTIONS.every(q => prev[q.id] !== undefined)
          if (allDone) setSubmitted(true)
          return prev
        })
      } else if (action === 'go_approvals') {
        goToApprovals()
      }
    }
    window.addEventListener('sadan:action', onAction)
    return () => window.removeEventListener('sadan:action', onAction)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ניקוי localStorage בכניסה (דמו — תמיד מתחילים נקי)
  useEffect(() => {
    localStorage.removeItem(LS_KEY)
  }, [])

  function goToApprovals() {
    navigate('/approvals')
  }

  // ניווט לתיק תרגיל — טאב רלוונטי לשאלה
  function handleInfoClick(tab) {
    navigate('/exercise', { state: { returnFromQuiz: true, openTab: tab || 'general' } })
  }

  const allAnswered = QUIZ_QUESTIONS.every(q => answers[q.id] !== undefined)
  const score      = submitted ? QUIZ_QUESTIONS.filter(q => answers[q.id] === q.correct).length : 0
  const allCorrect = submitted && score === TOTAL

  function selectAnswer(qId, idx) {
    setAnswers(prev => ({ ...prev, [qId]: idx }))
  }

  const col1 = QUIZ_QUESTIONS.slice(0, 4)
  const col2 = QUIZ_QUESTIONS.slice(4, 8)

  return (
    <div className="flex flex-col h-dvh bg-demo-bg overflow-hidden" dir="rtl">
      <Header currentPath="/quiz" />

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-demo-border bg-demo-surface flex-shrink-0">
        <BackButton to="/exercise" />
        <div className="text-center">
          <h2 className="text-white font-bold text-base">בוחן הכנה לתרגיל</h2>
          <p className="text-gray-500 text-sm">נדרש: {TOTAL}/{TOTAL} — ציון 100%</p>
        </div>
        <div />
      </div>

      {/* באנר הסבר — משתנה לפי מצב */}
      <div className="px-6 py-2.5 bg-demo-card/60 border-b border-demo-border flex-shrink-0">
        {!allCorrect ? (
          <p className="text-gray-200 text-base leading-relaxed">
            לפניך <span className="text-white font-bold">{TOTAL} שאלות</span> — ענה נכונה על{' '}
            <span className="text-demo-gold font-bold">כולן (8/8 | 100%)</span>{' '}
            כדי לפתוח את שאלת הבקיאות ולהמשיך לאישורים.
            {submitted && (
              <span className="text-orange-400 font-bold mr-2">
                · לחץ על <Info size={12} className="inline mb-0.5 text-blue-400" /> בשאלה לפתיחת הסעיף בתיק.
              </span>
            )}
          </p>
        ) : !openDone ? (
          <p className="text-gray-200 text-base leading-relaxed">
            <span className="text-green-400 font-bold">✓ כל 8 השאלות נכונות!</span>
            {' '}ענה על <span className="text-demo-gold font-bold">שאלת הבקיאות</span> כדי להתקדם לאישורים.
          </p>
        ) : (
          <p className="text-green-300 text-base font-bold">
            🎖️ עברת את הבוחן בהצלחה — מורשה לתרגיל.
          </p>
        )}
      </div>

      {/* אזור מרכזי — 3 מצבים */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden px-4 py-3 flex flex-col min-h-0">

        {/* מצב 1: גריד שאלות מלא (לפני / בזמן תיקון) */}
        {!allCorrect && (
          <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
            <div className="flex flex-col md:grid md:grid-rows-4 gap-2 md:min-h-0">
              {col1.map(q => (
                <QuestionCard key={q.id} q={q} selected={answers[q.id]}
                  submitted={submitted} onSelect={selectAnswer} onInfo={handleInfoClick}
                  sadanFlash={!!sadanFilled[q.id]} />
              ))}
            </div>
            <div className="flex flex-col md:grid md:grid-rows-4 gap-2 md:min-h-0">
              {col2.map(q => (
                <QuestionCard key={q.id} q={q} selected={answers[q.id]}
                  submitted={submitted} onSelect={selectAnswer} onInfo={handleInfoClick}
                  sadanFlash={!!sadanFilled[q.id]} />
              ))}
            </div>
          </div>
        )}

        {/* מצב 2 + 3: כל 8 נכונות — summary קומפקטי + שאלה פתוחה / בנר הצלחה */}
        {allCorrect && (
          <div className="flex-1 flex flex-col gap-3 min-h-0">

            {/* summary קומפקטי — שורה אחת לכל שאלה */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 flex-shrink-0">
              {QUIZ_QUESTIONS.map(q => (
                <div key={q.id}
                  className="flex items-center gap-2 bg-green-950/40 border border-green-500/25 rounded-lg px-3 py-1.5"
                >
                  <CheckCircle size={13} className="text-green-400 flex-shrink-0" />
                  <span className="text-green-400/80 text-xs font-semibold truncate flex-1 min-w-0">
                    {q.id}. {q.question}
                  </span>
                  <span className="text-green-300 text-xs font-bold flex-shrink-0 mr-1">
                    {q.options[q.correct]}
                  </span>
                </div>
              ))}
            </div>

            {/* שאלה פתוחה */}
            {!openDone && <OpenQuestion onPass={() => setOpenDone(true)} />}

            {/* בנר הצלחה */}
            {openDone && (
              <div className="rounded-2xl border border-green-500/30 bg-green-950/20 px-5 py-4 flex items-center gap-4 animate-fade-in">
                <span className="text-3xl">🎖️</span>
                <div>
                  <div className="text-green-300 text-xl font-black">{score}/{TOTAL} — עבר!</div>
                  <div className="text-green-500 text-sm">מורשה לתרגיל — ניתן להמשיך לאישורים</div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* צ'אט סדן — כפתור צף */}
      <SadanChat onOpenTab={handleInfoClick} />

      {/* Footer */}
      <div className="px-6 py-3 border-t border-demo-border bg-demo-surface flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-base">{Object.keys(answers).length}/{TOTAL} נענו</span>
          {submitted && (
            <span className={`font-bold text-base ${score === TOTAL ? 'text-green-400' : 'text-red-400'}`}>
              · {score}/{TOTAL} נכון
            </span>
          )}
          {submitted && !allCorrect && (
            <span className="text-orange-400 text-sm">· תקן את השגויות לפתיחת שאלת הבקיאות</span>
          )}
        </div>

        <div className="flex gap-3">
          {!submitted ? (
            <button
              onClick={() => setSubmitted(true)}
              disabled={!allAnswered}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-base transition-all
                ${allAnswered
                  ? 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90'
                  : 'bg-demo-card text-gray-600 border border-demo-border cursor-not-allowed opacity-60'}`}
            >
              הגש בוחן
            </button>
          ) : (
            <button
              onClick={goToApprovals}
              disabled={!openDone}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-base transition-all
                ${openDone
                  ? 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90'
                  : 'bg-demo-card text-gray-600 border border-demo-border cursor-not-allowed opacity-60'}`}
            >
              לאישורים <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

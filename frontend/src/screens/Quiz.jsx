import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CheckCircle, XCircle, Trophy } from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'
import { QUIZ_QUESTIONS } from '../data/mockData'

const PASS_THRESHOLD = 4

export default function Quiz() {
  const navigate  = useNavigate()
  const [answers, setAnswers] = useState({})   // { questionId: selectedIndex }
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = QUIZ_QUESTIONS.every(q => answers[q.id] !== undefined)

  const score = submitted
    ? QUIZ_QUESTIONS.filter(q => answers[q.id] === q.correct).length
    : null

  const passed = score !== null && score >= PASS_THRESHOLD

  function selectAnswer(qId, idx) {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qId]: idx }))
  }

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/quiz" />

      <div className="flex items-center justify-between px-6 py-2.5 border-b border-demo-border">
        <BackButton to="/exercise" />
        <div className="text-center">
          <h2 className="text-white font-bold text-sm">בוחן הכנה לתרגיל</h2>
          <p className="text-gray-500 text-xs">סף מעבר: {PASS_THRESHOLD}/{QUIZ_QUESTIONS.length} שאלות</p>
        </div>
        <div />
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-0">
        {/* עמודה שמאל — שאלות 1-3 */}
        <div className="border-l border-demo-border p-5 overflow-y-auto space-y-4">
          {QUIZ_QUESTIONS.slice(0, 3).map(q => (
            <QuestionCard key={q.id} q={q} answers={answers} submitted={submitted} onSelect={selectAnswer} />
          ))}
        </div>

        {/* עמודה ימין — שאלות 4-5 + תוצאה */}
        <div className="p-5 overflow-y-auto space-y-4">
          {QUIZ_QUESTIONS.slice(3).map(q => (
            <QuestionCard key={q.id} q={q} answers={answers} submitted={submitted} onSelect={selectAnswer} />
          ))}

          {/* תוצאה אחרי הגשה */}
          {submitted && (
            <div className={`rounded-2xl p-5 border-2 text-center ${passed ? 'bg-demo-success/10 border-demo-success' : 'bg-demo-danger/10 border-demo-danger'}`}>
              <div className="text-4xl mb-2">{passed ? '🎖️' : '❌'}</div>
              <div className={`text-2xl font-black mb-1 ${passed ? 'text-demo-success' : 'text-demo-danger'}`}>
                {score}/{QUIZ_QUESTIONS.length}
              </div>
              <div className={`font-bold text-sm ${passed ? 'text-demo-success' : 'text-demo-danger'}`}>
                {passed ? 'עבר! — מורשה לתרגיל' : 'נכשל — יש לעבור תדריך מחדש'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div className="px-6 py-3 border-t border-demo-border bg-demo-surface flex justify-between items-center">
        <span className="text-gray-500 text-sm">{Object.keys(answers).length}/{QUIZ_QUESTIONS.length} נענו</span>
        <div className="flex gap-3">
          {!submitted ? (
            <button
              onClick={() => setSubmitted(true)}
              disabled={!allAnswered}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all
                ${allAnswered
                  ? 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90'
                  : 'bg-demo-card text-gray-600 border border-demo-border cursor-not-allowed'
                }`}
            >
              הגש בוחן
            </button>
          ) : (
            <button
              onClick={() => navigate('/approvals')}
              disabled={!passed}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all
                ${passed
                  ? 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black hover:opacity-90 shadow-lg'
                  : 'bg-demo-card text-gray-600 border border-demo-border cursor-not-allowed'
                }`}
            >
              לאישורים <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function QuestionCard({ q, answers, submitted, onSelect }) {
  const selected = answers[q.id]
  const isCorrect = submitted && selected === q.correct

  return (
    <div className={`bg-demo-surface rounded-2xl border overflow-hidden transition-all
      ${submitted && isCorrect ? 'border-demo-success' : submitted && selected !== undefined ? 'border-demo-danger' : 'border-demo-border'}`}>
      <div className="px-4 py-3 border-b border-demo-border flex items-start gap-2">
        {submitted && selected !== undefined && (
          isCorrect
            ? <CheckCircle size={16} className="text-demo-success flex-shrink-0 mt-0.5" />
            : <XCircle size={16} className="text-demo-danger flex-shrink-0 mt-0.5" />
        )}
        <p className="text-white text-base font-semibold">{q.id}. {q.question}</p>
      </div>
      <div className="p-3 space-y-2">
        {q.options.map((opt, idx) => {
          const isSelected = selected === idx
          const isRight    = submitted && idx === q.correct
          const isWrong    = submitted && isSelected && idx !== q.correct

          return (
            <button
              key={idx}
              onClick={() => onSelect(q.id, idx)}
              className={`w-full text-right text-sm px-3 py-2 rounded-xl border transition-all
                ${isRight    ? 'bg-demo-success/20 border-demo-success text-demo-success font-semibold' : ''}
                ${isWrong    ? 'bg-demo-danger/20 border-demo-danger text-demo-danger' : ''}
                ${isSelected && !submitted ? 'bg-demo-gold/10 border-demo-gold text-white' : ''}
                ${!isSelected && !isRight ? 'border-demo-border text-gray-400 hover:border-gray-500' : ''}
              `}
            >
              {opt}
            </button>
          )
        })}
        <p className="text-gray-600 text-[11px] pt-1">מקור: {q.source}</p>
      </div>
    </div>
  )
}

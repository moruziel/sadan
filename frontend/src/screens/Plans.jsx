import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, AlertTriangle, Star } from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'
import Badge from '../components/common/Badge'
import { PLANS } from '../data/mockData'

// מפה מוקטנת SVG לכל מתווה
function MiniMap({ plan }) {
  return (
    <div className="w-full h-32 bg-demo-bg rounded-xl overflow-hidden relative border border-demo-border">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* רקע טופוגרפי */}
        <rect width="100" height="100" fill="#0c1117" />
        <ellipse cx="50" cy="50" rx="40" ry="35" fill="none" stroke="#1f2937" strokeWidth="8" />
        <ellipse cx="50" cy="50" rx="28" ry="23" fill="none" stroke="#1f2937" strokeWidth="6" />
        <ellipse cx="50" cy="50" rx="16" ry="12" fill="none" stroke="#374151" strokeWidth="4" />
        {/* גבול שטח */}
        <rect x="8" y="8" width="84" height="84" fill="none" stroke="#c6953b" strokeWidth="1.5" strokeDasharray="4 2" rx="4" />
        {/* חיצי תנועה */}
        {plan.arrows.map((a, i) => (
          <g key={i}>
            <line x1={a.from[0]} y1={a.from[1]} x2={a.to[0]} y2={a.to[1]}
              stroke={a.color} strokeWidth="2.5" markerEnd="url(#arrow)" />
          </g>
        ))}
        {/* יעדים */}
        {plan.objectives_points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill={plan.tagColor === 'gold' ? '#c6953b' : '#3b82f6'} opacity="0.9" />
            <text x={p.x + 7} y={p.y + 4} fontSize="7" fill="white" fontFamily="Heebo">{p.label}</text>
          </g>
        ))}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={plan.arrows[0]?.color || '#c6953b'} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}

export default function Plans() {
  const navigate  = useNavigate()
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(false)

  function handleChoose() {
    setLoading(true)
    setTimeout(() => navigate('/exercise'), 1200)
  }

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/plans" />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-demo-border">
          <BackButton to="/questionnaire" />
          <div className="text-center">
            <h2 className="text-white font-bold text-base">3 מתווים מוצעים</h2>
            <p className="text-gray-500 text-xs">שטח 309ה | כיבוש | פלוגה ב׳</p>
          </div>
          <div />
        </div>

        {/* 3 כרטיסים */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-3 gap-5 h-full">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className={`
                  flex flex-col rounded-2xl border-2 cursor-pointer transition-all overflow-hidden
                  ${selected === plan.id
                    ? 'border-demo-gold shadow-2xl shadow-demo-gold/20 scale-[1.01]'
                    : 'border-demo-border hover:border-gray-500 bg-demo-surface'
                  }
                `}
              >
                {/* Header כרטיס */}
                <div className={`px-4 pt-4 pb-2 ${selected === plan.id ? 'bg-demo-gold/5' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <Badge color={plan.tagColor}>{plan.tag}</Badge>
                    <div className="text-center">
                      <div className={`text-2xl font-black ${plan.score >= 85 ? 'text-demo-gold' : plan.score >= 75 ? 'text-demo-success' : 'text-gray-400'}`}>
                        {plan.score}
                      </div>
                      <div className="text-[10px] text-gray-500">ציון</div>
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-base">{plan.name}</h3>
                </div>

                {/* מפה מוקטנת */}
                <div className="px-4 py-2">
                  <MiniMap plan={plan} />
                </div>

                {/* פרטים */}
                <div className="px-4 pb-4 flex-1 space-y-3">
                  <p className="text-gray-400 text-xs leading-relaxed">{plan.story}</p>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={12} />{plan.duration}</span>
                    <span className={`flex items-center gap-1 ${plan.riskColor === 'red' ? 'text-demo-danger' : plan.riskColor === 'orange' ? 'text-demo-warning' : 'text-demo-success'}`}>
                      <AlertTriangle size={12} />סיכון {plan.risk}
                    </span>
                  </div>

                  {/* אמל"ח */}
                  <div className="flex flex-wrap gap-1">
                    {plan.ammo.map(a => (
                      <span key={a} className="bg-demo-card text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-demo-border">{a}</span>
                    ))}
                  </div>
                </div>

                {/* סימון בחירה */}
                {selected === plan.id && (
                  <div className="bg-demo-gold/10 border-t border-demo-gold/30 px-4 py-2 flex items-center justify-center gap-2">
                    <Star size={14} className="text-demo-gold fill-demo-gold" />
                    <span className="text-demo-gold text-xs font-bold">נבחר</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar — ב-RTL: כפתור ראשון = ימין, טקסט שני = שמאל */}
        <div className="px-6 py-4 border-t border-demo-border flex items-center justify-between bg-demo-surface">
          <button
            onClick={handleChoose}
            disabled={!selected || loading}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all
              ${selected
                ? 'bg-gradient-to-l from-demo-gold to-yellow-500 text-black shadow-lg hover:opacity-90'
                : 'bg-demo-card text-gray-600 border border-demo-border cursor-not-allowed'
              }
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                מייצר תיק תרגיל...
              </span>
            ) : (
              <>בחר והמשך <ChevronLeft size={16} /></>
            )}
          </button>
          <span className="text-gray-500 text-sm">
            {selected ? `נבחר: ${PLANS.find(p => p.id === selected)?.name}` : 'בחר מתווה להמשך'}
          </span>
        </div>
      </div>
    </div>
  )
}

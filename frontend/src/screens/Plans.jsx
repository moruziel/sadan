import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Clock, AlertTriangle, Star, MessageSquare, BookOpen, Info } from 'lucide-react'
import Header from '../components/common/Header'
import BackButton from '../components/common/BackButton'
import Badge from '../components/common/Badge'
import DataSourcesDiagram from '../components/common/DataSourcesDiagram'
import { PLANS } from '../data/mockData'

// ── מפות SVG משודרגות ──────────────────────────────────────
function MiniMap({ plan, isSelected }) {
  if (plan.id === 'plan_1') return <MiniMap1 isSelected={isSelected} />
  if (plan.id === 'plan_2') return <MiniMap2 isSelected={isSelected} />
  return <MiniMap3 isSelected={isSelected} />
}

function MiniMap1({ isSelected }) {
  const gold = '#c6953b'
  // מתווה 1: 9 יעדים, 2 חיצים (חיפוי + מאגף), נקודת מוצא
  return (
    <div className="w-full h-28 bg-demo-bg rounded-xl overflow-hidden border border-demo-border">
      <svg viewBox="0 0 120 100" className="w-full h-full">
        {/* טופו */}
        <rect width="120" height="100" fill="#0c1117" />
        <ellipse cx="60" cy="52" rx="50" ry="42" fill="none" stroke="#1f2937" strokeWidth="7" />
        <ellipse cx="60" cy="52" rx="35" ry="28" fill="none" stroke="#1f2937" strokeWidth="5" />
        <ellipse cx="60" cy="52" rx="20" ry="15" fill="none" stroke="#374151" strokeWidth="3" />
        {/* גבול */}
        <rect x="5" y="5" width="110" height="90" fill="none" stroke={gold} strokeWidth="1" strokeDasharray="4 2" rx="3" />
        {/* ציר חיפוי */}
        <line x1="30" y1="85" x2="30" y2="35" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arr1)" strokeDasharray="5 2" />
        {/* ציר מאגף ראשי */}
        <polyline points="30,85 10,60 10,30 50,20 85,30" fill="none" stroke={gold} strokeWidth="2.5" markerEnd="url(#arr2)" />
        {/* יעדים 1-9 */}
        {[[85,30],[95,45],[85,60],[70,68],[55,65],[40,60],[30,55],[50,40],[70,30]].map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill={isSelected ? `${gold}44` : '#1f2937'} stroke={gold} strokeWidth="1.5" />
            <text x={x} y={y+3.5} fontSize="6" fill={gold} textAnchor="middle" fontWeight="bold">{i+1}</text>
          </g>
        ))}
        {/* נקודת מוצא */}
        <polygon points="30,88 26,96 34,96" fill="#22c55e" />
        <text x="30" y="100" fontSize="6" fill="#22c55e" textAnchor="middle">מוצא</text>
        <defs>
          <marker id="arr1" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" />
          </marker>
          <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={gold} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}

function MiniMap2({ isSelected }) {
  // מתווה 2: 5 יעדים, חץ ישיר
  return (
    <div className="w-full h-28 bg-demo-bg rounded-xl overflow-hidden border border-demo-border">
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <rect width="120" height="100" fill="#0c1117" />
        <ellipse cx="60" cy="50" rx="48" ry="40" fill="none" stroke="#1f2937" strokeWidth="7" />
        <ellipse cx="60" cy="50" rx="32" ry="26" fill="none" stroke="#1f2937" strokeWidth="5" />
        <rect x="5" y="5" width="110" height="90" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" rx="3" />
        {/* 5 יעדים בקו */}
        {[[60,15],[45,30],[60,45],[75,60],[60,75]].map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill={isSelected ? '#3b82f644' : '#1f2937'} stroke="#3b82f6" strokeWidth="1.5" />
            <text x={x} y={y+3.5} fontSize="6" fill="#3b82f6" textAnchor="middle" fontWeight="bold">{i+1}</text>
          </g>
        ))}
        {/* חץ ישיר */}
        <line x1="60" y1="90" x2="60" y2="20" stroke="#3b82f6" strokeWidth="2.5" markerEnd="url(#arr3)" />
        <polygon points="60,93 56,98 64,98" fill="#22c55e" />
        <defs>
          <marker id="arr3" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" />
          </marker>
        </defs>
      </svg>
    </div>
  )
}

function MiniMap3({ isSelected }) {
  // מתווה 3: 4 יעדים, ניווט עקום, חבלה
  return (
    <div className="w-full h-28 bg-demo-bg rounded-xl overflow-hidden border border-demo-border">
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <rect width="120" height="100" fill="#060b10" />
        {/* לילה — כוכבים */}
        {[[10,10],[30,5],[55,8],[80,12],[100,7],[110,20],[5,40],[115,55],[8,70],[112,80],[20,92],[90,90]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="0.8" fill="white" opacity="0.5" />
        ))}
        <ellipse cx="60" cy="50" rx="45" ry="38" fill="none" stroke="#1f2937" strokeWidth="6" />
        <rect x="5" y="5" width="110" height="90" fill="none" stroke="#6b7280" strokeWidth="1" strokeDasharray="4 2" rx="3" />
        {/* מסלול ניווט */}
        <path d="M 20 90 Q 10 60 25 40 Q 40 20 60 30 Q 80 40 90 30" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeDasharray="5 3" markerEnd="url(#arr4)" />
        {/* 4 יעדים */}
        {[[25,40],[60,30],[90,30],[75,55]].map(([x,y],i) => (
          <g key={i}>
            <rect x={x-5} y={y-5} width="10" height="10" fill={isSelected ? '#f59e0b22' : '#1f2937'} stroke="#f59e0b" strokeWidth="1.5" rx="1" />
            <text x={x} y={y+3.5} fontSize="6" fill="#f59e0b" textAnchor="middle" fontWeight="bold">{i+1}</text>
          </g>
        ))}
        {/* סמל חבלה */}
        <text x="60" y="32" fontSize="12" textAnchor="middle" style={{ filter: 'drop-shadow(0 0 4px #f59e0b)' }}>💥</text>
        {/* מוצא */}
        <circle cx="20" cy="90" r="4" fill="#9ca3af" />
        <text x="20" y="100" fontSize="5" fill="#9ca3af" textAnchor="middle">H</text>
        <defs>
          <marker id="arr4" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" />
          </marker>
        </defs>
      </svg>
    </div>
  )
}

// סיפורים מפורטים
const STORIES = {
  plan_1: 'המחלקה יוצאת משטח כינוס דרומי, מתפצלת — כוח חיפוי על רכס מערבי, כוח מאגף דרום→צפון. 9 יעדים ב-3 קבוצות. בקש"ג — הסטת אש, דו"צ קריטי. חבלה בכניסה.',
  plan_2: 'כל המחלקה כגוף אחד מדרום. כיבוש ישיר יעד-יעד, ללא פיצול. 5 יעדים, ללא חבלה.',
  plan_3: 'ניווט שקט ממערב, 2 ק"מ. כיבוש 4 יעדים, חבלה ופירוטכניקה. ללא ירי חי.',
}

export default function Plans() {
  const navigate  = useNavigate()
  const [selected,     setSelected]     = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [buildMode,    setBuildMode]    = useState('ready') // 'ready' | 'scratch'
  const [showDiagram,  setShowDiagram]  = useState(false)

  // SADAN voice: "בחר מתווה א/ב/ג" → setSelected + handleChoose
  useEffect(() => {
    function onAction(e) {
      const { action, plan_id } = e.detail ?? {}
      if (action === 'select_plan' && plan_id) {
        setSelected(plan_id)
        setBuildMode('ready')
        setTimeout(() => {
          setLoading(true)
          setTimeout(() => navigate('/exercise'), 1200)
        }, 400)
      } else if (action === 'proceed_plans' && selected) {
        handleChoose()
      }
    }
    window.addEventListener('sadan:action', onAction)
    return () => window.removeEventListener('sadan:action', onAction)
  }, [selected])  // eslint-disable-line react-hooks/exhaustive-deps

  // UPGRADE-003: פתיחת צ'אט כש"בנה מאפס" נלחץ
  function handleBuildFromScratch() {
    setBuildMode('scratch')
    window.dispatchEvent(new CustomEvent('sadanOpen'))
  }

  function handleChoose() {
    setLoading(true)
    setTimeout(() => navigate('/exercise'), 1200)
  }

  return (
    <div className="flex flex-col h-screen bg-demo-bg" dir="rtl">
      <Header currentPath="/plans" />
      {showDiagram && <DataSourcesDiagram onClose={() => setShowDiagram(false)} />}

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-demo-border flex-shrink-0">
          <BackButton to="/questionnaire" />
          <div className="text-center">
            <h2 className="text-white font-bold text-base">3 מתווים מוצעים</h2>
            <p className="text-gray-500 text-xs">שטח 309ה | כיבוש | פלוגה ב׳</p>
          </div>
          <button
            onClick={() => setShowDiagram(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-demo-card border border-demo-border rounded-lg text-gray-400 hover:text-demo-gold hover:border-demo-gold/40 text-xs transition-colors"
          >
            <Info size={13} /> מקורות
          </button>
        </div>

        {/* UPGRADE-003: בחירת מצב */}
        <div className="flex items-center justify-center gap-3 px-6 py-3 border-b border-demo-border flex-shrink-0 bg-demo-surface">
          <button
            onClick={() => setBuildMode('ready')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all
              ${buildMode === 'ready'
                ? 'bg-demo-gold text-black shadow-lg'
                : 'bg-demo-card border border-demo-border text-gray-300 hover:border-demo-gold/40'
              }`}
          >
            <BookOpen size={15} />
            בחר מתווה מוכן
          </button>
          <button
            onClick={handleBuildFromScratch}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all
              ${buildMode === 'scratch'
                ? 'bg-demo-gold text-black shadow-lg'
                : 'bg-demo-card border border-demo-border text-gray-300 hover:border-demo-gold/40'
              }`}
          >
            <MessageSquare size={15} />
            בנה תרגיל מאפס
          </button>
          <span className="text-gray-600 text-xs mr-1">
            {buildMode === 'scratch' ? 'תתאר, סדן תבנה' : 'סדן מציעה 3 אפשרויות'}
          </span>
        </div>

        {buildMode === 'scratch' ? (
          /* מצב "בנה מאפס" — הנחיה */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-demo-gold mx-auto flex items-center justify-center text-2xl font-black text-black">ס</div>
              <h3 className="text-white font-bold text-lg">הצ׳אט פתוח →</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                תאר לסדן מה אתה צריך. היא תשאל שאלות ותבנה את המתווה המותאם אישית לך.
              </p>
              <button
                onClick={() => setBuildMode('ready')}
                className="text-demo-gold text-sm underline hover:no-underline"
              >
                חזור לבחירת מתווה מוכן
              </button>
            </div>
          </div>
        ) : (
          /* מצב "בחר מתווה" — 3 כרטיסים */
          <div className="flex-1 min-h-0 px-5 py-4">
            <div className="grid grid-cols-3 gap-4 h-full">
              {PLANS.map((plan, planIdx) => {
                const isSelected = selected === plan.id
                const story = STORIES[plan.id] || plan.story
                return (
                  <div
                    key={plan.id}
                    style={{ animationDelay: `${planIdx * 80}ms` }}
                    onClick={() => setSelected(plan.id)}
                    className={`
                      flex flex-col rounded-2xl border-2 cursor-pointer transition-all overflow-hidden animate-fade-up
                      ${isSelected
                        ? 'border-demo-gold shadow-2xl shadow-demo-gold/20 scale-[1.01]'
                        : 'border-demo-border hover:border-gray-500 bg-demo-surface'
                      }
                    `}
                  >
                    {/* Header כרטיס */}
                    <div className={`px-4 pt-4 pb-2 ${isSelected ? 'bg-demo-gold/5' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <Badge color={plan.tagColor}>{plan.tag}</Badge>
                        <div className="text-center">
                          <div className={`text-2xl font-black
                            ${plan.score >= 85 ? 'text-demo-gold' : plan.score >= 75 ? 'text-demo-success' : 'text-gray-400'}`}>
                            {plan.score}
                          </div>
                          <div className="text-[11px] text-gray-500">ציון</div>
                        </div>
                      </div>
                      <h3 className="text-white font-bold text-base">{plan.name}</h3>
                    </div>

                    {/* מפה מוקטנת */}
                    <div className="px-4 py-2">
                      <MiniMap plan={plan} isSelected={isSelected} />
                    </div>

                    {/* פרטים */}
                    <div className="px-4 pb-3 flex-1 space-y-2">
                      {/* סיפור — UPGRADE-003 */}
                      <p className="text-gray-300 text-xs leading-relaxed border-r-2 border-demo-gold/40 pr-2">{story}</p>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={12} />{plan.duration}</span>
                        <span className={`flex items-center gap-1
                          ${plan.riskColor === 'red' ? 'text-demo-danger' : plan.riskColor === 'orange' ? 'text-demo-warning' : 'text-demo-success'}`}>
                          <AlertTriangle size={12} />סיכון {plan.risk}
                        </span>
                      </div>

                      {/* RULES-001: מתווה 3 — insight ניווט לילה */}
                      {plan.id === 'plan_3' && isSelected && (
                        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg px-2 py-1.5 text-[11px] text-blue-300">
                          💡 ניווט לילה היה חולשה באימון האחרון (ציון 78). מתווה זה מתרגל בדיוק את זה.
                        </div>
                      )}

                      {/* אמל"ח */}
                      <div className="flex flex-wrap gap-1">
                        {plan.ammo.map(a => (
                          <span key={a} className="bg-demo-card text-gray-400 text-[11px] px-2 py-0.5 rounded-full border border-demo-border">{a}</span>
                        ))}
                      </div>
                    </div>

                    {/* סימון בחירה */}
                    {isSelected && (
                      <div className="bg-demo-gold/10 border-t border-demo-gold/30 px-4 py-2 flex items-center justify-center gap-2">
                        <Star size={14} className="text-demo-gold fill-demo-gold" />
                        <span className="text-demo-gold text-xs font-bold">נבחר</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        {buildMode === 'ready' && (
          <div className="px-6 py-4 border-t border-demo-border flex items-center justify-between bg-demo-surface flex-shrink-0">
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
        )}
      </div>
    </div>
  )
}

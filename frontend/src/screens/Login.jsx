import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VALID_CODE = '5236521'

export default function Login() {
  const navigate = useNavigate()
  const [code, setCode]     = useState('')
  const [error, setError]   = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (code === VALID_CODE) {
      setLoading(true)
      setTimeout(() => navigate('/field-selection'), 800)
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-demo-bg flex flex-col items-center justify-center animate-fade-in" dir="rtl">

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #c6953b 0, #c6953b 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-demo-gold to-yellow-600 flex items-center justify-center shadow-2xl shadow-demo-gold/30">
            <span className="text-4xl font-black text-black">ס</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black text-white tracking-widest">SADAN</h1>
            <p className="text-demo-gold text-sm font-medium mt-1">מערכת תכנון ותיאום אימונים</p>
            <p className="text-gray-600 text-xs mt-0.5">גרסה 1.0 — סודי</p>
          </div>
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className="w-full bg-demo-surface border border-demo-border rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
          <div>
            <label className="text-gray-400 text-sm font-medium block mb-2">מספר אישי</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="הכנס מספר אישי"
              maxLength={10}
              autoFocus
              className={`
                w-full bg-demo-card border rounded-xl px-4 py-3 text-white text-lg font-bold text-center
                tracking-widest focus:outline-none focus:ring-2 transition-all
                ${error
                  ? 'border-demo-danger ring-demo-danger/30 animate-pulse'
                  : 'border-demo-border focus:ring-demo-gold focus:border-demo-gold'
                }
              `}
            />
            {error && (
              <p className="text-demo-danger text-xs text-center mt-2 font-medium">מספר אישי שגוי</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!code || loading}
            className="w-full py-3 bg-gradient-to-l from-demo-gold to-yellow-500 text-black font-bold text-base rounded-xl
              hover:opacity-90 transition-all shadow-lg shadow-demo-gold/20
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                מתחבר...
              </span>
            ) : 'כניסה למערכת'}
          </button>
        </form>

        <p className="text-gray-700 text-xs">מערכת מאובטחת — לשימוש מורשים בלבד</p>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import ProgressBar from './ProgressBar'

export default function Header({ currentPath, userName = 'רס"ן כהן' }) {
  const navigate = useNavigate()

  return (
    <header className="bg-demo-bg border-b border-demo-border">
      {/* Top bar — RTL: משתמש/יציאה ימינה, לוגו שמאלה */}
      <div className="flex items-center justify-between px-5 py-2" dir="rtl">

        {/* User + logout — ראשון ב-DOM = ימין ב-RTL */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-demo-gold/20 border border-demo-gold/40 flex items-center justify-center text-xs font-bold text-demo-gold">
              {userName.charAt(0)}
            </div>
            <span className="text-white text-sm font-semibold">{userName}</span>
          </div>
          <div className="w-px h-5 bg-demo-border" />
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-demo-danger text-sm transition-colors px-2 py-1 rounded-lg hover:bg-demo-danger/10"
          >
            <LogOut size={14} />
            <span>יציאה</span>
          </button>
        </div>

        {/* Logo — שני ב-DOM = שמאל ב-RTL */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/area')}>
          <div>
            <div className="text-white font-bold text-sm leading-none text-left">SADAN</div>
            <div className="text-gray-500 text-[10px] text-left">מערכת תכנון אימונים</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-demo-gold flex items-center justify-center font-bold text-black text-sm">ס</div>
        </div>

      </div>

      {/* Progress */}
      <ProgressBar currentPath={currentPath} />
    </header>
  )
}

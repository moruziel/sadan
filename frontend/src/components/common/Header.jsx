import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronLeft } from 'lucide-react'
import ProgressBar from './ProgressBar'

export default function Header({ currentPath, userName = 'רס"ן כהן' }) {
  const navigate = useNavigate()

  return (
    <header className="bg-demo-bg border-b border-demo-border">
      {/* Top bar — pr-16 keeps the fixed VoiceStatusOrb (top-right) from
          overlapping the back/user/logout cluster */}
      <div className="flex items-center justify-between pl-4 pr-16 py-2" dir="rtl">

        {/* ימין: חזרה + user + logout */}
        <div className="flex items-center gap-1 md:gap-2 min-w-0">

          {/* חזרה — תמיד נראה */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors px-2 py-1.5 rounded-lg hover:bg-demo-card border border-transparent hover:border-demo-border flex-shrink-0"
            title="חזרה לדף הקודם"
          >
            <ChevronLeft size={16} />
            <span className="hidden md:inline text-xs font-medium">חזרה</span>
          </button>

          <div className="hidden md:block w-px h-5 bg-demo-border" />

          {/* user */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-demo-gold/20 border border-demo-gold/40 flex items-center justify-center text-xs font-bold text-demo-gold flex-shrink-0">
              {userName.charAt(0)}
            </div>
            <span className="hidden sm:inline text-white text-sm font-semibold truncate">{userName}</span>
          </div>

          <div className="hidden md:block w-px h-5 bg-demo-border" />

          {/* logout — ends the whole demo session: voice off, auth cleared, back to login */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('sadan:logout'))
              sessionStorage.removeItem('sadan_authenticated')
              navigate('/')
            }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-demo-danger text-sm transition-colors px-2 py-1 rounded-lg hover:bg-demo-danger/10 flex-shrink-0"
          >
            <LogOut size={14} />
            <span className="hidden md:inline">יציאה</span>
          </button>
        </div>

        {/* שמאל: לוגו */}
        <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate('/area')}>
          <div className="hidden sm:block">
            <div className="text-white font-bold text-sm leading-none text-left">SADAN</div>
            <div className="hidden md:block text-gray-500 text-xs text-left">מערכת תכנון אימונים</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-demo-gold flex items-center justify-center font-bold text-black text-sm flex-shrink-0">ס</div>
        </div>

      </div>

      {/* Progress */}
      <ProgressBar currentPath={currentPath} />
    </header>
  )
}

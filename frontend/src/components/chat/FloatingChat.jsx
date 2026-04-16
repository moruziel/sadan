import { useState } from 'react'
import { MessageSquare, X, Mic, Volume2, Send } from 'lucide-react'

/**
 * FloatingChat — חלון צ'אט צף שמופיע בכל מסך בדמו.
 * שלב נוכחי: skeleton בלבד. חיבור ל-backend ב-TASK-014.
 */
export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')

  return (
    <>
      {/* כפתור פתיחה */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-[#c6953b] hover:bg-[#b5842a] text-black font-bold px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105"
          title="פתח צ'אט עם סדן"
        >
          <MessageSquare size={20} />
          <span className="font-bold text-sm">סדן</span>
        </button>
      )}

      {/* פאנל צ'אט */}
      {open && (
        <div className="fixed bottom-6 left-6 z-50 w-80 h-[480px] bg-[#111827] border border-[#c6953b]/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden" dir="rtl">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0c1117] border-b border-[#c6953b]/20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#c6953b] flex items-center justify-center text-xs font-bold text-black">ס</div>
              <span className="text-white font-bold text-sm">סדן — עוזר תכנון</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="bg-[#1f2937] rounded-xl rounded-tr-sm px-3 py-2 text-sm text-gray-200 max-w-[85%]">
              שלום. אני סדן. אשמח לענות על שאלות, לעדכן את תיק התרגיל, או לסייע בתיאום.
            </div>
          </div>

          {/* Input */}
          {/* Input — ב-RTL: שלח ימינה, מיקרופון/קול שמאלה */}
          <div className="px-3 py-3 border-t border-gray-700 flex items-center gap-2">
            <button
              disabled={!input.trim()}
              className="text-[#c6953b] hover:text-white disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <Send size={18} />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="שאל שאלה..."
              className="flex-1 bg-[#1f2937] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#c6953b] placeholder:text-gray-500"
              dir="rtl"
            />
            <button className="text-gray-400 hover:text-[#c6953b] transition-colors flex-shrink-0" title="דיבור">
              <Mic size={18} />
            </button>
            <button className="text-gray-400 hover:text-[#c6953b] transition-colors flex-shrink-0" title="הקראה">
              <Volume2 size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

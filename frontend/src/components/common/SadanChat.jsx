import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Mic, MicOff, Volume2, Send, Loader } from 'lucide-react'

const API = 'http://localhost:8000/api/voice'

// ── פונקציות API ──────────────────────────────────────────
async function apiChat(text, withAudio = true) {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, with_audio: withAudio }),
  })
  if (!res.ok) throw new Error(`chat error ${res.status}`)
  return res.json()   // { reply, audio_base64, source }
}

async function apiSTT(audioBase64, format = 'webm') {
  const res = await fetch(`${API}/stt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_base64: audioBase64, format }),
  })
  if (!res.ok) throw new Error(`stt error ${res.status}`)
  return res.json()   // { text }
}

// ── השמעת אודיו מ-base64 ─────────────────────────────────
function playAudioBase64(base64) {
  const audio = new Audio(`data:audio/mp3;base64,${base64}`)
  audio.play().catch(e => console.warn('audio play failed:', e))
  return audio
}

// ── הודעה בצ'אט ─────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#c6953b] flex items-center justify-center text-xs font-bold text-black ml-2 flex-shrink-0 mt-0.5">
          ס
        </div>
      )}
      <div
        className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-[#1f2937] text-gray-200 rounded-tr-sm'
            : 'bg-[#c6953b]/15 border border-[#c6953b]/30 text-gray-100 rounded-tl-sm'
          }`}
        dir="rtl"
      >
        {msg.content}
        {msg.isAudio && (
          <span className="inline-block mr-1 text-[10px] text-[#c6953b] opacity-60">🎤</span>
        )}
      </div>
    </div>
  )
}

// ── אנימציית waveform בזמן הקלטה ─────────────────────────
function Waveform({ active }) {
  return (
    <div className="flex items-center gap-0.5 h-5">
      {[3, 5, 8, 5, 9, 4, 7, 3, 6, 5, 8, 4].map((h, i) => (
        <div
          key={i}
          style={{
            height: active ? `${h * 2}px` : '4px',
            animationDelay: `${i * 60}ms`,
            transition: 'height 0.2s ease',
          }}
          className={`w-0.5 bg-[#c6953b] rounded-full ${active ? 'animate-pulse' : 'opacity-30'}`}
        />
      ))}
    </div>
  )
}

// ── הקומפוננטה הראשית ─────────────────────────────────────
export default function SadanChat({ autoOpen = false }) {
  const [open, setOpen]             = useState(autoOpen)
  const [messages, setMessages]     = useState([
    {
      id: 0,
      role: 'assistant',
      content: 'שלום. אני סדן — מערכת תכנון ותיאום אימונים. אפשר לשאול אותי כל שאלה על התרגיל, לבקש עדכון סטטוס, או להגיד לי מה לעשות.',
    },
  ])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [recording, setRecording]   = useState(false)
  const [speaking, setSpeaking]     = useState(false)
  const [error, setError]           = useState(null)

  const mediaRecorder = useRef(null)
  const audioChunks   = useRef([])
  const messagesEnd   = useRef(null)
  const currentAudio  = useRef(null)
  const inputRef      = useRef(null)

  // גלול לתחתית בכל הודעה חדשה
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // פתיחה אוטומטית
  useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])

  // פתיחה מ-event חיצוני (כפתור "בנה מאפס" ב-Plans)
  useEffect(() => {
    function handleExternalOpen() { setOpen(true) }
    window.addEventListener('sadanOpen', handleExternalOpen)
    return () => window.removeEventListener('sadanOpen', handleExternalOpen)
  }, [])

  function addMessage(role, content, extra = {}) {
    setMessages(prev => [
      ...prev,
      { id: Date.now() + Math.random(), role, content, ...extra },
    ])
  }

  // ── שליחת טקסט ─────────────────────────────────────────
  const sendText = useCallback(async (text) => {
    if (!text.trim() || loading) return
    const trimmed = text.trim()
    setInput('')
    setError(null)
    addMessage('user', trimmed)
    setLoading(true)

    try {
      const data = await apiChat(trimmed, true)
      addMessage('assistant', data.reply)

      // השמע תגובה קולית אם קיבלנו אודיו
      if (data.audio_base64) {
        setSpeaking(true)
        if (currentAudio.current) currentAudio.current.pause()
        const audio = playAudioBase64(data.audio_base64)
        currentAudio.current = audio
        audio.onended = () => setSpeaking(false)
      }
    } catch (e) {
      console.error('chat error:', e)
      setError('שגיאה בתקשורת עם השרת')
      addMessage('assistant', 'מצטער, הייתה שגיאה. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }, [loading])

  // ── הקלטה מהמיקרופון ───────────────────────────────────
  const startRecording = useCallback(async () => {
    if (recording) return
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunks.current = []

      mr.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob   = new Blob(audioChunks.current, { type: 'audio/webm' })
        const buffer = await blob.arrayBuffer()
        const bytes  = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        const b64 = btoa(binary)

        setLoading(true)
        try {
          const { text } = await apiSTT(b64, 'webm')
          if (text?.trim()) {
            addMessage('user', text, { isAudio: true })
            // שלח לצ'אט
            const data = await apiChat(text, true)
            addMessage('assistant', data.reply)
            if (data.audio_base64) {
              setSpeaking(true)
              if (currentAudio.current) currentAudio.current.pause()
              const audio = playAudioBase64(data.audio_base64)
              currentAudio.current = audio
              audio.onended = () => setSpeaking(false)
            }
          } else {
            setError('לא זיהיתי דיבור — נסה שוב')
          }
        } catch (e) {
          console.error('stt error:', e)
          setError('שגיאה בזיהוי קול')
        } finally {
          setLoading(false)
        }
      }

      mr.start()
      mediaRecorder.current = mr
      setRecording(true)
    } catch (e) {
      console.error('mic error:', e)
      setError('אין גישה למיקרופון')
    }
  }, [recording])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop()
      mediaRecorder.current = null
      setRecording(false)
    }
  }, [recording])

  const toggleRecording = () => {
    if (recording) stopRecording()
    else startRecording()
  }

  const stopSpeaking = () => {
    if (currentAudio.current) {
      currentAudio.current.pause()
      currentAudio.current = null
    }
    setSpeaking(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendText(input)
    }
  }

  return (
    <>
      {/* ── כפתור פתיחה ─────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 left-6 z-50 flex items-center gap-2 bg-[#c6953b] hover:bg-[#b5842a]
                     text-black font-bold px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105"
          title="פתח צ'אט עם סדן"
        >
          <MessageSquare size={20} />
          <span className="text-sm">סדן</span>
        </button>
      )}

      {/* ── פאנל צ'אט ───────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-0 left-0 top-0 z-50 flex flex-col"
          style={{ width: '350px' }}
          dir="rtl"
        >
          {/* backdrop blur כשפתוח */}
          <div
            className="absolute inset-0 bg-[#0c1117]/95 border-r border-[#c6953b]/20 shadow-2xl"
            style={{ backdropFilter: 'blur(4px)' }}
          />

          {/* תוכן הפאנל */}
          <div className="relative flex flex-col h-full">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0c1117] border-b border-[#c6953b]/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#c6953b] flex items-center justify-center text-sm font-bold text-black">
                  ס
                </div>
                <div>
                  <div className="text-white font-bold text-sm">סדן</div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${loading ? 'bg-yellow-400 animate-pulse' : speaking ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
                    {loading ? 'מעבד...' : speaking ? 'מדברת...' : 'זמינה'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* הודעות */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0">
              {messages.map(msg => (
                <ChatBubble key={msg.id} msg={msg} />
              ))}
              {loading && (
                <div className="flex justify-end mb-3">
                  <div className="w-7 h-7 rounded-full bg-[#c6953b] flex items-center justify-center text-xs font-bold text-black ml-2 flex-shrink-0">
                    ס
                  </div>
                  <div className="bg-[#c6953b]/15 border border-[#c6953b]/30 px-3 py-2 rounded-2xl rounded-tl-sm">
                    <Loader size={14} className="text-[#c6953b] animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>

            {/* שגיאה */}
            {error && (
              <div className="mx-3 mb-2 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-xs text-right flex-shrink-0">
                ⚠️ {error}
              </div>
            )}

            {/* הקלטה פעילה */}
            {recording && (
              <div className="mx-3 mb-2 px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center justify-between flex-shrink-0">
                <span className="text-red-400 text-xs font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
                  מקליט...
                </span>
                <Waveform active={recording} />
                <button
                  onClick={stopRecording}
                  className="text-red-400 hover:text-red-300 text-xs font-bold"
                >
                  עצור
                </button>
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-800 flex items-center gap-2 flex-shrink-0 bg-[#0c1117]">
              {/* כפתור שליחה */}
              <button
                onClick={() => sendText(input)}
                disabled={!input.trim() || loading}
                className="text-[#c6953b] hover:text-white disabled:opacity-30 transition-colors flex-shrink-0 p-1"
                title="שלח"
              >
                <Send size={18} />
              </button>

              {/* שדה קלט */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={recording ? 'מקליט...' : 'שאל שאלה...'}
                disabled={recording || loading}
                className="flex-1 bg-[#1f2937] text-white text-sm rounded-xl px-3 py-2
                           focus:outline-none focus:ring-1 focus:ring-[#c6953b]
                           placeholder:text-gray-500 disabled:opacity-50"
                dir="rtl"
              />

              {/* מיקרופון */}
              <button
                onClick={toggleRecording}
                disabled={loading}
                className={`flex-shrink-0 p-1.5 rounded-full transition-all
                  ${recording
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-gray-400 hover:text-[#c6953b]'
                  }`}
                title={recording ? 'עצור הקלטה' : 'התחל הקלטה'}
              >
                {recording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* עצור השמעה */}
              {speaking && (
                <button
                  onClick={stopSpeaking}
                  className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-300 transition-colors animate-pulse"
                  title="עצור השמעה"
                >
                  <Volume2 size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

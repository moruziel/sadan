import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, ChevronLeft, Mic, MicOff, Volume2, Send, Loader } from 'lucide-react'

const API_REST = 'http://localhost:8000/api/voice'
const WS_URL   = 'ws://localhost:8000/gemini-voice/ws'
const NUM_BARS = 12

// ── REST fallback for text input ─────────────────────────
async function apiChatText(text) {
  const res = await fetch(`${API_REST}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, with_audio: false }),
  })
  if (!res.ok) throw new Error(`chat error ${res.status}`)
  return res.json()   // { reply, source }
}

// ── Message bubble ────────────────────────────────────────
function ChatBubble({ msg }) {
  if (msg.role === 'system') {
    return (
      <div className="flex justify-center mb-3">
        <div className="px-3 py-1.5 bg-green-900/30 border border-green-500/30 rounded-full text-green-400 text-xs" dir="rtl">
          {msg.content}
        </div>
      </div>
    )
  }
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
      </div>
    </div>
  )
}

// ── Live waveform — reads real audio levels from AnalyserNode ─────────────────
function LiveWaveform({ analyserRef, active }) {
  const [bars, setBars] = useState(Array(NUM_BARS).fill(4))
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active) {
      setBars(Array(NUM_BARS).fill(4))
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    let dataArray = null

    function tick() {
      if (!analyserRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      if (!dataArray) {
        dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      }
      analyserRef.current.getByteFrequencyData(dataArray)
      const bucketSize = Math.floor(dataArray.length / NUM_BARS)
      const newBars = Array.from({ length: NUM_BARS }, (_, i) => {
        let sum = 0
        for (let j = i * bucketSize; j < (i + 1) * bucketSize; j++) sum += dataArray[j]
        return Math.max(4, Math.min(30, (sum / bucketSize) / 3.5))
      })
      setBars(newBars)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, analyserRef])

  return (
    <div className="flex items-end justify-center gap-0.5" style={{ height: '32px' }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}px`, transition: 'height 0.07s ease' }}
          className={`w-1 rounded-full ${active ? 'bg-[#c6953b]' : 'bg-gray-600 opacity-20'}`}
        />
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export default function SadanChat({ autoOpen = false }) {
  const [open, setOpen]           = useState(autoOpen)
  const [messages, setMessages]   = useState([{
    id: 0,
    role: 'assistant',
    content: 'שלום. אני סדן — לחץ על המיקרופון לשיחה קולית, או כתוב שאלה.',
  }])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [connected, setConnected] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking]   = useState(false)
  const [error, setError]         = useState(null)

  // Audio refs
  const wsRef           = useRef(null)
  const micContextRef   = useRef(null)
  const playContextRef  = useRef(null)
  const processorRef    = useRef(null)
  const analyserRef     = useRef(null)
  const micStreamRef    = useRef(null)
  const nextPlayTime    = useRef(0)
  const activeSources   = useRef([])
  const messagesEnd     = useRef(null)
  // Transcript accumulation — tracks the id of the "live" bubble per role
  const liveTranscript  = useRef({ user: null, assistant: null })

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])

  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener('sadanOpen', handleOpen)
    return () => window.removeEventListener('sadanOpen', handleOpen)
  }, [])

  // Toggle body class → compresses .sadan-main-content into remaining space
  useEffect(() => {
    if (open) {
      const scale = (window.innerWidth - 350) / window.innerWidth
      document.documentElement.style.setProperty('--sadan-scale', scale)
    }
    document.body.classList.toggle('sadan-chat-open', open)
    return () => document.body.classList.remove('sadan-chat-open')
  }, [open])

  // cleanup on unmount
  useEffect(() => () => teardown(), [])

  function addMessage(role, content) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, content }])
  }

  // Transcript: accumulate partial chunks into a live bubble, finalize on turn_complete
  function handleTranscript(role, text, final) {
    const existingId = liveTranscript.current[role]
    if (existingId) {
      // Update existing live bubble
      setMessages(prev => prev.map(m =>
        m.id === existingId ? { ...m, content: m.content + text } : m
      ))
      if (final) liveTranscript.current[role] = null
    } else {
      // New bubble
      const id = Date.now() + Math.random()
      setMessages(prev => [...prev, { id, role, content: text }])
      if (!final) liveTranscript.current[role] = id
    }
  }

  // ── PCM 24kHz scheduled playback ─────────────────────
  function schedulePCM(buffer) {
    if (!playContextRef.current || playContextRef.current.state === 'closed') {
      playContextRef.current = new AudioContext({ sampleRate: 24000 })
    }
    const ctx = playContextRef.current
    const int16 = new Int16Array(buffer)
    if (int16.length === 0) return

    const f32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768.0

    const ab = ctx.createBuffer(1, f32.length, 24000)
    ab.getChannelData(0).set(f32)

    const src = ctx.createBufferSource()
    src.buffer = ab
    src.connect(ctx.destination)

    const now = ctx.currentTime
    const startAt = Math.max(now, nextPlayTime.current)
    src.start(startAt)
    nextPlayTime.current = startAt + ab.duration

    activeSources.current.push(src)
    setSpeaking(true)
    src.onended = () => {
      activeSources.current = activeSources.current.filter(s => s !== src)
      if (activeSources.current.length === 0) setSpeaking(false)
    }
  }

  function stopPlayback() {
    activeSources.current.forEach(s => { try { s.stop() } catch (_) {} })
    activeSources.current = []
    if (playContextRef.current) nextPlayTime.current = playContextRef.current.currentTime
    setSpeaking(false)
  }

  // ── Connect / Disconnect ──────────────────────────────
  function teardown() {
    stopPlayback()
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null }
    if (micContextRef.current) { micContextRef.current.close(); micContextRef.current = null }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    analyserRef.current = null
    nextPlayTime.current = 0
  }

  const connectVoice = useCallback(async () => {
    if (connected) return
    setError(null)
    try {
      // Mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream

      // AudioContext 16kHz for capture
      const micCtx = new AudioContext({ sampleRate: 16000 })
      micContextRef.current = micCtx
      const source = micCtx.createMediaStreamSource(stream)

      // Analyser for live waveform
      const analyser = micCtx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      // ScriptProcessor → raw PCM Int16 chunks → WebSocket
      const processor = micCtx.createScriptProcessor(4096, 1, 1)
      source.connect(processor)
      processor.connect(micCtx.destination)
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return
        const f32 = e.inputBuffer.getChannelData(0)
        const i16 = new Int16Array(f32.length)
        for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768))
        wsRef.current.send(i16.buffer)
      }
      processorRef.current = processor

      // WebSocket
      const ws = new WebSocket(WS_URL)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => { setConnected(true); setListening(true) }

      ws.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) {
          schedulePCM(e.data)
        } else if (typeof e.data === 'string') {
          try {
            const msg = JSON.parse(e.data)
            if (msg.type === 'interrupted') {
              stopPlayback()
              liveTranscript.current.assistant = null  // discard partial
            } else if (msg.type === 'transcript') {
              handleTranscript(msg.role, msg.text, msg.final)
            } else if (msg.type === 'whatsapp_sent') {
              setMessages(prev => [...prev, {
                id: Date.now() + Math.random(),
                role: 'system',
                content: `📱 וואטסאפ נשלח: "${msg.message}"`,
              }])
            }
          } catch (_) {}
        }
      }

      ws.onclose  = () => { setConnected(false); setListening(false); setSpeaking(false) }
      ws.onerror  = () => { setError('שגיאת חיבור — בדוק שהשרת פועל'); setConnected(false); setListening(false) }

    } catch (e) {
      console.error('connectVoice:', e)
      setError('אין גישה למיקרופון')
    }
  }, [connected])

  const disconnectVoice = useCallback(() => {
    teardown()
    setConnected(false)
    setListening(false)
  }, [])

  const toggleVoice = () => connected ? disconnectVoice() : connectVoice()

  // ── Text send ─────────────────────────────────────────
  const sendText = useCallback(async (text) => {
    if (!text.trim() || loading) return
    const trimmed = text.trim()
    setInput('')
    setError(null)
    addMessage('user', trimmed)
    setLoading(true)
    try {
      const data = await apiChatText(trimmed)
      addMessage('assistant', data.reply)
    } catch (e) {
      setError('שגיאה בתקשורת עם השרת')
    } finally {
      setLoading(false)
    }
  }, [loading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(input) }
  }

  // Status
  const statusLabel = speaking ? 'סדן מדבר...' : listening ? 'מקשיב...' : 'לחץ מיקרופון'
  const statusDot   = speaking ? 'bg-blue-400 animate-pulse' : listening ? 'bg-green-400 animate-pulse' : 'bg-gray-500'

  return (
    <>
      {/* ── כפתור פתיחה — נראה רק כשהפאנל סגור ─────────── */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 left-6 z-40 flex items-center gap-2 bg-[#c6953b] hover:bg-[#b5842a]
                   text-black font-bold px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105
                   ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ transition: 'opacity 0.2s ease' }}
      >
        <MessageSquare size={20} />
        <span className="text-sm">סדן</span>
      </button>

      {/* ── פאנל צ'אט — תמיד ב-DOM, מחליק פנימה/החוצה ──── */}
      <div
        className={`sadan-panel fixed bottom-0 left-0 top-0 z-50 flex flex-col ${open ? 'open' : ''}`}
        style={{ width: '350px' }}
        dir="rtl"
      >
          <div
            className="absolute inset-0 bg-[#0c1117]/95 border-r border-[#c6953b]/20 shadow-2xl"
            style={{ backdropFilter: 'blur(4px)' }}
          />

          <div className="relative flex flex-col h-full">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0c1117] border-b border-[#c6953b]/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#c6953b] flex items-center justify-center text-sm font-bold text-black">ס</div>
                <div>
                  <div className="text-white font-bold text-sm">סדן</div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusDot}`} />
                    {statusLabel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { disconnectVoice(); setOpen(false) }}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10 text-xs"
              >
                <ChevronLeft size={15} />
                סגור
              </button>
            </div>

            {/* הודעות */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
              {loading && (
                <div className="flex justify-end mb-3">
                  <div className="w-7 h-7 rounded-full bg-[#c6953b] flex items-center justify-center text-xs font-bold text-black ml-2">ס</div>
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

            {/* Waveform — מוצגת כשמחובר */}
            {connected && (
              <div className="mx-3 mb-2 px-4 py-3 bg-[#111827] border border-[#c6953b]/20 rounded-xl flex flex-col items-center gap-1 flex-shrink-0">
                <LiveWaveform analyserRef={analyserRef} active={listening && !speaking} />
                <span className="text-[10px] text-gray-500 mt-0.5">
                  {speaking ? '💬 סדן מדבר' : '🎙️ מקשיב — דבר עכשיו'}
                </span>
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-800 flex items-center gap-2 flex-shrink-0 bg-[#0c1117]">
              {/* שלח */}
              <button
                onClick={() => sendText(input)}
                disabled={!input.trim() || loading}
                className="text-[#c6953b] hover:text-white disabled:opacity-30 transition-colors flex-shrink-0 p-1"
                title="שלח"
              >
                <Send size={18} />
              </button>

              {/* שדה טקסט */}
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="כתוב שאלה..."
                disabled={loading}
                className="flex-1 bg-[#1f2937] text-white text-sm rounded-xl px-3 py-2
                           focus:outline-none focus:ring-1 focus:ring-[#c6953b]
                           placeholder:text-gray-500 disabled:opacity-50"
                dir="rtl"
              />

              {/* מיקרופון */}
              <button
                onClick={toggleVoice}
                className={`flex-shrink-0 p-1.5 rounded-full transition-all
                  ${connected
                    ? 'bg-[#c6953b]/20 text-[#c6953b] ring-1 ring-[#c6953b]/40'
                    : 'text-gray-400 hover:text-[#c6953b]'
                  }`}
                title={connected ? 'נתק שיחה קולית' : 'התחל שיחה קולית'}
              >
                {connected ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              {/* עצור השמעה */}
              {speaking && (
                <button
                  onClick={stopPlayback}
                  className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-300 transition-colors animate-pulse"
                  title="עצור השמעה"
                >
                  <Volume2 size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
    </>
  )
}

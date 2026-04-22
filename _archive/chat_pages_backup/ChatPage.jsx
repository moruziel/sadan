import { useState, useRef, useEffect } from 'react'
import Header from '../components/Header'
import MessageBubble from '../components/MessageBubble'
import ChatInput from '../components/ChatInput'
import TypingIndicator from '../components/TypingIndicator'
import { sendMessage } from '../api/sadan'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `# ברוכים הבאים למערכת SADAN

מערכת **סדן** היא מערכת AI לתכנון ותיאום אימונים צבאיים.

כדי להתחיל, ספר לי:
- מה היחידה שלך (מחלקה / פלוגה / גדוד)?
- מה מטרת האימון?
- מה משך הזמן הרצוי?

אני אסייע לך לתכנן אימון מקצועי מקצה לקצה.`,
  agentName: 'training_planner',
  timestamp: new Date().toISOString(),
}

export default function ChatPage() {
  const [messages, setMessages]   = useState([WELCOME_MESSAGE])
  const [sessionId, setSessionId] = useState(null)
  const [flowStep, setFlowStep]   = useState('initial')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text) {
    setError(null)
    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const data = await sendMessage(text, sessionId)

      if (!sessionId) setSessionId(data.session_id)
      setFlowStep(data.flow_step)

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          agentName: data.agent_name,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (err) {
      setError('שגיאה בחיבור לשרת. ודא שה-backend פועל.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-idf-light">
      <Header flowStep={flowStep} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl w-full mx-auto">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div className="text-center mb-4">
            <span className="bg-red-100 text-red-700 text-sm px-4 py-2 rounded-lg">
              {error}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Session info bar */}
      {sessionId && (
        <div className="bg-gray-100 border-t border-gray-200 px-4 py-1 text-center">
          <span className="text-xs text-gray-400">
            Session: {sessionId.slice(0, 8)}...
          </span>
        </div>
      )}

      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  )
}

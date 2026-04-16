import AgentBadge from './AgentBadge'

function formatText(text) {
  // Convert markdown-like formatting to HTML
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, (match) =>
      match.startsWith('<') ? match : `<p>${match}</p>`
    )
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Agent badge */}
        {!isUser && message.agentName && (
          <div className="flex justify-end mb-1">
            <AgentBadge agentName={message.agentName} />
          </div>
        )}

        {/* Bubble */}
        <div className={`
          rounded-2xl px-4 py-3 shadow-sm
          ${isUser
            ? 'bg-idf-dark text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
          }
        `}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="text-sm leading-relaxed prose-rtl"
              dangerouslySetInnerHTML={{ __html: formatText(message.content) }}
            />
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}

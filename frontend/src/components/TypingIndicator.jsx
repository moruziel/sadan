export default function TypingIndicator({ agentName }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{agentName || 'SADAN'} מעבד...</span>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-idf-olive rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-idf-olive rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-idf-olive rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

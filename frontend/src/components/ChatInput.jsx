import { useState, useRef } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e)
    }
  }

  function handleInput(e) {
    setText(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 p-4 bg-white border-t border-gray-200">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="הקלד הודעה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
        rows={1}
        className="
          flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3
          text-sm text-right leading-relaxed bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-idf-olive focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          placeholder:text-gray-400
        "
        style={{ minHeight: '48px', maxHeight: '160px' }}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="
          flex-shrink-0 w-12 h-12 rounded-xl bg-idf-dark text-white
          flex items-center justify-center text-lg
          hover:bg-idf-green transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        {disabled ? (
          <span className="animate-spin text-sm">⟳</span>
        ) : (
          <span>↑</span>
        )}
      </button>
    </form>
  )
}

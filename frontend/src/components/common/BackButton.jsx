import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function BackButton({ to, label = 'חזרה' }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors"
    >
      <ChevronRight size={16} />
      {label}
    </button>
  )
}

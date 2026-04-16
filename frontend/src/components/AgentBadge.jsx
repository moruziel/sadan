const AGENT_CONFIG = {
  training_planner: {
    label: 'מתכנן אימונים',
    color: 'bg-idf-olive text-white',
    icon: '🎯',
  },
  exercise_file: {
    label: 'יוצר תיקי תרגיל',
    color: 'bg-blue-700 text-white',
    icon: '📋',
  },
  coordination: {
    label: 'סוכן תיאום',
    color: 'bg-orange-700 text-white',
    icon: '📡',
  },
  approval_tracker: {
    label: 'מעקב אישורים',
    color: 'bg-purple-700 text-white',
    icon: '✅',
  },
}

export default function AgentBadge({ agentName }) {
  const config = AGENT_CONFIG[agentName] || {
    label: agentName,
    color: 'bg-gray-600 text-white',
    icon: '🤖',
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

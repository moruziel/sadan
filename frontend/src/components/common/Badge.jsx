const COLORS = {
  gold:    'bg-demo-gold/20 text-demo-gold border-demo-gold/30',
  green:   'bg-demo-success/20 text-demo-success border-demo-success/30',
  red:     'bg-demo-danger/20 text-demo-danger border-demo-danger/30',
  orange:  'bg-demo-warning/20 text-demo-warning border-demo-warning/30',
  blue:    'bg-demo-info/20 text-demo-info border-demo-info/30',
  gray:    'bg-demo-card text-gray-400 border-demo-border',
}

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${COLORS[color]} ${className}`}>
      {children}
    </span>
  )
}

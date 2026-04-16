export default function Card({ children, className = '', onClick, gold = false }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-demo-surface border rounded-2xl p-4 transition-all
        ${gold ? 'border-demo-gold shadow-lg shadow-demo-gold/10' : 'border-demo-border'}
        ${onClick ? 'cursor-pointer hover:border-demo-gold' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export default function Button({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button', size = 'md' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all focus:outline-none'

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
    xl: 'px-10 py-4 text-lg',
  }

  const variants = {
    primary:   'bg-gradient-to-l from-demo-gold to-demo-gold-light text-black hover:opacity-90 shadow-lg shadow-demo-gold/20',
    secondary: 'bg-demo-card border border-demo-border text-gray-200 hover:border-demo-gold hover:text-white',
    danger:    'bg-demo-danger text-white hover:opacity-90',
    ghost:     'text-gray-400 hover:text-white hover:bg-demo-card',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

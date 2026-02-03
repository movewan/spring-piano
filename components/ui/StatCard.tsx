interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color?: 'primary' | 'secondary' | 'success' | 'warning'
  className?: string
}

const colorClasses = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-emerald-100 text-emerald-600',
  warning: 'bg-amber-100 text-amber-600',
}

export function StatCard({ icon, label, value, color = 'primary', className = '' }: StatCardProps) {
  return (
    <div className={`flex items-center gap-3 p-3 bg-white/50 rounded-xl ${className}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

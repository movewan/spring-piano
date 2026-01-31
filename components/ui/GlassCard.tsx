'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className = '', hover = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
        className={`
          bg-white/40 backdrop-blur-xl
          border border-white/30
          rounded-2xl shadow-lg
          ${hover ? 'cursor-pointer transition-shadow hover:shadow-xl' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

GlassCard.displayName = 'GlassCard'

export default GlassCard

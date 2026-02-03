'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TimelineItemProps {
  title: string
  subtitle?: string
  content: string
  videoUrl?: string | null
  badge?: string
  defaultExpanded?: boolean
}

export function TimelineItem({
  title,
  subtitle,
  content,
  videoUrl,
  badge,
  defaultExpanded = false
}: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-3 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 to-transparent last:hidden" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-primary flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary" />
      </div>

      {/* Content */}
      <div
        className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 overflow-hidden cursor-pointer hover:bg-white/80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-bold text-gray-900">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs">
                {badge}
              </span>
            )}
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4 border-t border-gray-100">
                {/* Video */}
                {videoUrl && (
                  <div className="mt-4 mb-4 rounded-xl overflow-hidden bg-black aspect-video">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full"
                    />
                  </div>
                )}

                {/* Content with markdown-like formatting */}
                <div className="mt-4 prose prose-sm max-w-none">
                  {content.split('\n').map((line, i) => {
                    // Bold headers (lines starting with >)
                    if (line.startsWith('> **')) {
                      const text = line.replace(/^> \*\*/, '').replace(/\*\*$/, '')
                      return (
                        <h4 key={i} className="text-sm font-bold text-gray-700 mt-3 mb-1">
                          {text}
                        </h4>
                      )
                    }
                    // Regular content
                    return line.trim() ? (
                      <p key={i} className="text-gray-600 text-sm leading-relaxed">
                        {line}
                      </p>
                    ) : null
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

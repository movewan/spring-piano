'use client'

import { useState, useEffect } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }) +
          ' ' +
          now.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="bg-white/40 backdrop-blur-xl border-b border-white/30 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{currentTime}</p>
        </div>
      </div>
    </header>
  )
}

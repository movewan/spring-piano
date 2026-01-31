'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard, Button } from '@/components/ui'

interface Child {
  id: string
  name: string
  school: string | null
  grade: number | null
  product: { name: string } | null
  schedules: Array<{
    day_of_week: number
    start_time: string
    teacher: { name: string; color: string }
  }>
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토']

export default function ParentDashboardPage() {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch('/api/parent/children')
        const data = await res.json()

        if (data.success) {
          setChildren(data.data.children)
        } else {
          if (res.status === 401) {
            router.push('/parent/login')
          }
        }
      } catch (error) {
        console.error('Failed to fetch children:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
  }, [router])

  const handleLogout = async () => {
    document.cookie = 'parent_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/parent/login')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">학부모 포털</h1>
            <p className="text-gray-500">이화피아노의봄</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>

        {/* Children Cards */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : children.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-500">등록된 자녀가 없습니다</p>
            <p className="text-sm text-gray-400 mt-2">
              학원에 문의해주세요
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {children.map((child, index) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg">
                          {child.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900">{child.name}</h2>
                        <p className="text-sm text-gray-500">
                          {child.school && `${child.school} `}
                          {child.grade && `${child.grade}학년`}
                        </p>
                      </div>
                    </div>
                    {child.product && (
                      <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm">
                        {child.product.name}
                      </span>
                    )}
                  </div>

                  {/* Schedule */}
                  {child.schedules.length > 0 && (
                    <div className="mb-4 p-3 bg-white/50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-2">수업 일정</p>
                      <div className="flex flex-wrap gap-2">
                        {child.schedules.map((schedule, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-lg text-sm text-white"
                            style={{ backgroundColor: schedule.teacher.color }}
                          >
                            {dayNames[schedule.day_of_week]} {schedule.start_time.slice(0, 5)} ({schedule.teacher.name})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Link href={`/parent/attendance?student=${child.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        출석 현황
                      </Button>
                    </Link>
                    <Link href={`/parent/feedback?student=${child.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        피드백
                      </Button>
                    </Link>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/30 px-4 py-3">
        <div className="max-w-lg mx-auto flex justify-around">
          <Link href="/parent/dashboard" className="flex flex-col items-center text-primary">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">홈</span>
          </Link>
          <Link href="/parent/attendance" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">출석</span>
          </Link>
          <Link href="/parent/feedback" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">피드백</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}

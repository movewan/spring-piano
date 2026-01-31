'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlassCard, Button, Input } from '@/components/ui'

interface Attendance {
  id: string
  check_in_time: string
  check_out_time: string | null
  student: { id: string; name: string }
}

function AttendanceContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const studentId = searchParams.get('student')

  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month: selectedMonth })
      if (studentId) params.set('student_id', studentId)

      const res = await fetch(`/api/parent/attendance?${params}`)
      const data = await res.json()

      if (data.success) {
        setAttendance(data.data.attendance)
      } else if (res.status === 401) {
        router.push('/parent/login')
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, studentId, router])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  // 날짜별로 그룹화
  const attendanceByDate = attendance.reduce((acc, a) => {
    const date = a.check_in_time.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(a)
    return acc
  }, {} as Record<string, Attendance[]>)

  // 캘린더 데이터 생성
  const year = parseInt(selectedMonth.slice(0, 4))
  const month = parseInt(selectedMonth.slice(5, 7))
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const calendarDays = []
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">출석 현황</h1>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-36"
          />
        </div>

        {/* Calendar */}
        <GlassCard className="p-4 mb-6">
          <div className="grid grid-cols-7 gap-1 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />
              }

              const dateStr = `${selectedMonth}-${day.toString().padStart(2, '0')}`
              const hasAttendance = attendanceByDate[dateStr]?.length > 0
              const isToday = dateStr === new Date().toISOString().split('T')[0]

              return (
                <motion.div
                  key={day}
                  whileHover={{ scale: 1.1 }}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm
                    ${hasAttendance ? 'bg-primary text-white font-bold' : ''}
                    ${isToday && !hasAttendance ? 'ring-2 ring-primary' : ''}
                    ${!hasAttendance ? 'text-gray-600' : ''}
                  `}
                >
                  {day}
                </motion.div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span className="text-sm text-gray-500">출석</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded ring-2 ring-primary" />
              <span className="text-sm text-gray-500">오늘</span>
            </div>
          </div>
        </GlassCard>

        {/* Attendance List */}
        <h2 className="font-bold text-gray-900 mb-3">출석 기록</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : attendance.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-gray-500">이 달의 출석 기록이 없습니다</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {attendance.map((a, index) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <GlassCard className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{a.student.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(a.check_in_time).toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">{formatTime(a.check_in_time)}</p>
                    <p className="text-xs text-gray-400">출석</p>
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
          <Link href="/parent/dashboard" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">홈</span>
          </Link>
          <Link href="/parent/attendance" className="flex flex-col items-center text-primary">
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

export default function ParentAttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <AttendanceContent />
    </Suspense>
  )
}

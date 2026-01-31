'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import SalesCard from '@/components/admin/SalesCard'
import { GlassCard } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalStudents: number
  activeStudents: number
  todayAttendance: number
  unpaidCount: number
}

interface RecentAttendance {
  id: string
  student_name: string
  check_in_time: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    todayAttendance: 0,
    unpaidCount: 0,
  })
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient()

      // 원생 통계
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      const { count: activeStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // 오늘 출석
      const today = new Date().toISOString().split('T')[0]
      const { count: todayAttendance } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('check_in_time', today)

      setStats({
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        todayAttendance: todayAttendance || 0,
        unpaidCount: 0,
      })

      // 최근 출석 (Realtime 구독)
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          id,
          check_in_time,
          students (name)
        `)
        .gte('check_in_time', today)
        .order('check_in_time', { ascending: false })
        .limit(10)

      if (attendanceData) {
        setRecentAttendance(
          attendanceData.map((a) => ({
            id: a.id,
            student_name: (a.students as unknown as { name: string })?.name || '알 수 없음',
            check_in_time: a.check_in_time,
          }))
        )
      }

      setLoading(false)
    }

    fetchDashboardData()

    // Realtime 구독
    const supabase = createClient()
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
        },
        async (payload) => {
          // 새 출석 시 학생 이름 조회
          const { data: student } = await supabase
            .from('students')
            .select('name')
            .eq('id', payload.new.student_id)
            .single()

          const newAttendance: RecentAttendance = {
            id: payload.new.id,
            student_name: student?.name || '알 수 없음',
            check_in_time: payload.new.check_in_time,
          }

          setRecentAttendance((prev) => [newAttendance, ...prev.slice(0, 9)])
          setStats((prev) => ({
            ...prev,
            todayAttendance: prev.todayAttendance + 1,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statCards = [
    {
      label: '전체 원생',
      value: stats.totalStudents,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: '활성 원생',
      value: stats.activeStudents,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: '오늘 출석',
      value: stats.todayAttendance,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      label: '미납',
      value: stats.unpaidCount,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <AdminLayout>
      <Header title="대시보드" subtitle="오늘의 학원 현황을 확인하세요" />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <div className={card.color}>{card.icon}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {loading ? '-' : card.value}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Sales Summary */}
        <div className="mb-8">
          <SalesCard />
        </div>

        {/* Recent Attendance */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">실시간 출석 현황</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              실시간 업데이트
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : recentAttendance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              오늘 출석 기록이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((attendance, index) => (
                <motion.div
                  key={attendance.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-white/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">
                        {attendance.student_name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {attendance.student_name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatTime(attendance.check_in_time)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </AdminLayout>
  )
}

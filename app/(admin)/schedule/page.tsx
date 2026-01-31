'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal, Select } from '@/components/ui'
import { getWeekDays, formatDateKorean, addWeeks, isSameDay } from '@/lib/utils/date'

interface Teacher {
  id: string
  name: string
  color: string
}

interface Schedule {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  student: { id: string; name: string }
  teacher: { id: string; name: string; color: string }
}

interface Student {
  id: string
  name: string
}

// 선생님별 색상 정의
const TEACHER_COLORS: Record<string, string> = {
  '보임쌤': '#7BC4C4',  // 민트
  '김쌤': '#FF7EB3',    // 핑크
  '이쌤': '#FFB347',    // 오렌지
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토']

// 10:00 ~ 19:00 (10분 단위, 총 54슬롯)
const timeSlots = Array.from({ length: 55 }, (_, i) => {
  const hour = Math.floor(i / 6) + 10 // 10:00 시작
  const minute = (i % 6) * 10 // 10분 단위
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

export default function SchedulePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1) // 오늘 요일
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [newSchedule, setNewSchedule] = useState({
    student_id: '',
    teacher_id: '',
    start_time: '14:00',
    end_time: '14:30',
  })

  const weekDays = getWeekDays(currentWeek)
  const today = new Date()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 주간 뷰일 때는 모든 요일의 스케줄을 가져옴
      const dayParam = viewMode === 'week' ? '' : `day=${selectedDay}`
      const [teachersRes, schedulesRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch(`/api/schedules?${dayParam}`),
      ])

      const teachersData = await teachersRes.json()
      const schedulesData = await schedulesRes.json()

      if (teachersData.success) {
        // 선생님 색상 적용
        const teachersWithColors = teachersData.data.teachers.map((t: Teacher) => ({
          ...t,
          color: TEACHER_COLORS[t.name] || t.color || '#7BC4C4'
        }))
        setTeachers(teachersWithColors)
      }
      if (schedulesData.success) setSchedules(schedulesData.data.schedules)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDay, viewMode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchStudents = async () => {
    const res = await fetch('/api/students?is_active=true&limit=100')
    const data = await res.json()
    if (data.success) {
      setStudents(data.data.students.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
    }
  }

  const openAddModal = () => {
    fetchStudents()
    setIsModalOpen(true)
  }

  const handleAddSchedule = async () => {
    if (!newSchedule.student_id || !newSchedule.teacher_id) {
      return
    }

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSchedule,
          day_of_week: selectedDay,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setIsModalOpen(false)
        setNewSchedule({
          student_id: '',
          teacher_id: '',
          start_time: '14:00',
          end_time: '14:30',
        })
        fetchData()
      } else {
        alert(data.error || '스케줄 추가에 실패했습니다')
      }
    } catch {
      alert('서버 오류가 발생했습니다')
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('이 스케줄을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        fetchData()
      }
    } catch {
      alert('삭제에 실패했습니다')
    }
  }

  const getScheduleForSlot = (teacherId: string, time: string, dayOfWeek?: number) => {
    return schedules.find(
      (s) =>
        s.teacher.id === teacherId &&
        s.start_time <= time &&
        s.end_time > time &&
        (dayOfWeek === undefined || s.day_of_week === dayOfWeek)
    )
  }

  const getScheduleHeight = (schedule: Schedule) => {
    const start = schedule.start_time.split(':').map(Number)
    const end = schedule.end_time.split(':').map(Number)
    const startMinutes = start[0] * 60 + start[1]
    const endMinutes = end[0] * 60 + end[1]
    return (endMinutes - startMinutes) / 10 // 10분 단위로 높이 계산
  }

  const getSchedulesForDay = (dayOfWeek: number) => {
    return schedules.filter((s) => s.day_of_week === dayOfWeek)
  }

  return (
    <AdminLayout>
      <Header
        title="스케줄 관리"
        subtitle={viewMode === 'week'
          ? `${formatDateKorean(weekDays[0])} ~ ${formatDateKorean(weekDays[6])}`
          : `${dayNames[selectedDay]}요일 시간표`
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        {/* View Mode Toggle & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* 뷰 모드 토글 */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                일간
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                주간
              </button>
            </div>

            {/* 주간 뷰: 주 이동 */}
            {viewMode === 'week' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentWeek(new Date())}
                >
                  오늘
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            )}

            {/* 일간 뷰: 요일 선택 */}
            {viewMode === 'day' && (
              <div className="flex gap-1">
                {dayNames.slice(1).concat(dayNames[0]).map((day, i) => {
                  const dayIndex = i === 6 ? 0 : i + 1
                  return (
                    <Button
                      key={day}
                      variant={selectedDay === dayIndex ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedDay(dayIndex)}
                      className="min-w-[40px]"
                    >
                      {day}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          <Button variant="primary" onClick={openAddModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            수업 추가
          </Button>
        </div>

        {/* 선생님 범례 */}
        <div className="flex gap-4 mb-4">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: teacher.color }}
              />
              <span className="text-sm text-gray-600">{teacher.name}</span>
            </div>
          ))}
        </div>

        {/* Schedule Grid */}
        <GlassCard className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : viewMode === 'day' ? (
            /* 일간 뷰 */
            <div className="min-w-[600px]">
              {/* Header */}
              <div className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-gray-200">
                <div className="p-3 text-center text-sm font-medium text-gray-500">시간</div>
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="p-3 text-center font-medium"
                    style={{ color: teacher.color }}
                  >
                    {teacher.name}
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              <div className="relative">
                {timeSlots.map((time, index) => (
                  <div
                    key={time}
                    className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-gray-100"
                    style={{ height: '24px' }}
                  >
                    <div className="px-3 text-xs text-gray-400 flex items-center">
                      {index % 3 === 0 ? time : ''}
                    </div>
                    {teachers.map((teacher) => {
                      const schedule = getScheduleForSlot(teacher.id, time, selectedDay)
                      const isStart = schedule && schedule.start_time === time

                      if (isStart) {
                        return (
                          <div key={teacher.id} className="relative px-1">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute left-1 right-1 rounded-lg p-2 cursor-pointer z-10"
                              style={{
                                backgroundColor: `${teacher.color}20`,
                                borderLeft: `3px solid ${teacher.color}`,
                                height: `${getScheduleHeight(schedule) * 24}px`,
                              }}
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {schedule.student.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                              </p>
                            </motion.div>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={teacher.id}
                          className={`${schedule ? '' : 'hover:bg-gray-50'}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 주간 뷰 */
            <div className="min-w-[900px]">
              {/* Header: 요일 */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
                <div className="p-2 text-center text-sm font-medium text-gray-500">시간</div>
                {weekDays.map((day, i) => {
                  const dayOfWeek = day.getDay()
                  const isToday = isSameDay(day, today)
                  return (
                    <div
                      key={i}
                      className={`p-2 text-center ${isToday ? 'bg-primary/10' : ''}`}
                    >
                      <p className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                        {dayNames[dayOfWeek]}
                      </p>
                      <p className={`text-xs ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                        {day.getDate()}일
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Time Slots */}
              <div className="relative">
                {timeSlots.filter((_, i) => i % 3 === 0).map((time) => (
                  <div
                    key={time}
                    className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100"
                    style={{ height: '72px' }}
                  >
                    <div className="px-2 text-xs text-gray-400 flex items-start pt-1">
                      {time}
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const dayOfWeek = day.getDay()
                      const daySchedules = getSchedulesForDay(dayOfWeek).filter(
                        (s) => s.start_time >= time && s.start_time < timeSlots[timeSlots.indexOf(time) + 3]
                      )
                      const isToday = isSameDay(day, today)

                      return (
                        <div
                          key={dayIndex}
                          className={`relative border-l border-gray-100 p-1 ${isToday ? 'bg-primary/5' : ''}`}
                        >
                          {daySchedules.map((schedule) => (
                            <motion.div
                              key={schedule.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mb-1 rounded p-1 cursor-pointer text-xs"
                              style={{
                                backgroundColor: `${schedule.teacher.color}30`,
                                borderLeft: `2px solid ${schedule.teacher.color}`,
                              }}
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <p className="font-medium text-gray-900 truncate">
                                {schedule.student.name}
                              </p>
                              <p className="text-gray-500">
                                {schedule.start_time.slice(0, 5)}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Add Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="수업 추가"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="원생"
            value={newSchedule.student_id}
            onChange={(e) => setNewSchedule({ ...newSchedule, student_id: e.target.value })}
            options={students.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="원생 선택"
          />
          <Select
            label="선생님"
            value={newSchedule.teacher_id}
            onChange={(e) => setNewSchedule({ ...newSchedule, teacher_id: e.target.value })}
            options={teachers.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="선생님 선택"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="시작 시간"
              value={newSchedule.start_time}
              onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
              options={timeSlots.slice(0, -3).map((t) => ({ value: t, label: t }))}
            />
            <Select
              label="종료 시간"
              value={newSchedule.end_time}
              onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
              options={timeSlots.slice(3).map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleAddSchedule}>
              추가
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}

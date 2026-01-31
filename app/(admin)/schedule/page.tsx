'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal, Select } from '@/components/ui'

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

const dayNames = ['일', '월', '화', '수', '목', '금', '토']
const timeSlots = Array.from({ length: 37 }, (_, i) => {
  const hour = Math.floor(i / 6) + 13 // 13:00 시작
  const minute = (i % 6) * 10 // 10분 단위
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

export default function SchedulePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1) // 오늘 요일
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [newSchedule, setNewSchedule] = useState({
    student_id: '',
    teacher_id: '',
    start_time: '15:00',
    end_time: '15:30',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [teachersRes, schedulesRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch(`/api/schedules?day=${selectedDay}`),
      ])

      const teachersData = await teachersRes.json()
      const schedulesData = await schedulesRes.json()

      if (teachersData.success) setTeachers(teachersData.data.teachers)
      if (schedulesData.success) setSchedules(schedulesData.data.schedules)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDay])

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
          start_time: '15:00',
          end_time: '15:30',
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

  const getScheduleForSlot = (teacherId: string, time: string) => {
    return schedules.find(
      (s) =>
        s.teacher.id === teacherId &&
        s.start_time <= time &&
        s.end_time > time
    )
  }

  const getScheduleHeight = (schedule: Schedule) => {
    const start = schedule.start_time.split(':').map(Number)
    const end = schedule.end_time.split(':').map(Number)
    const startMinutes = start[0] * 60 + start[1]
    const endMinutes = end[0] * 60 + end[1]
    return (endMinutes - startMinutes) / 10 // 10분 단위로 높이 계산
  }

  return (
    <AdminLayout>
      <Header
        title="스케줄 관리"
        subtitle={`${dayNames[selectedDay]}요일 시간표`}
      />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Day Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {dayNames.slice(1).concat(dayNames[0]).map((day, i) => {
              const dayIndex = i === 6 ? 0 : i + 1
              return (
                <Button
                  key={day}
                  variant={selectedDay === dayIndex ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(dayIndex)}
                >
                  {day}
                </Button>
              )
            })}
          </div>
          <Button variant="primary" onClick={openAddModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            수업 추가
          </Button>
        </div>

        {/* Schedule Grid */}
        <GlassCard className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : (
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
                      const schedule = getScheduleForSlot(teacher.id, time)
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

'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal, Select } from '@/components/ui'
import { getWeekDays, getWeekStart, formatDateKorean, formatDateISO, addWeeks, isSameDay } from '@/lib/utils/date'

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
  attendance_status?: string
  student: { id: string; name: string }
  teacher: { id: string; name: string; color: string }
}

interface WeeklySnapshot {
  id: string
  week_start: string
  week_end: string
  status: 'draft' | 'confirmed'
  confirmed_at: string | null
}

interface Student {
  id: string
  name: string
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토']

// 10분 슬롯 정의 (오후 1시~7시, 총 36슬롯)
const generateSlots = () => {
  const slots = []
  let slotNumber = 1
  for (let hour = 13; hour < 19; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const startHour = hour.toString().padStart(2, '0')
      const startMin = minute.toString().padStart(2, '0')
      const endMinute = minute + 10
      const endHour = endMinute >= 60 ? hour + 1 : hour
      const endMin = endMinute >= 60 ? 0 : endMinute

      slots.push({
        number: slotNumber,
        start: `${startHour}:${startMin}`,
        end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
        label: `${startHour}:${startMin}~${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
        hourStart: minute === 0, // 정각인지 표시 (구분선용)
      })
      slotNumber++
    }
  }
  return slots
}

const SLOTS = generateSlots()

const ATTENDANCE_STATUS = {
  scheduled: { label: '예정', color: 'bg-gray-100 text-gray-600' },
  attended: { label: '출석', color: 'bg-green-100 text-green-700' },
  absent: { label: '결석', color: 'bg-red-100 text-red-700' },
  cancelled: { label: '취소', color: 'bg-orange-100 text-orange-700' },
}

export default function SchedulePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [weeklySnapshot, setWeeklySnapshot] = useState<WeeklySnapshot | null>(null)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 1)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'slot'>('slot')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [newSchedule, setNewSchedule] = useState({
    student_id: '',
    teacher_id: '',
    start_time: '13:00',
    day_of_week: '',
  })

  const weekStart = getWeekStart(currentWeek)
  const weekDays = getWeekDays(currentWeek)
  const today = new Date()

  // weekStart를 문자열로 변환하여 안정적인 의존성 생성
  const weekStartStr = formatDateISO(weekStart)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 기본 스케줄과 선생님 정보
      const dayParam = viewMode === 'week' || viewMode === 'slot' ? '' : `day=${selectedDay}`
      const [teachersRes, schedulesRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch(`/api/schedules?${dayParam}`),
      ])

      const teachersData = await teachersRes.json()
      const schedulesData = await schedulesRes.json()

      if (teachersData.success) {
        setTeachers(teachersData.data.teachers)
      }
      if (schedulesData.success) {
        setSchedules(schedulesData.data.schedules)
      }

      // 주간 스냅샷 조회
      const weeklyRes = await fetch(`/api/schedules/weekly?week_start=${weekStartStr}`)
      const weeklyData = await weeklyRes.json()
      if (weeklyData.success && weeklyData.data.snapshot) {
        setWeeklySnapshot(weeklyData.data.snapshot)
      } else {
        setWeeklySnapshot(null)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDay, viewMode, weekStartStr])

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
    setNewSchedule({
      student_id: '',
      teacher_id: '',
      start_time: '13:00',
      day_of_week: selectedDay.toString(),
    })
    setIsModalOpen(true)
  }

  // 슬롯 클릭으로 수업 추가
  const openAddModalWithSlot = (teacherId: string, dayOfWeek: number, startTime: string) => {
    fetchStudents()
    setNewSchedule({
      student_id: '',
      teacher_id: teacherId,
      start_time: startTime,
      day_of_week: dayOfWeek.toString(),
    })
    setIsModalOpen(true)
  }

  const handleAddSchedule = async () => {
    if (!newSchedule.student_id || !newSchedule.teacher_id || !newSchedule.day_of_week) {
      return
    }

    // 종료 시간 계산 (시작 시간 + 10분)
    const [hours, minutes] = newSchedule.start_time.split(':').map(Number)
    const endMinutes = minutes + 10
    const endHours = endMinutes >= 60 ? hours + 1 : hours
    const endMin = endMinutes >= 60 ? 0 : endMinutes
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: newSchedule.student_id,
          teacher_id: newSchedule.teacher_id,
          day_of_week: parseInt(newSchedule.day_of_week),
          start_time: newSchedule.start_time,
          end_time: endTime,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setIsModalOpen(false)
        setNewSchedule({
          student_id: '',
          teacher_id: '',
          start_time: '13:00',
          day_of_week: '',
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

  const handleConfirmWeek = async () => {
    const weekEndStr = formatDateISO(weekDays[6])

    try {
      const res = await fetch('/api/schedules/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: weekStartStr,
          week_end: weekEndStr,
          confirm: true,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setWeeklySnapshot(data.data.snapshot)
        alert('이번 주 스케줄이 확정되었습니다.')
      }
    } catch {
      alert('스케줄 확정에 실패했습니다')
    }
  }

  const handleCopyLastWeek = async () => {
    const weekEndStr = formatDateISO(weekDays[6])

    try {
      const res = await fetch('/api/schedules/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: weekStartStr,
          week_end: weekEndStr,
          copy_from_last_week: true,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setWeeklySnapshot(data.data.snapshot)
        fetchData()
        alert('지난주 스케줄을 불러왔습니다.')
      }
    } catch {
      alert('스케줄 불러오기에 실패했습니다')
    }
  }

  // 특정 시간대의 스케줄 찾기
  const getScheduleForSlot = (teacherId: string, startTime: string, dayOfWeek: number) => {
    return schedules.find(
      (s) =>
        s.teacher.id === teacherId &&
        s.start_time.slice(0, 5) === startTime &&
        s.day_of_week === dayOfWeek
    )
  }

  return (
    <AdminLayout>
      <Header
        title="스케줄 관리"
        subtitle={viewMode === 'slot'
          ? `${formatDateKorean(weekDays[0])} ~ ${formatDateKorean(weekDays[6])} (10분 레슨)`
          : viewMode === 'week'
          ? `${formatDateKorean(weekDays[0])} ~ ${formatDateKorean(weekDays[6])}`
          : `${dayNames[selectedDay]}요일 시간표`
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        {/* 뷰 모드 토글 & 컨트롤 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* 뷰 모드 토글 */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('slot')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'slot'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                슬롯별
              </button>
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

            {/* 주 이동 (슬롯/주간 뷰) */}
            {(viewMode === 'week' || viewMode === 'slot') && (
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

            {/* 요일 선택 (일간 뷰) */}
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

          <div className="flex items-center gap-2">
            {/* 주간 스케줄 관리 버튼 */}
            {viewMode === 'slot' && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyLastWeek}>
                  지난주 불러오기
                </Button>
                {weeklySnapshot?.status !== 'confirmed' && (
                  <Button variant="outline" size="sm" onClick={handleConfirmWeek}>
                    스케줄 확정
                  </Button>
                )}
                {weeklySnapshot?.status === 'confirmed' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    확정됨
                  </span>
                )}
              </>
            )}
            <Button variant="primary" onClick={openAddModal}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              수업 추가
            </Button>
          </div>
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

        {/* 슬롯별 뷰 (10분 x 36슬롯) - 일간 기준 */}
        {viewMode === 'slot' && (
          <GlassCard className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">로딩 중...</div>
            ) : (
              <div className="min-w-[700px]">
                {/* 요일 탭 */}
                <div className="flex gap-1 mb-4 border-b border-gray-200 pb-3">
                  {weekDays.slice(1).map((day, i) => {
                    const dayOfWeek = day.getDay()
                    const isToday = isSameDay(day, today)
                    const isSelected = selectedDay === dayOfWeek
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDay(dayOfWeek)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-primary text-white'
                            : isToday
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {dayNames[dayOfWeek]} ({day.getDate()}일)
                      </button>
                    )
                  })}
                </div>

                {/* 선생님 헤더 */}
                <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `60px repeat(${teachers.length}, 1fr)` }}>
                  <div className="p-2 text-center text-sm font-medium text-gray-500">시간</div>
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="p-2 text-center font-medium"
                      style={{ color: teacher.color }}
                    >
                      {teacher.name}
                    </div>
                  ))}
                </div>

                {/* 슬롯별 행 (36개) */}
                <div className="max-h-[600px] overflow-y-auto">
                  {SLOTS.map((slot) => (
                    <div
                      key={slot.number}
                      className={`grid border-b ${slot.hourStart ? 'border-gray-300' : 'border-gray-100'}`}
                      style={{
                        gridTemplateColumns: `60px repeat(${teachers.length}, 1fr)`,
                        minHeight: '36px'
                      }}
                    >
                      <div className={`p-1 text-xs text-gray-500 flex items-center justify-center ${slot.hourStart ? 'font-medium text-gray-700' : ''}`}>
                        {slot.start}
                      </div>
                      {teachers.map((teacher) => {
                        const schedule = getScheduleForSlot(teacher.id, slot.start, selectedDay)

                        return (
                          <div
                            key={teacher.id}
                            className={`p-1 border-l ${slot.hourStart ? 'border-gray-300' : 'border-gray-100'} cursor-pointer hover:bg-gray-50 transition-colors`}
                            onClick={() => !schedule && openAddModalWithSlot(teacher.id, selectedDay, slot.start)}
                          >
                            {schedule ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full px-2 py-1 rounded cursor-pointer flex items-center gap-2"
                                style={{
                                  backgroundColor: `${teacher.color}20`,
                                  borderLeft: `3px solid ${teacher.color}`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSchedule(schedule.id)
                                }}
                              >
                                <span className="text-xs font-medium text-gray-900 truncate">
                                  {schedule.student.name}
                                </span>
                                {schedule.attendance_status && schedule.attendance_status !== 'scheduled' && (
                                  <span className={`text-xs px-1 rounded ${ATTENDANCE_STATUS[schedule.attendance_status as keyof typeof ATTENDANCE_STATUS]?.color || ''}`}>
                                    {ATTENDANCE_STATUS[schedule.attendance_status as keyof typeof ATTENDANCE_STATUS]?.label}
                                  </span>
                                )}
                              </motion.div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-gray-300 hover:text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

                {/* 시간대 요약 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <p>운영 시간: 13:00~19:00 (6시간) | 레슨 시간: 10분/회 | 1시간당 최대 {teachers.length * 6}명 수용</p>
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* 일간 뷰 (기존) */}
        {viewMode === 'day' && (
          <GlassCard className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">로딩 중...</div>
            ) : (
              <div className="min-w-[600px]">
                {/* 선생님 헤더 */}
                <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `80px repeat(${teachers.length}, 1fr)` }}>
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

                {/* 시간별 행 (1시간 단위로 그룹핑, 내부 10분 슬롯) */}
                <div className="max-h-[600px] overflow-y-auto">
                  {[13, 14, 15, 16, 17, 18].map((hour) => (
                    <div key={hour}>
                      {/* 시간 그룹 헤더 */}
                      <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: `80px repeat(${teachers.length}, 1fr)` }}>
                        <div className="p-2 text-sm font-medium text-gray-700">{hour}:00</div>
                        {teachers.map((teacher) => (
                          <div key={teacher.id} className="p-1 border-l border-gray-200" />
                        ))}
                      </div>
                      {/* 6개의 10분 슬롯 */}
                      {[0, 10, 20, 30, 40, 50].map((minute) => {
                        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                        return (
                          <div
                            key={minute}
                            className="grid border-b border-gray-100"
                            style={{
                              gridTemplateColumns: `80px repeat(${teachers.length}, 1fr)`,
                              minHeight: '32px'
                            }}
                          >
                            <div className="p-1 text-xs text-gray-400 flex items-center">
                              {startTime}
                            </div>
                            {teachers.map((teacher) => {
                              const schedule = getScheduleForSlot(teacher.id, startTime, selectedDay)

                              return (
                                <div
                                  key={teacher.id}
                                  className="p-1 border-l border-gray-100 cursor-pointer hover:bg-gray-50"
                                  onClick={() => !schedule && openAddModalWithSlot(teacher.id, selectedDay, startTime)}
                                >
                                  {schedule ? (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="h-full px-2 py-1 rounded cursor-pointer"
                                      style={{
                                        backgroundColor: `${teacher.color}20`,
                                        borderLeft: `3px solid ${teacher.color}`,
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteSchedule(schedule.id)
                                      }}
                                    >
                                      <p className="text-xs font-medium text-gray-900">{schedule.student.name}</p>
                                    </motion.div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* 주간 뷰 */}
        {viewMode === 'week' && (
          <GlassCard className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">로딩 중...</div>
            ) : (
              <div className="min-w-[900px]">
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

                {/* 시간별 (1시간 단위로 압축 표시) */}
                <div className="max-h-[500px] overflow-y-auto">
                  {[13, 14, 15, 16, 17, 18].map((hour) => (
                    <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200" style={{ minHeight: '80px' }}>
                      <div className="px-2 text-xs text-gray-500 flex items-start pt-2">
                        {hour}:00
                      </div>
                      {weekDays.map((day, dayIndex) => {
                        const dayOfWeek = day.getDay()
                        // 해당 시간대의 모든 스케줄 (10분 단위 6개)
                        const hourSchedules = schedules.filter(
                          (s) => {
                            const scheduleHour = parseInt(s.start_time.split(':')[0])
                            return s.day_of_week === dayOfWeek && scheduleHour === hour
                          }
                        )
                        const isToday = isSameDay(day, today)

                        return (
                          <div
                            key={dayIndex}
                            className={`relative border-l border-gray-100 p-1 ${isToday ? 'bg-primary/5' : ''}`}
                          >
                            {hourSchedules.length > 0 ? (
                              <div className="space-y-1">
                                {hourSchedules.slice(0, 3).map((schedule) => (
                                  <motion.div
                                    key={schedule.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="rounded p-1 cursor-pointer text-xs"
                                    style={{
                                      backgroundColor: `${schedule.teacher.color}30`,
                                      borderLeft: `2px solid ${schedule.teacher.color}`,
                                    }}
                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                  >
                                    <p className="font-medium text-gray-900 truncate text-[10px]">
                                      {schedule.start_time.slice(0, 5)} {schedule.student.name}
                                    </p>
                                  </motion.div>
                                ))}
                                {hourSchedules.length > 3 && (
                                  <p className="text-[10px] text-gray-500 pl-1">
                                    +{hourSchedules.length - 3}명 더
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* 수업 추가 모달 */}
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
          <Select
            label="요일"
            value={newSchedule.day_of_week}
            onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: e.target.value })}
            options={dayNames.slice(1, 7).map((name, i) => ({ value: (i + 1).toString(), label: `${name}요일` }))}
            placeholder="요일 선택"
          />
          <Select
            label="시작 시간 (10분 레슨)"
            value={newSchedule.start_time}
            onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
            options={SLOTS.map((s) => ({ value: s.start, label: s.label }))}
          />
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p>레슨 시간: <span className="font-medium text-gray-900">{newSchedule.start_time} ~ {
              (() => {
                const [h, m] = newSchedule.start_time.split(':').map(Number)
                const endM = m + 10
                const endH = endM >= 60 ? h + 1 : h
                return `${endH.toString().padStart(2, '0')}:${(endM % 60).toString().padStart(2, '0')}`
              })()
            }</span> (10분)</p>
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

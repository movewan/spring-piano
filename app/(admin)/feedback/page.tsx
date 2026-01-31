'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal, Input, Select } from '@/components/ui'

interface Feedback {
  id: string
  month_year: string
  content: string
  video_url: string | null
  is_published: boolean
  student: { id: string; name: string }
  teacher: { id: string; name: string }
  created_at: string
}

interface Student {
  id: string
  name: string
}

interface Teacher {
  id: string
  name: string
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [newFeedback, setNewFeedback] = useState({
    student_id: '',
    teacher_id: '',
    content: '',
    video_url: '',
    is_published: false,
  })

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/feedback?month=${selectedMonth}`)
      const data = await res.json()

      if (data.success) {
        setFeedback(data.data.feedback)
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const fetchFormData = async () => {
    const [studentsRes, teachersRes] = await Promise.all([
      fetch('/api/students?is_active=true&limit=100'),
      fetch('/api/teachers'),
    ])

    const studentsData = await studentsRes.json()
    const teachersData = await teachersRes.json()

    if (studentsData.success) {
      setStudents(studentsData.data.students.map((s: { id: string; name: string }) => ({
        id: s.id,
        name: s.name,
      })))
    }

    if (teachersData.success) {
      setTeachers(teachersData.data.teachers)
    }
  }

  const openAddModal = () => {
    fetchFormData()
    setNewFeedback({
      student_id: '',
      teacher_id: '',
      content: '',
      video_url: '',
      is_published: false,
    })
    setIsModalOpen(true)
  }

  const handleAddFeedback = async () => {
    if (!newFeedback.student_id || !newFeedback.teacher_id || !newFeedback.content) {
      return
    }

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFeedback,
          month_year: selectedMonth,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setIsModalOpen(false)
        fetchFeedback()
      } else {
        alert(data.error || '피드백 등록에 실패했습니다')
      }
    } catch {
      alert('서버 오류가 발생했습니다')
    }
  }

  const handlePublish = async (id: string, isPublished: boolean) => {
    try {
      const res = await fetch('/api/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_published: !isPublished }),
      })

      const data = await res.json()

      if (data.success) {
        fetchFeedback()
      }
    } catch {
      alert('상태 변경에 실패했습니다')
    }
  }

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-')
    return `${year}년 ${parseInt(month)}월`
  }

  return (
    <AdminLayout>
      <Header title="피드백 관리" subtitle={`${formatMonthYear(selectedMonth)} 피드백`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
          <Button variant="primary" onClick={openAddModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            피드백 작성
          </Button>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : feedback.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-500">이 달의 피드백이 없습니다</p>
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {feedback.map((fb, index) => (
              <motion.div
                key={fb.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg">
                          {fb.student.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{fb.student.name}</h3>
                        <p className="text-sm text-gray-500">{fb.teacher.name} 선생님</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fb.video_url && (
                        <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs">
                          영상
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          fb.is_published
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {fb.is_published ? '공개됨' : '미공개'}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 line-clamp-3 mb-4">{fb.content}</p>

                  <div className="flex gap-2">
                    <Button
                      variant={fb.is_published ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handlePublish(fb.id, fb.is_published)}
                    >
                      {fb.is_published ? '비공개로 전환' : '공개하기'}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Feedback Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="피드백 작성"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="원생"
              value={newFeedback.student_id}
              onChange={(e) => setNewFeedback({ ...newFeedback, student_id: e.target.value })}
              options={students.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="원생 선택"
            />
            <Select
              label="선생님"
              value={newFeedback.teacher_id}
              onChange={(e) => setNewFeedback({ ...newFeedback, teacher_id: e.target.value })}
              options={teachers.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="선생님 선택"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">피드백 내용</label>
            <textarea
              value={newFeedback.content}
              onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
              placeholder="이번 달 수업에 대한 피드백을 작성하세요..."
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 min-h-[200px]"
            />
          </div>

          <Input
            label="영상 URL (선택)"
            value={newFeedback.video_url}
            onChange={(e) => setNewFeedback({ ...newFeedback, video_url: e.target.value })}
            placeholder="https://..."
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={newFeedback.is_published}
              onChange={(e) => setNewFeedback({ ...newFeedback, is_published: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-gray-700">즉시 공개</span>
          </label>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleAddFeedback}>
              저장
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}

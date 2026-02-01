'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal, Input, Select } from '@/components/ui'

interface Teacher {
  id: string
  name: string
  specialty: string | null
  phone: string | null
  color: string
  email: string | null
  hire_date: string | null
  salary: number
  is_active: boolean
}

const COLORS = [
  { value: '#7BC4C4', label: '민트' },
  { value: '#FF7EB3', label: '핑크' },
  { value: '#FFB347', label: '오렌지' },
  { value: '#87CEEB', label: '스카이블루' },
  { value: '#DDA0DD', label: '퍼플' },
  { value: '#98D8C8', label: '연두' },
]

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    phone: '',
    color: '#7BC4C4',
    email: '',
    hire_date: '',
    salary: '',
  })

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (showInactive) params.set('include_inactive', 'true')

      const res = await fetch(`/api/teachers?${params}`)
      const data = await res.json()
      if (data.success) {
        setTeachers(data.data.teachers)
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const openAddModal = () => {
    setEditingTeacher(null)
    setFormData({
      name: '',
      specialty: '',
      phone: '',
      color: '#7BC4C4',
      email: '',
      hire_date: '',
      salary: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setFormData({
      name: teacher.name,
      specialty: teacher.specialty || '',
      phone: teacher.phone || '',
      color: teacher.color,
      email: teacher.email || '',
      hire_date: teacher.hire_date || '',
      salary: teacher.salary?.toString() || '',
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      alert('이름을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const method = editingTeacher ? 'PUT' : 'POST'
      const body = {
        ...(editingTeacher && { id: editingTeacher.id }),
        name: formData.name,
        specialty: formData.specialty || null,
        phone: formData.phone || null,
        color: formData.color,
        email: formData.email || null,
        hire_date: formData.hire_date || null,
        salary: formData.salary ? parseInt(formData.salary) : 0,
      }

      const res = await fetch('/api/teachers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        setIsModalOpen(false)
        fetchTeachers()
      } else {
        alert(data.error || '저장에 실패했습니다')
      }
    } catch {
      alert('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!teacherToDelete) return

    setSaving(true)
    try {
      const res = await fetch(`/api/teachers?id=${teacherToDelete.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setIsDeleteModalOpen(false)
        setTeacherToDelete(null)
        fetchTeachers()
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch {
      alert('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (teacher: Teacher) => {
    try {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacher.id, is_active: true }),
      })
      const data = await res.json()
      if (data.success) {
        fetchTeachers()
      }
    } catch {
      alert('복원에 실패했습니다')
    }
  }

  return (
    <AdminLayout>
      <Header title="선생님 관리" subtitle={`총 ${teachers.filter(t => t.is_active).length}명의 선생님`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* 액션 버튼 */}
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            퇴직 선생님 표시
          </label>
          <Button variant="primary" onClick={openAddModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            선생님 추가
          </Button>
        </div>

        {/* 선생님 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {loading ? (
              <div className="col-span-full p-8 text-center text-gray-500">로딩 중...</div>
            ) : teachers.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-500">등록된 선생님이 없습니다</div>
            ) : (
              teachers.map((teacher, index) => (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard className={`p-6 ${!teacher.is_active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: teacher.color }}
                        >
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{teacher.name}</h3>
                          <p className="text-sm text-gray-500">{teacher.specialty || '전공 미지정'}</p>
                          {!teacher.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">퇴직</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {teacher.is_active ? (
                          <button
                            onClick={() => {
                              setTeacherToDelete(teacher)
                              setIsDeleteModalOpen(true)
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(teacher)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                      {teacher.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">연락처</span>
                          <span className="text-gray-900">{teacher.phone}</span>
                        </div>
                      )}
                      {teacher.email && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">이메일</span>
                          <span className="text-gray-900">{teacher.email}</span>
                        </div>
                      )}
                      {teacher.hire_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">입사일</span>
                          <span className="text-gray-900">{teacher.hire_date}</span>
                        </div>
                      )}
                      {teacher.salary > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">급여</span>
                          <span className="text-gray-900">{teacher.salary.toLocaleString()}원</span>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 추가/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? '선생님 정보 수정' : '선생님 추가'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="이름 *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="홍길동"
          />
          <Input
            label="전공/전문분야"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            placeholder="클래식, 재즈 등"
          />
          <Input
            label="연락처"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="010-1234-5678"
          />
          <Input
            label="이메일"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="teacher@example.com"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="입사일"
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
            />
            <Input
              label="급여"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              placeholder="0"
            />
          </div>
          <Select
            label="색상"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            options={COLORS}
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-500">미리보기:</span>
            <div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: formData.color }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editingTeacher ? '저장' : '추가'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="선생님 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            <span className="font-bold text-gray-900">{teacherToDelete?.name}</span> 선생님을 퇴직 처리하시겠습니까?
          </p>
          <p className="text-sm text-gray-500">
            퇴직 처리된 선생님은 목록에서 숨겨지지만 데이터는 보존됩니다.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              loading={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              퇴직 처리
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}

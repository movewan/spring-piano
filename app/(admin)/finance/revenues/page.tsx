'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal, Input, Select } from '@/components/ui'

interface Revenue {
  id: string
  date: string
  description: string
  amount: number
  category: string
  notes: string | null
}

const CATEGORIES = [
  { value: 'lesson', label: '수업료' },
  { value: 'material', label: '교재비' },
  { value: 'event', label: '행사수입' },
  { value: 'other', label: '기타' },
]

const CATEGORY_LABELS: Record<string, string> = {
  lesson: '수업료',
  material: '교재비',
  event: '행사수입',
  other: '기타',
}

export default function RevenuesPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = (new Date().getMonth() + 1).toString()

  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [year, setYear] = useState(currentYear.toString())
  const [month, setMonth] = useState(currentMonth)
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null)
  const [revenueToDelete, setRevenueToDelete] = useState<Revenue | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    date: '',
    description: '',
    amount: '',
    category: 'other',
    notes: '',
  })

  const fetchRevenues = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/revenues?year=${year}&month=${month}`)
      const data = await res.json()
      if (data.success) {
        setRevenues(data.data.revenues)
      }
    } catch (error) {
      console.error('Failed to fetch revenues:', error)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchRevenues()
  }, [fetchRevenues])

  const openAddModal = () => {
    setEditingRevenue(null)
    setFormData({
      date: `${year}-${month.padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
      description: '',
      amount: '',
      category: 'other',
      notes: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (revenue: Revenue) => {
    setEditingRevenue(revenue)
    setFormData({
      date: revenue.date,
      description: revenue.description,
      amount: revenue.amount.toString(),
      category: revenue.category,
      notes: revenue.notes || '',
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.date || !formData.description || !formData.amount) {
      alert('필수 항목을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const method = editingRevenue ? 'PUT' : 'POST'
      const body = {
        ...(editingRevenue && { id: editingRevenue.id }),
        date: formData.date,
        description: formData.description,
        amount: parseInt(formData.amount),
        category: formData.category,
        notes: formData.notes || null,
      }

      const res = await fetch('/api/revenues', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        setIsModalOpen(false)
        fetchRevenues()
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
    if (!revenueToDelete) return

    setSaving(true)
    try {
      const res = await fetch(`/api/revenues?id=${revenueToDelete.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setIsDeleteModalOpen(false)
        setRevenueToDelete(null)
        fetchRevenues()
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch {
      alert('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const totalAmount = revenues.reduce((sum, r) => sum + r.amount, 0)

  return (
    <AdminLayout>
      <Header title="매출 관리" subtitle={`${year}년 ${month}월 수동 매출 내역`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* 필터 및 액션 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              options={[
                { value: (currentYear - 1).toString(), label: `${currentYear - 1}년` },
                { value: currentYear.toString(), label: `${currentYear}년` },
              ]}
            />
            <Select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: (i + 1).toString(),
                label: `${i + 1}월`,
              }))}
            />
          </div>
          <Button variant="primary" onClick={openAddModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            매출 추가
          </Button>
        </div>

        {/* 합계 */}
        <GlassCard className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">총 매출 ({revenues.length}건)</span>
            <span className="text-2xl font-bold text-primary">{totalAmount.toLocaleString()}원</span>
          </div>
        </GlassCard>

        {/* 매출 목록 */}
        <GlassCard className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : revenues.length === 0 ? (
            <div className="p-8 text-center text-gray-500">등록된 매출이 없습니다</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">날짜</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">내용</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">카테고리</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">금액</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {revenues.map((revenue, index) => (
                    <motion.tr
                      key={revenue.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-white/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-900">{revenue.date}</td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{revenue.description}</p>
                        {revenue.notes && (
                          <p className="text-sm text-gray-500">{revenue.notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                          {CATEGORY_LABELS[revenue.category] || revenue.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {revenue.amount.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(revenue)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setRevenueToDelete(revenue)
                              setIsDeleteModalOpen(true)
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </GlassCard>
      </div>

      {/* 추가/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRevenue ? '매출 수정' : '매출 추가'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="날짜 *"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
          <Input
            label="내용 *"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="매출 내용"
          />
          <Input
            label="금액 *"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0"
          />
          <Select
            label="카테고리"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={CATEGORIES}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">메모</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="추가 메모"
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editingRevenue ? '저장' : '추가'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="매출 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            이 매출 내역을 삭제하시겠습니까?
          </p>
          <p className="text-sm text-gray-500">
            {revenueToDelete?.description} - {revenueToDelete?.amount.toLocaleString()}원
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
              삭제
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}

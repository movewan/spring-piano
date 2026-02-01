'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal, Input, Select } from '@/components/ui'

interface Expense {
  id: string
  date: string
  description: string
  amount: number
  category: string
  is_fixed: boolean
  is_recurring: boolean
  recurring_day: number | null
  recurring_until: string | null
  notes: string | null
}

const CATEGORIES = [
  { value: 'rent', label: '임대료' },
  { value: 'salary', label: '급여' },
  { value: 'utilities', label: '공과금' },
  { value: 'operations', label: '운영비' },
  { value: 'materials', label: '교재/재료비' },
  { value: 'other', label: '기타' },
]

const CATEGORY_LABELS: Record<string, string> = {
  rent: '임대료',
  salary: '급여',
  utilities: '공과금',
  operations: '운영비',
  materials: '교재/재료비',
  other: '기타',
}

export default function ExpensesPage() {
  const currentYear = new Date().getFullYear()
  const currentMonth = (new Date().getMonth() + 1).toString()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [year, setYear] = useState(currentYear.toString())
  const [month, setMonth] = useState(currentMonth)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    date: '',
    description: '',
    amount: '',
    category: 'other',
    is_fixed: false,
    is_recurring: false,
    recurring_day: '',
    recurring_until: '',
    notes: '',
  })

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year, month })
      if (categoryFilter) params.set('category', categoryFilter)

      const res = await fetch(`/api/expenses?${params}`)
      const data = await res.json()
      if (data.success) {
        setExpenses(data.data.expenses)
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setLoading(false)
    }
  }, [year, month, categoryFilter])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const openAddModal = () => {
    setEditingExpense(null)
    setFormData({
      date: `${year}-${month.padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`,
      description: '',
      amount: '',
      category: 'other',
      is_fixed: false,
      is_recurring: false,
      recurring_day: '',
      recurring_until: '',
      notes: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      date: expense.date,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      is_fixed: expense.is_fixed,
      is_recurring: expense.is_recurring,
      recurring_day: expense.recurring_day?.toString() || '',
      recurring_until: expense.recurring_until || '',
      notes: expense.notes || '',
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.date || !formData.description || !formData.amount || !formData.category) {
      alert('필수 항목을 입력해주세요')
      return
    }

    setSaving(true)
    try {
      const method = editingExpense ? 'PUT' : 'POST'
      const body = {
        ...(editingExpense && { id: editingExpense.id }),
        date: formData.date,
        description: formData.description,
        amount: parseInt(formData.amount),
        category: formData.category,
        is_fixed: formData.is_fixed,
        is_recurring: formData.is_recurring,
        recurring_day: formData.recurring_day ? parseInt(formData.recurring_day) : null,
        recurring_until: formData.recurring_until || null,
        notes: formData.notes || null,
      }

      const res = await fetch('/api/expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        setIsModalOpen(false)
        fetchExpenses()
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
    if (!expenseToDelete) return

    setSaving(true)
    try {
      const res = await fetch(`/api/expenses?id=${expenseToDelete.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setIsDeleteModalOpen(false)
        setExpenseToDelete(null)
        fetchExpenses()
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch {
      alert('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const fixedAmount = expenses.filter((e) => e.is_fixed).reduce((sum, e) => sum + e.amount, 0)
  const variableAmount = expenses.filter((e) => !e.is_fixed).reduce((sum, e) => sum + e.amount, 0)

  return (
    <AdminLayout>
      <Header title="지출 관리" subtitle={`${year}년 ${month}월 지출 내역`} />

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
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: '전체 카테고리' },
                ...CATEGORIES,
              ]}
            />
          </div>
          <Button variant="primary" onClick={openAddModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            지출 추가
          </Button>
        </div>

        {/* 합계 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <GlassCard className="p-4">
            <p className="text-sm text-gray-500">총 지출</p>
            <p className="text-xl font-bold text-gray-900">{totalAmount.toLocaleString()}원</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-sm text-gray-500">고정비</p>
            <p className="text-xl font-bold text-red-600">{fixedAmount.toLocaleString()}원</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-sm text-gray-500">변동비</p>
            <p className="text-xl font-bold text-orange-600">{variableAmount.toLocaleString()}원</p>
          </GlassCard>
        </div>

        {/* 지출 목록 */}
        <GlassCard className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">등록된 지출이 없습니다</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">날짜</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">내용</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">카테고리</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">유형</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">금액</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {expenses.map((expense, index) => (
                    <motion.tr
                      key={expense.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-white/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-900">{expense.date}</td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{expense.description}</p>
                        {expense.notes && (
                          <p className="text-sm text-gray-500">{expense.notes}</p>
                        )}
                        {expense.is_recurring && (
                          <p className="text-xs text-blue-600">
                            매월 {expense.recurring_day}일 반복
                            {expense.recurring_until && ` (${expense.recurring_until}까지)`}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {CATEGORY_LABELS[expense.category] || expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          expense.is_fixed
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {expense.is_fixed ? '고정비' : '변동비'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {expense.amount.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(expense)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setExpenseToDelete(expense)
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
        title={editingExpense ? '지출 수정' : '지출 추가'}
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
            placeholder="지출 내용"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="금액 *"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
            />
            <Select
              label="카테고리 *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={CATEGORIES}
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_fixed}
                onChange={(e) => setFormData({ ...formData, is_fixed: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">고정비</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">반복 지출</span>
            </label>
          </div>

          {formData.is_recurring && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
              <Input
                label="반복일 (매월)"
                type="number"
                min="1"
                max="31"
                value={formData.recurring_day}
                onChange={(e) => setFormData({ ...formData, recurring_day: e.target.value })}
                placeholder="1~31"
              />
              <Input
                label="종료일"
                type="date"
                value={formData.recurring_until}
                onChange={(e) => setFormData({ ...formData, recurring_until: e.target.value })}
              />
            </div>
          )}

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
              {editingExpense ? '저장' : '추가'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="지출 삭제"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            이 지출 내역을 삭제하시겠습니까?
          </p>
          <p className="text-sm text-gray-500">
            {expenseToDelete?.description} - {expenseToDelete?.amount.toLocaleString()}원
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

'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal, Input, Select } from '@/components/ui'

interface Payment {
  id: string
  base_amount: number
  family_discount: number
  additional_discount: number
  final_amount: number
  payment_method: string | null
  payment_date: string
  notes: string | null
  student: {
    id: string
    name: string
    family: { discount_tier: number } | null
  }
}

interface Student {
  id: string
  name: string
  product?: { price: number }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [newPayment, setNewPayment] = useState({
    student_id: '',
    base_amount: '',
    additional_discount: '0',
    payment_method: 'card',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments?month=${selectedMonth}`)
      const data = await res.json()

      if (data.success) {
        setPayments(data.data.payments)
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const fetchStudents = async () => {
    const res = await fetch('/api/students?is_active=true&limit=100')
    const data = await res.json()
    if (data.success) {
      setStudents(data.data.students)
    }
  }

  const openAddModal = () => {
    fetchStudents()
    setIsModalOpen(true)
  }

  const handleStudentChange = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    setNewPayment({
      ...newPayment,
      student_id: studentId,
      base_amount: student?.product?.price?.toString() || '',
    })
  }

  const handleAddPayment = async () => {
    if (!newPayment.student_id || !newPayment.base_amount) {
      return
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: newPayment.student_id,
          base_amount: parseInt(newPayment.base_amount),
          additional_discount: parseInt(newPayment.additional_discount) || 0,
          payment_method: newPayment.payment_method,
          payment_date: newPayment.payment_date,
          month_year: selectedMonth,
          notes: newPayment.notes || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setIsModalOpen(false)
        setNewPayment({
          student_id: '',
          base_amount: '',
          additional_discount: '0',
          payment_method: 'card',
          payment_date: new Date().toISOString().split('T')[0],
          notes: '',
        })
        fetchPayments()
      } else {
        alert(data.error || '결제 등록에 실패했습니다')
      }
    } catch {
      alert('서버 오류가 발생했습니다')
    }
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.final_amount, 0)
  const totalDiscount = payments.reduce((sum, p) => sum + p.family_discount + p.additional_discount, 0)

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원'
  }

  const getDiscountLabel = (tier: number) => {
    switch (tier) {
      case 1: return '5%'
      case 2: return '10%'
      default: return '-'
    }
  }

  const paymentMethods: Record<string, string> = {
    card: '카드',
    cash: '현금',
    transfer: '계좌이체',
  }

  return (
    <AdminLayout>
      <Header title="수납 관리" subtitle={`${selectedMonth} 수납 현황`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Month Selector & Stats */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40"
            />
            <div className="flex gap-6">
              <div>
                <span className="text-sm text-gray-500">총 수납액</span>
                <p className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">총 할인액</span>
                <p className="text-xl font-bold text-secondary">{formatCurrency(totalDiscount)}</p>
              </div>
            </div>
          </div>
          <Button variant="primary" onClick={openAddModal}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            수납 등록
          </Button>
        </div>

        {/* Payments List */}
        <GlassCard className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">이 달의 수납 기록이 없습니다</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">원생</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">정가</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">가족할인</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">추가할인</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">결제액</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">결제수단</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">결제일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment, index) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-white/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{payment.student.name}</span>
                        {(payment.student.family?.discount_tier ?? 0) > 0 && (
                          <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-xs">
                            가족 {getDiscountLabel(payment.student.family?.discount_tier ?? 0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {formatCurrency(payment.base_amount)}
                    </td>
                    <td className="px-6 py-4 text-right text-secondary">
                      {payment.family_discount > 0 ? `-${formatCurrency(payment.family_discount)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-orange-500">
                      {payment.additional_discount > 0 ? `-${formatCurrency(payment.additional_discount)}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {formatCurrency(payment.final_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {payment.payment_method ? paymentMethods[payment.payment_method] : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {payment.payment_date}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      </div>

      {/* Add Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="수납 등록"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="원생"
            value={newPayment.student_id}
            onChange={(e) => handleStudentChange(e.target.value)}
            options={students.map((s) => ({
              value: s.id,
              label: `${s.name}${s.product ? ` (${s.product.price.toLocaleString()}원)` : ''}`,
            }))}
            placeholder="원생 선택"
          />
          <Input
            label="수강료"
            type="number"
            value={newPayment.base_amount}
            onChange={(e) => setNewPayment({ ...newPayment, base_amount: e.target.value })}
            placeholder="수강료 입력"
          />
          <Input
            label="추가 할인"
            type="number"
            value={newPayment.additional_discount}
            onChange={(e) => setNewPayment({ ...newPayment, additional_discount: e.target.value })}
            placeholder="추가 할인액"
          />
          <Select
            label="결제 수단"
            value={newPayment.payment_method}
            onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
            options={[
              { value: 'card', label: '카드' },
              { value: 'cash', label: '현금' },
              { value: 'transfer', label: '계좌이체' },
            ]}
          />
          <Input
            label="결제일"
            type="date"
            value={newPayment.payment_date}
            onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">메모</label>
            <textarea
              value={newPayment.notes}
              onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
              placeholder="메모"
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 min-h-[80px]"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={handleAddPayment}>
              등록
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}

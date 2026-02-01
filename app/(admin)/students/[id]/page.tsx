'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Modal } from '@/components/ui'

interface Schedule {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  teacher: { id: string; name: string; color: string }
}

interface Parent {
  id: string
  name: string
  phone: string | null
  relationship: string
  is_primary: boolean
}

interface Payment {
  id: string
  base_amount: number
  final_amount: number
  payment_method: string | null
  payment_date: string
  month_year: string
}

interface Feedback {
  id: string
  month_year: string
  content: string
  is_published: boolean
  teacher: { name: string }
}

interface StudentDetail {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  school: string | null
  grade: number | null
  notes: string | null
  is_active: boolean
  consent_signed: boolean
  consent_date: string | null
  created_at: string
  product?: { id: string; name: string; price: number; duration_minutes: number; lessons_per_month: number }
  family?: { id: string; family_name: string; discount_tier: number }
  schedules?: Schedule[]
  parents?: Parent[]
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토']

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // 원생 상세 정보
        const studentRes = await fetch(`/api/students/${id}`)
        const studentData = await studentRes.json()
        if (studentData.success) {
          setStudent(studentData.data.student)
        }

        // 결제 이력 (최근 6개월)
        const paymentsRes = await fetch(`/api/payments?student_id=${id}`)
        const paymentsData = await paymentsRes.json()
        if (paymentsData.success) {
          setPayments(paymentsData.data.payments.slice(0, 10))
        }

        // 피드백 이력
        const feedbackRes = await fetch(`/api/feedback?student_id=${id}`)
        const feedbackData = await feedbackRes.json()
        if (feedbackData.success) {
          setFeedbacks(feedbackData.data.feedbacks?.slice(0, 5) || [])
        }
      } catch (error) {
        console.error('Failed to fetch student data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        router.push('/students')
      } else {
        alert(data.error || '퇴원 처리에 실패했습니다')
      }
    } catch {
      alert('서버 오류가 발생했습니다')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <Header title="원생 상세" subtitle="정보를 불러오는 중..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </AdminLayout>
    )
  }

  if (!student) {
    return (
      <AdminLayout>
        <Header title="원생 상세" subtitle="원생을 찾을 수 없습니다" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500">해당 원생 정보를 찾을 수 없습니다.</p>
          <Link href="/students">
            <Button variant="primary">목록으로 돌아가기</Button>
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Header
        title={student.name}
        subtitle={student.is_active ? '재원 중' : '퇴원'}
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3">
            <Link href={`/students/${id}/edit`}>
              <Button variant="outline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </Button>
            </Link>
            {student.is_active && (
              <Button variant="ghost" onClick={() => setShowDeleteModal(true)} className="text-red-600 hover:bg-red-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                퇴원 처리
              </Button>
            )}
          </div>

          {/* 기본 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">기본 정보</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem label="이름" value={student.name} />
                <InfoItem label="연락처" value={student.phone || '-'} />
                <InfoItem label="생년월일" value={student.birth_date || '-'} />
                <InfoItem label="학교" value={student.school || '-'} />
                <InfoItem label="학년" value={student.grade ? `${student.grade}학년` : '-'} />
                <InfoItem label="등록일" value={new Date(student.created_at).toLocaleDateString('ko-KR')} />
                <InfoItem
                  label="개인정보 동의"
                  value={student.consent_signed ? '동의함' : '미동의'}
                  valueColor={student.consent_signed ? 'text-green-600' : 'text-red-600'}
                />
                <InfoItem
                  label="상태"
                  value={student.is_active ? '재원 중' : '퇴원'}
                  valueColor={student.is_active ? 'text-green-600' : 'text-gray-500'}
                />
              </div>
              {student.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">메모</p>
                  <p className="text-gray-900">{student.notes}</p>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* 수강 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">수강 정보</h2>
              {student.product ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoItem label="수강 과정" value={student.product.name} />
                  <InfoItem label="수강료" value={`${student.product.price.toLocaleString()}원`} />
                  <InfoItem label="수업 시간" value={`${student.product.duration_minutes}분`} />
                  <InfoItem label="월 수업 횟수" value={`${student.product.lessons_per_month}회`} />
                </div>
              ) : (
                <p className="text-gray-500">수강 과정이 지정되지 않았습니다.</p>
              )}
              {student.family && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <InfoItem label="가족" value={student.family.family_name} />
                    <InfoItem
                      label="가족 할인"
                      value={
                        student.family.discount_tier === 2
                          ? '10% (3명 이상)'
                          : student.family.discount_tier === 1
                          ? '5% (2명)'
                          : '없음'
                      }
                    />
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* 수업 스케줄 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">수업 스케줄</h2>
              {student.schedules && student.schedules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {student.schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="px-4 py-2 rounded-xl text-white flex items-center gap-2"
                      style={{ backgroundColor: schedule.teacher.color }}
                    >
                      <span className="font-medium">
                        {dayNames[schedule.day_of_week]} {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                      </span>
                      <span className="text-sm opacity-80">({schedule.teacher.name})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">등록된 스케줄이 없습니다.</p>
              )}
            </GlassCard>
          </motion.div>

          {/* 보호자 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">보호자 정보</h2>
              {student.parents && student.parents.length > 0 ? (
                <div className="space-y-3">
                  {student.parents.map((parent) => (
                    <div
                      key={parent.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{parent.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({parent.relationship})</span>
                        {parent.is_primary && (
                          <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            주 보호자
                          </span>
                        )}
                      </div>
                      <span className="text-gray-600">{parent.phone || '-'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">등록된 보호자가 없습니다.</p>
              )}
            </GlassCard>
          </motion.div>

          {/* 결제 이력 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">최근 결제 이력</h2>
              {payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-gray-500 border-b">
                        <th className="text-left py-2">결제월</th>
                        <th className="text-left py-2">결제일</th>
                        <th className="text-right py-2">금액</th>
                        <th className="text-center py-2">결제방법</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="py-2 text-gray-900">{payment.month_year}</td>
                          <td className="py-2 text-gray-600">{payment.payment_date}</td>
                          <td className="py-2 text-right text-gray-900">
                            {payment.final_amount.toLocaleString()}원
                          </td>
                          <td className="py-2 text-center">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                              {payment.payment_method === 'card' ? '카드' :
                               payment.payment_method === 'cash' ? '현금' :
                               payment.payment_method === 'transfer' ? '계좌이체' : '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">결제 이력이 없습니다.</p>
              )}
            </GlassCard>
          </motion.div>

          {/* 피드백 이력 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">최근 피드백</h2>
              {feedbacks.length > 0 ? (
                <div className="space-y-3">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{feedback.month_year}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          feedback.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {feedback.is_published ? '발행됨' : '미발행'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">{feedback.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">피드백 이력이 없습니다.</p>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* 퇴원 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="퇴원 처리"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            <span className="font-bold text-gray-900">{student.name}</span> 원생을 퇴원 처리하시겠습니까?
          </p>
          <p className="text-sm text-gray-500">
            퇴원 처리된 원생은 목록에서 숨겨지지만 데이터는 보존됩니다.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              loading={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              퇴원 처리
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}

function InfoItem({ label, value, valueColor = 'text-gray-900' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`font-medium ${valueColor}`}>{value}</p>
    </div>
  )
}

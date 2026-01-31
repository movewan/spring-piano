'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button } from '@/components/ui'
import { Settlement, SalesItem } from '@/lib/payhere/types'
import ExcelUpload from '@/components/admin/ExcelUpload'

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [recentSales, setRecentSales] = useState<SalesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'settlements' | 'sales' | 'upload'>('settlements')
  const [showUploadModal, setShowUploadModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [settlementsRes, salesRes] = await Promise.all([
        fetch('/api/payhere/settlements'),
        fetch('/api/payhere/sales?type=list&limit=20'),
      ])

      const settlementsData = await settlementsRes.json()
      const salesData = await salesRes.json()

      if (settlementsData.success) {
        setSettlements(settlementsData.data.items)
      }
      if (salesData.success) {
        setRecentSales(salesData.data.items)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUploadComplete = useCallback(() => {
    // 업로드 완료 후 데이터 새로고침
    fetchData()
    setActiveTab('sales')
  }, [fetchData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            완료
          </span>
        )
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            대기
          </span>
        )
      case 'refunded':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            환불
          </span>
        )
      default:
        return null
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'card':
        return '카드'
      case 'cash':
        return '현금'
      case 'transfer':
        return '계좌이체'
      default:
        return method
    }
  }

  return (
    <AdminLayout>
      <Header
        title="정산 관리"
        subtitle="매출 및 정산 내역을 확인하세요"
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === 'settlements' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('settlements')}
          >
            정산 내역
          </Button>
          <Button
            variant={activeTab === 'sales' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('sales')}
          >
            매출 내역
          </Button>
          <Button
            variant={activeTab === 'upload' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('upload')}
          >
            엑셀 업로드
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => setShowUploadModal(true)}
            className="hidden lg:flex"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Payhere 엑셀 가져오기
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : activeTab === 'upload' ? (
          /* 엑셀 업로드 탭 */
          <GlassCard>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Payhere 엑셀 파일 업로드
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Payhere 대시보드에서 다운로드한 엑셀 파일을 업로드하세요.
                결제 내역과 기간별 집계 엑셀을 모두 지원합니다.
              </p>
              <ExcelUpload onUploadComplete={handleUploadComplete} />

              <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">지원하는 파일 형식</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>결제 내역</strong>: 영업일, 결제(환불)일, 결제 시간, 결제(환불)내역, 합계, 결제 금액, 할인, 포인트 사용</li>
                  <li>• <strong>기간별 조회</strong>: 영업일, 결제 건수, 총 매출, 실 매출, 할인, 포인트 사용, 환불 금액</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        ) : activeTab === 'settlements' ? (
          /* 정산 내역 */
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-medium text-gray-500">
                      정산 기간
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-medium text-gray-500">
                      거래 건수
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-medium text-gray-500">
                      총 매출
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-medium text-gray-500">
                      수수료
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-medium text-gray-500">
                      정산액
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-center text-sm font-medium text-gray-500">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement, index) => (
                    <motion.tr
                      key={settlement.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-50 hover:bg-white/50"
                    >
                      <td className="px-4 lg:px-6 py-4">
                        <p className="font-medium text-gray-900 text-sm">
                          {formatDate(settlement.periodStart)} ~ {formatDate(settlement.periodEnd)}
                        </p>
                        <p className="text-xs text-gray-500">
                          정산일: {formatDate(settlement.settlementDate)}
                        </p>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right text-gray-900">
                        {settlement.transactionCount}건
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right text-gray-900">
                        {formatCurrency(settlement.totalAmount)}원
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right text-red-500">
                        -{formatCurrency(settlement.fee)}원
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right font-bold text-primary">
                        {formatCurrency(settlement.netAmount)}원
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-center">
                        {getStatusBadge(settlement.status)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ) : (
          /* 매출 내역 */
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-medium text-gray-500">
                      날짜
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-medium text-gray-500">
                      원생
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-medium text-gray-500">
                      수강 과정
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-medium text-gray-500">
                      금액
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-center text-sm font-medium text-gray-500">
                      결제 방법
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-center text-sm font-medium text-gray-500">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale, index) => (
                    <motion.tr
                      key={sale.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-50 hover:bg-white/50"
                    >
                      <td className="px-4 lg:px-6 py-4 text-gray-900">
                        {formatDate(sale.date)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 font-medium text-gray-900">
                        {sale.studentName}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-gray-600">
                        {sale.productName}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(sale.amount)}원
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-center text-sm text-gray-600">
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-center">
                        {getStatusBadge(sale.status)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* 안내 메시지 */}
        {activeTab !== 'upload' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-medium">엑셀 업로드:</span> Payhere 대시보드에서 엑셀을 다운로드하여 &ldquo;엑셀 업로드&rdquo; 탭에서 업로드하면 실제 매출 데이터를 확인할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* 업로드 모달 */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    Payhere 엑셀 업로드
                  </h3>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <ExcelUpload
                  onUploadComplete={(result) => {
                    if (result.success) {
                      setShowUploadModal(false)
                      handleUploadComplete()
                    }
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}

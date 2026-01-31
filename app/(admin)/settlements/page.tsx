'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button } from '@/components/ui'
import { Settlement, SalesItem } from '@/lib/payhere/types'

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [recentSales, setRecentSales] = useState<SalesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'settlements' | 'sales'>('settlements')

  useEffect(() => {
    const fetchData = async () => {
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
    }

    fetchData()
  }, [])

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
        <div className="flex gap-2 mb-6">
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
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
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

        {/* Mock 안내 */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Mock 데이터:</span> 현재 표시되는 데이터는 Mock 데이터입니다.
            실제 Payhere API 연동 시 실제 매출 데이터로 교체됩니다.
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}

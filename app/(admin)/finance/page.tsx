'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Select } from '@/components/ui'

interface MonthlyData {
  month: string
  payhere_sales: number
  revenues: number
  expenses: number
  total_income: number
  net_profit: number
}

interface YearlyTotals {
  total_payhere_sales: number
  total_revenues: number
  total_income: number
  total_expenses: number
  total_fixed_expenses: number
  total_variable_expenses: number
  net_profit: number
}

interface ExpensesByCategory {
  rent: number
  salary: number
  utilities: number
  operations: number
  materials: number
  other: number
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: '임대료',
  salary: '급여',
  utilities: '공과금',
  operations: '운영비',
  materials: '교재/재료비',
  other: '기타',
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export default function FinancePage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear.toString())
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [yearly, setYearly] = useState<YearlyTotals | null>(null)
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategory | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/summary?year=${year}`)
      const data = await res.json()
      if (data.success) {
        setMonthly(data.data.monthly)
        setYearly(data.data.yearly)
        setExpensesByCategory(data.data.expenses_by_category)
      }
    } catch (error) {
      console.error('Failed to fetch finance data:', error)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`
    }
    return `${amount.toLocaleString()}원`
  }

  const maxIncome = Math.max(...monthly.map((m) => m.total_income), 1)
  const maxExpense = Math.max(...monthly.map((m) => m.expenses), 1)

  return (
    <AdminLayout>
      <Header title="재무 관리" subtitle={`${year}년 재무 현황`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* 년도 선택 및 바로가기 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="w-32">
            <Select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              options={[
                { value: (currentYear - 1).toString(), label: `${currentYear - 1}년` },
                { value: currentYear.toString(), label: `${currentYear}년` },
                { value: (currentYear + 1).toString(), label: `${currentYear + 1}년` },
              ]}
            />
          </div>
          <div className="flex gap-3">
            <Link href="/finance/revenues">
              <Button variant="outline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                매출 관리
              </Button>
            </Link>
            <Link href="/finance/expenses">
              <Button variant="outline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                지출 관리
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">로딩 중...</div>
        ) : (
          <div className="space-y-6">
            {/* 연간 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="p-6">
                  <p className="text-sm text-gray-500 mb-1">총 매출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(yearly?.total_income || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Payhere {formatCurrency(yearly?.total_payhere_sales || 0)} + 기타 {formatCurrency(yearly?.total_revenues || 0)}
                  </p>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GlassCard className="p-6">
                  <p className="text-sm text-gray-500 mb-1">총 지출</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(yearly?.total_expenses || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    고정비 {formatCurrency(yearly?.total_fixed_expenses || 0)} + 변동비 {formatCurrency(yearly?.total_variable_expenses || 0)}
                  </p>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <GlassCard className="p-6">
                  <p className="text-sm text-gray-500 mb-1">순이익</p>
                  <p className={`text-2xl font-bold ${(yearly?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(yearly?.net_profit || 0) >= 0 ? '+' : ''}{formatCurrency(yearly?.net_profit || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    영업이익률 {yearly?.total_income ? ((yearly.net_profit / yearly.total_income) * 100).toFixed(1) : 0}%
                  </p>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <GlassCard className="p-6">
                  <p className="text-sm text-gray-500 mb-1">월 평균 순이익</p>
                  <p className={`text-2xl font-bold ${((yearly?.net_profit || 0) / 12) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.round((yearly?.net_profit || 0) / 12))}
                  </p>
                </GlassCard>
              </motion.div>
            </div>

            {/* 월별 매출/지출 차트 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GlassCard className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">월별 매출/지출</h2>
                <div className="space-y-3">
                  {monthly.map((m, index) => (
                    <div key={m.month} className="flex items-center gap-4">
                      <span className="w-10 text-sm text-gray-500">{MONTHS[index]}</span>
                      <div className="flex-1 flex gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="h-5 bg-primary rounded"
                              style={{ width: `${(m.total_income / maxIncome) * 100}%`, minWidth: m.total_income > 0 ? '4px' : 0 }}
                            />
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              {m.total_income > 0 ? formatCurrency(m.total_income) : '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-5 bg-red-400 rounded"
                              style={{ width: `${(m.expenses / maxExpense) * 100}%`, minWidth: m.expenses > 0 ? '4px' : 0 }}
                            />
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              {m.expenses > 0 ? formatCurrency(m.expenses) : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="w-20 text-right">
                          <span className={`text-sm font-medium ${m.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {m.net_profit >= 0 ? '+' : ''}{formatCurrency(m.net_profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded" />
                    <span className="text-gray-600">매출</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded" />
                    <span className="text-gray-600">지출</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* 카테고리별 지출 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GlassCard className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">카테고리별 지출</h2>
                {expensesByCategory && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(expensesByCategory).map(([category, amount]) => (
                      <div key={category} className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500">{CATEGORY_LABELS[category] || category}</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(amount)}</p>
                        <p className="text-xs text-gray-400">
                          {yearly?.total_expenses
                            ? `${((amount / yearly.total_expenses) * 100).toFixed(1)}%`
                            : '0%'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

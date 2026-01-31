'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui'
import Link from 'next/link'

interface SalesSummary {
  todaySales: number
  monthSales: number
  pendingSettlement: number
  lastUpdated: string
}

export default function SalesCard() {
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/payhere/sales?type=summary')
        const data = await res.json()
        if (data.success) {
          setSummary(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch sales summary:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount)
  }

  if (loading) {
    return (
      <GlassCard className="p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  if (!summary) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">매출 현황</h3>
          <Link
            href="/settlements"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            정산 내역 →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white/50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">오늘 매출</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(summary.todaySales)}
              <span className="text-sm font-normal text-gray-500">원</span>
            </p>
          </div>

          <div className="p-4 bg-white/50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">이번 달 매출</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(summary.monthSales)}
              <span className="text-sm font-normal text-gray-500">원</span>
            </p>
          </div>

          <div className="p-4 bg-white/50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">정산 예정</p>
            <p className="text-xl font-bold text-secondary">
              {formatCurrency(summary.pendingSettlement)}
              <span className="text-sm font-normal text-gray-500">원</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-right">
          마지막 업데이트: {new Date(summary.lastUpdated).toLocaleString('ko-KR')}
        </p>
      </GlassCard>
    </motion.div>
  )
}

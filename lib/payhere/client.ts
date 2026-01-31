/**
 * Payhere 데이터 클라이언트
 * DB에서 실제 데이터 조회 + Mock 데이터 폴백
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { SalesSummary, SalesItem, Settlement, DailySales } from './types'

// 날짜 포맷 헬퍼
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/**
 * 매출 요약 조회
 * DB에 데이터가 있으면 실제 데이터, 없으면 Mock
 */
export async function getSalesSummary(): Promise<SalesSummary> {
  try {
    const supabase = createAdminClient()
    const today = formatDate(new Date())
    const monthStart = formatDate(getStartOfMonth(new Date()))
    const monthEnd = formatDate(getEndOfMonth(new Date()))

    // 오늘 매출 조회
    const { data: todayData } = await supabase
      .from('sales_records')
      .select('amount')
      .eq('sale_date', today)
      .eq('status', 'completed')

    // 이번 달 매출 조회
    const { data: monthData } = await supabase
      .from('sales_records')
      .select('amount')
      .gte('sale_date', monthStart)
      .lte('sale_date', monthEnd)
      .eq('status', 'completed')

    // 미정산 금액 조회
    const { data: pendingData } = await supabase
      .from('settlement_records')
      .select('total_amount')
      .eq('status', 'pending')

    const hasData = (todayData && todayData.length > 0) ||
                   (monthData && monthData.length > 0) ||
                   (pendingData && pendingData.length > 0)

    if (hasData) {
      const todaySales = todayData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const monthSales = monthData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const pendingSettlement = pendingData?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0

      return {
        todaySales,
        monthSales,
        pendingSettlement,
        lastUpdated: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error('DB query error:', error)
  }

  // Mock 데이터 폴백
  return {
    todaySales: Math.floor(Math.random() * 500000) + 100000,
    monthSales: Math.floor(Math.random() * 5000000) + 2000000,
    pendingSettlement: Math.floor(Math.random() * 1000000) + 500000,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * 매출 목록 조회
 */
export async function getSalesList(params: {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}): Promise<{ items: SalesItem[]; total: number }> {
  const { limit = 20, offset = 0 } = params

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('sales_records')
      .select('*', { count: 'exact' })
      .order('sale_date', { ascending: false })

    if (params.startDate) {
      query = query.gte('sale_date', params.startDate)
    }
    if (params.endDate) {
      query = query.lte('sale_date', params.endDate)
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)

    if (!error && data && data.length > 0) {
      const items: SalesItem[] = data.map(record => ({
        id: record.id,
        date: record.sale_date,
        studentName: record.student_name || '미지정',
        productName: record.product_name || record.description || '기타',
        amount: record.amount,
        paymentMethod: (record.payment_method as SalesItem['paymentMethod']) || 'card',
        status: (record.status as SalesItem['status']) || 'completed',
      }))

      return { items, total: count || items.length }
    }
  } catch (error) {
    console.error('DB query error:', error)
  }

  // Mock 데이터 폴백
  return generateMockSalesList(limit, offset)
}

/**
 * 정산 목록 조회
 */
export async function getSettlements(params: {
  year?: number
  month?: number
  limit?: number
}): Promise<{ items: Settlement[]; total: number }> {
  const { year = new Date().getFullYear(), limit = 12 } = params

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('settlement_records')
      .select('*', { count: 'exact' })
      .order('period_start', { ascending: false })

    // 연도 필터
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`
    query = query.gte('period_start', yearStart).lte('period_end', yearEnd)

    if (params.month) {
      const monthStr = String(params.month).padStart(2, '0')
      const monthStart = `${year}-${monthStr}-01`
      const monthEnd = `${year}-${monthStr}-31`
      query = query.gte('period_start', monthStart).lte('period_end', monthEnd)
    }

    const { data, count, error } = await query.limit(limit)

    if (!error && data && data.length > 0) {
      const items: Settlement[] = data.map(record => ({
        id: record.id,
        settlementDate: record.settlement_date || record.period_end,
        periodStart: record.period_start,
        periodEnd: record.period_end,
        totalAmount: record.total_amount,
        fee: record.fee || 0,
        netAmount: record.net_amount,
        status: (record.status as Settlement['status']) || 'pending',
        transactionCount: record.transaction_count || 0,
      }))

      return { items, total: count || items.length }
    }
  } catch (error) {
    console.error('DB query error:', error)
  }

  // Mock 데이터 폴백
  return generateMockSettlements(year, params.month, limit)
}

/**
 * 일별 매출 통계
 */
export async function getDailySales(params: {
  startDate: string
  endDate: string
}): Promise<DailySales[]> {
  try {
    const supabase = createAdminClient()

    // daily_sales_summary 테이블에서 조회
    const { data: summaryData, error: summaryError } = await supabase
      .from('daily_sales_summary')
      .select('*')
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .order('date', { ascending: true })

    if (!summaryError && summaryData && summaryData.length > 0) {
      return summaryData.map(record => ({
        date: record.date,
        amount: record.net_sales || record.total_sales,
        count: record.transaction_count,
      }))
    }

    // sales_records에서 집계
    const { data: salesData, error: salesError } = await supabase
      .from('sales_records')
      .select('sale_date, amount')
      .gte('sale_date', params.startDate)
      .lte('sale_date', params.endDate)
      .eq('status', 'completed')

    if (!salesError && salesData && salesData.length > 0) {
      // 날짜별 집계
      const dailyMap = new Map<string, { amount: number; count: number }>()

      for (const record of salesData) {
        const existing = dailyMap.get(record.sale_date) || { amount: 0, count: 0 }
        existing.amount += record.amount
        existing.count += 1
        dailyMap.set(record.sale_date, existing)
      }

      const result: DailySales[] = []
      const start = new Date(params.startDate)
      const end = new Date(params.endDate)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDate(new Date(d))
        const data = dailyMap.get(dateStr) || { amount: 0, count: 0 }
        result.push({
          date: dateStr,
          amount: data.amount,
          count: data.count,
        })
      }

      return result
    }
  } catch (error) {
    console.error('DB query error:', error)
  }

  // Mock 데이터 폴백
  return generateMockDailySales(params.startDate, params.endDate)
}

// ============================================
// Mock 데이터 생성 함수 (폴백용)
// ============================================

function generateMockId(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function generateMockSalesList(limit: number, offset: number): { items: SalesItem[]; total: number } {
  const mockItems: SalesItem[] = []
  const studentNames = ['김철수', '이영희', '박지민', '최수진', '정민준', '한서연']
  const products = ['기초반', '중급반', '고급반', '성인반']
  const methods: SalesItem['paymentMethod'][] = ['card', 'cash', 'transfer']

  for (let i = 0; i < 50; i++) {
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))

    mockItems.push({
      id: generateMockId(),
      date: formatDate(date),
      studentName: studentNames[Math.floor(Math.random() * studentNames.length)],
      productName: products[Math.floor(Math.random() * products.length)],
      amount: [150000, 180000, 200000, 120000][Math.floor(Math.random() * 4)],
      paymentMethod: methods[Math.floor(Math.random() * methods.length)],
      status: Math.random() > 0.05 ? 'completed' : 'pending',
    })
  }

  mockItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    items: mockItems.slice(offset, offset + limit),
    total: mockItems.length,
  }
}

function generateMockSettlements(year: number, month: number | undefined, limit: number): { items: Settlement[]; total: number } {
  const mockSettlements: Settlement[] = []

  for (let i = 0; i < 12; i++) {
    const date = new Date(year, (month || new Date().getMonth()) - i, 15)
    const periodStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const totalAmount = Math.floor(Math.random() * 3000000) + 2000000
    const fee = Math.floor(totalAmount * 0.033)

    mockSettlements.push({
      id: generateMockId(),
      settlementDate: formatDate(date),
      periodStart: formatDate(periodStart),
      periodEnd: formatDate(periodEnd),
      totalAmount,
      fee,
      netAmount: totalAmount - fee,
      status: i < 2 ? 'pending' : 'completed',
      transactionCount: Math.floor(Math.random() * 30) + 10,
    })
  }

  return {
    items: mockSettlements.slice(0, limit),
    total: mockSettlements.length,
  }
}

function generateMockDailySales(startDate: string, endDate: string): DailySales[] {
  const dailySales: DailySales[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dailySales.push({
      date: formatDate(new Date(d)),
      amount: Math.floor(Math.random() * 500000) + 50000,
      count: Math.floor(Math.random() * 5) + 1,
    })
  }

  return dailySales
}

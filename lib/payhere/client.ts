/**
 * Payhere API 클라이언트 (Mock)
 * 실제 API 연동 전 Mock 데이터 반환
 */

import { SalesSummary, SalesItem, Settlement, DailySales } from './types'

// Mock 데이터 생성 헬퍼
function generateMockId(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * 매출 요약 조회 (Mock)
 */
export async function getSalesSummary(): Promise<SalesSummary> {
  // Mock: 랜덤 매출 데이터 생성
  const todaySales = Math.floor(Math.random() * 500000) + 100000
  const monthSales = Math.floor(Math.random() * 5000000) + 2000000
  const pendingSettlement = Math.floor(Math.random() * 1000000) + 500000

  return {
    todaySales,
    monthSales,
    pendingSettlement,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * 매출 목록 조회 (Mock)
 */
export async function getSalesList(params: {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}): Promise<{ items: SalesItem[]; total: number }> {
  const { limit = 20, offset = 0 } = params

  // Mock: 최근 30일 매출 데이터 생성
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

  // 날짜 정렬
  mockItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    items: mockItems.slice(offset, offset + limit),
    total: mockItems.length,
  }
}

/**
 * 정산 목록 조회 (Mock)
 */
export async function getSettlements(params: {
  year?: number
  month?: number
  limit?: number
}): Promise<{ items: Settlement[]; total: number }> {
  const { year = new Date().getFullYear(), month, limit = 12 } = params

  const mockSettlements: Settlement[] = []

  // 최근 12개월 정산 데이터
  for (let i = 0; i < 12; i++) {
    const date = new Date(year, (month || new Date().getMonth()) - i, 15)
    const periodStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const totalAmount = Math.floor(Math.random() * 3000000) + 2000000
    const fee = Math.floor(totalAmount * 0.033) // 3.3% 수수료

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

/**
 * 일별 매출 통계 (Mock)
 */
export async function getDailySales(params: {
  startDate: string
  endDate: string
}): Promise<DailySales[]> {
  const { startDate, endDate } = params
  const start = new Date(startDate)
  const end = new Date(endDate)
  const dailySales: DailySales[] = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dailySales.push({
      date: formatDate(new Date(d)),
      amount: Math.floor(Math.random() * 500000) + 50000,
      count: Math.floor(Math.random() * 5) + 1,
    })
  }

  return dailySales
}

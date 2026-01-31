/**
 * Payhere 관련 타입 정의
 */

export interface SalesSummary {
  todaySales: number
  monthSales: number
  pendingSettlement: number
  lastUpdated: string
}

export interface SalesItem {
  id: string
  date: string
  studentName: string
  productName: string
  amount: number
  paymentMethod: 'card' | 'cash' | 'transfer'
  status: 'completed' | 'pending' | 'refunded'
}

export interface Settlement {
  id: string
  settlementDate: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  fee: number
  netAmount: number
  status: 'pending' | 'completed'
  transactionCount: number
}

export interface DailySales {
  date: string
  amount: number
  count: number
}

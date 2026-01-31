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

// DB 레코드 타입
export interface SalesRecord {
  id?: string
  sale_date: string
  payment_date?: string
  payment_time?: string
  student_name?: string
  product_name?: string
  description?: string
  total_amount: number
  amount: number
  discount?: number
  point_used?: number
  payment_method?: string
  status?: 'completed' | 'pending' | 'refunded'
  source?: 'excel' | 'manual'
  import_batch_id?: string
}

export interface DailySalesSummary {
  id?: string
  date: string
  transaction_count: number
  total_sales: number
  net_sales: number
  discount?: number
  point_used?: number
  refund_amount?: number
  source?: 'excel' | 'manual' | 'calculated'
  import_batch_id?: string
}

export interface SettlementRecord {
  id?: string
  period_start: string
  period_end: string
  settlement_date?: string
  total_amount: number
  fee?: number
  net_amount: number
  transaction_count?: number
  status?: 'pending' | 'completed'
  source?: 'excel' | 'manual'
  import_batch_id?: string
}

export interface ImportLog {
  id?: string
  batch_id: string
  file_name: string
  file_type: 'sales' | 'daily_summary' | 'settlement'
  records_count: number
  success_count: number
  error_count: number
  errors?: Record<string, string>[]
  imported_by?: string
}

// Excel 파싱 결과 타입
export interface ParseResult<T> {
  success: boolean
  data: T[]
  errors: { row: number; message: string }[]
  totalRows: number
}

export type ExcelFileType = 'sales' | 'daily_summary' | 'settlement'

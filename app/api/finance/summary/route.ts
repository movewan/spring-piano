import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

// GET - 재무 요약 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    const adminClient = createAdminClient()

    // 1. Payhere 매출 (daily_sales_summary) 월별 합계
    const { data: payhereData } = await adminClient
      .from('daily_sales_summary')
      .select('date, net_sales')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)

    // 2. 수동 매출 (revenues) 월별 합계
    const { data: revenues } = await adminClient
      .from('revenues')
      .select('amount, date')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)

    // 3. 지출 (expenses) 월별/카테고리별 합계
    const { data: expenses } = await adminClient
      .from('expenses')
      .select('amount, date, category, is_fixed')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)

    // 월별 데이터 집계
    const monthlyData: Record<string, {
      payhere_sales: number
      revenues: number
      expenses: number
      fixed_expenses: number
      variable_expenses: number
    }> = {}

    // 12개월 초기화
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${m.toString().padStart(2, '0')}`
      monthlyData[monthKey] = {
        payhere_sales: 0,
        revenues: 0,
        expenses: 0,
        fixed_expenses: 0,
        variable_expenses: 0,
      }
    }

    // Payhere 매출 합계
    payhereData?.forEach((record) => {
      const monthKey = record.date.slice(0, 7)
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].payhere_sales += record.net_sales
      }
    })

    // 수동 매출 합계
    revenues?.forEach((r) => {
      const monthKey = r.date.slice(0, 7)
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenues += r.amount
      }
    })

    // 지출 합계
    expenses?.forEach((e) => {
      const monthKey = e.date.slice(0, 7)
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expenses += e.amount
        if (e.is_fixed) {
          monthlyData[monthKey].fixed_expenses += e.amount
        } else {
          monthlyData[monthKey].variable_expenses += e.amount
        }
      }
    })

    // 카테고리별 지출 집계
    const expensesByCategory: Record<string, number> = {
      rent: 0,
      salary: 0,
      utilities: 0,
      operations: 0,
      materials: 0,
      other: 0,
    }

    expenses?.forEach((e) => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount
    })

    // 연간 총계
    const yearlyTotals = Object.values(monthlyData).reduce(
      (acc, month) => ({
        total_payhere_sales: acc.total_payhere_sales + month.payhere_sales,
        total_revenues: acc.total_revenues + month.revenues,
        total_income: acc.total_income + month.payhere_sales + month.revenues,
        total_expenses: acc.total_expenses + month.expenses,
        total_fixed_expenses: acc.total_fixed_expenses + month.fixed_expenses,
        total_variable_expenses: acc.total_variable_expenses + month.variable_expenses,
        net_profit: acc.net_profit + (month.payhere_sales + month.revenues - month.expenses),
      }),
      {
        total_payhere_sales: 0,
        total_revenues: 0,
        total_income: 0,
        total_expenses: 0,
        total_fixed_expenses: 0,
        total_variable_expenses: 0,
        net_profit: 0,
      }
    )

    // 월별 배열로 변환
    const monthlyArray = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
      total_income: data.payhere_sales + data.revenues,
      net_profit: data.payhere_sales + data.revenues - data.expenses,
    }))

    return successResponse({
      year,
      monthly: monthlyArray,
      yearly: yearlyTotals,
      expenses_by_category: expensesByCategory,
    })
  } catch (error) {
    console.error('Finance summary API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

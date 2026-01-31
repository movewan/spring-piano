import { NextRequest, NextResponse } from 'next/server'
import { getSalesSummary, getSalesList, getDailySales } from '@/lib/payhere/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'

    if (type === 'summary') {
      const summary = await getSalesSummary()
      return NextResponse.json({
        success: true,
        data: summary,
      })
    }

    if (type === 'list') {
      const startDate = searchParams.get('start_date') || undefined
      const endDate = searchParams.get('end_date') || undefined
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')

      const result = await getSalesList({ startDate, endDate, limit, offset })
      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    if (type === 'daily') {
      const startDate = searchParams.get('start_date')
      const endDate = searchParams.get('end_date')

      if (!startDate || !endDate) {
        return NextResponse.json(
          { success: false, error: 'start_date와 end_date가 필요합니다' },
          { status: 400 }
        )
      }

      const dailySales = await getDailySales({ startDate, endDate })
      return NextResponse.json({
        success: true,
        data: { dailySales },
      })
    }

    return NextResponse.json(
      { success: false, error: '유효하지 않은 type입니다' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Payhere sales API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

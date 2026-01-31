import { NextRequest, NextResponse } from 'next/server'
import { getSettlements } from '@/lib/payhere/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const limit = parseInt(searchParams.get('limit') || '12')

    const result = await getSettlements({ year, month, limit })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Payhere settlements API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

// GET - 결제 내역 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const monthYear = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const studentId = searchParams.get('student_id')

    const adminClient = createAdminClient()

    let query = adminClient
      .from('payments')
      .select(`
        *,
        student:students(id, name, family_id, family:families(discount_tier))
      `)
      .eq('month_year', monthYear)

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: payments, error } = await query.order('payment_date', { ascending: false })

    if (error) {
      console.error('Payments fetch error:', error)
      return errorResponse('Failed to fetch payments', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ payments })
  } catch (error) {
    console.error('Payments API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// POST - 결제 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.student_id || !body.base_amount || !body.payment_date || !body.month_year) {
      return errorResponse('Missing required fields', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    // 가족 할인 계산
    let familyDiscount = 0
    const { data: student } = await adminClient
      .from('students')
      .select('family_id, family:families(discount_tier)')
      .eq('id', body.student_id)
      .single()

    if (student?.family) {
      const discountTier = (student.family as unknown as { discount_tier: number }).discount_tier
      const discountRate = discountTier === 2 ? 0.1 : discountTier === 1 ? 0.05 : 0
      familyDiscount = Math.floor(body.base_amount * discountRate)
    }

    const additionalDiscount = body.additional_discount || 0
    const finalAmount = body.base_amount - familyDiscount - additionalDiscount

    const { data: payment, error } = await adminClient
      .from('payments')
      .insert({
        student_id: body.student_id,
        base_amount: body.base_amount,
        family_discount: familyDiscount,
        additional_discount: additionalDiscount,
        final_amount: finalAmount,
        payment_method: body.payment_method || null,
        payment_date: body.payment_date,
        month_year: body.month_year,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Payment creation error:', error)
      return errorResponse('Failed to create payment', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ payment, family_discount: familyDiscount }, 201)
  } catch (error) {
    console.error('Create payment API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

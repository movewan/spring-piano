import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

// GET - 지출 조회
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
    const month = searchParams.get('month')
    const category = searchParams.get('category')

    const adminClient = createAdminClient()

    let query = adminClient
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })

    // 년도/월 필터
    const startDate = month
      ? `${year}-${month.padStart(2, '0')}-01`
      : `${year}-01-01`
    const endDate = month
      ? `${year}-${month.padStart(2, '0')}-31`
      : `${year}-12-31`

    query = query.gte('date', startDate).lte('date', endDate)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: expenses, error } = await query

    if (error) {
      console.error('Expenses fetch error:', error)
      return errorResponse('Failed to fetch expenses', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ expenses })
  } catch (error) {
    console.error('Expenses API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// POST - 지출 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.date || !body.description || !body.amount || !body.category) {
      return errorResponse('Missing required fields', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const { data: expense, error } = await adminClient
      .from('expenses')
      .insert({
        date: body.date,
        description: body.description,
        amount: body.amount,
        category: body.category,
        is_fixed: body.is_fixed || false,
        is_recurring: body.is_recurring || false,
        recurring_day: body.recurring_day || null,
        recurring_until: body.recurring_until || null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Expense creation error:', error)
      return errorResponse('Failed to create expense', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ expense }, 201)
  } catch (error) {
    console.error('Create expense API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// PUT - 지출 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.id) {
      return errorResponse('Expense ID is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (body.date !== undefined) updateData.date = body.date
    if (body.description !== undefined) updateData.description = body.description
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.category !== undefined) updateData.category = body.category
    if (body.is_fixed !== undefined) updateData.is_fixed = body.is_fixed
    if (body.is_recurring !== undefined) updateData.is_recurring = body.is_recurring
    if (body.recurring_day !== undefined) updateData.recurring_day = body.recurring_day
    if (body.recurring_until !== undefined) updateData.recurring_until = body.recurring_until
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data: expense, error } = await adminClient
      .from('expenses')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Expense update error:', error)
      return errorResponse('Failed to update expense', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ expense })
  } catch (error) {
    console.error('Update expense API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// DELETE - 지출 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Expense ID is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Expense delete error:', error)
      return errorResponse('Failed to delete expense', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Delete expense API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

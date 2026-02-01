import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

// GET - 매출 조회
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

    const adminClient = createAdminClient()

    let query = adminClient
      .from('revenues')
      .select('*')
      .order('date', { ascending: false })

    // 년도 필터
    const startDate = month
      ? `${year}-${month.padStart(2, '0')}-01`
      : `${year}-01-01`
    const endDate = month
      ? `${year}-${month.padStart(2, '0')}-31`
      : `${year}-12-31`

    query = query.gte('date', startDate).lte('date', endDate)

    const { data: revenues, error } = await query

    if (error) {
      console.error('Revenues fetch error:', error)
      return errorResponse('Failed to fetch revenues', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ revenues })
  } catch (error) {
    console.error('Revenues API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// POST - 매출 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.date || !body.description || !body.amount) {
      return errorResponse('Missing required fields', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const { data: revenue, error } = await adminClient
      .from('revenues')
      .insert({
        date: body.date,
        description: body.description,
        amount: body.amount,
        category: body.category || 'other',
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Revenue creation error:', error)
      return errorResponse('Failed to create revenue', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ revenue }, 201)
  } catch (error) {
    console.error('Create revenue API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// PUT - 매출 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.id) {
      return errorResponse('Revenue ID is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (body.date !== undefined) updateData.date = body.date
    if (body.description !== undefined) updateData.description = body.description
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.category !== undefined) updateData.category = body.category
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data: revenue, error } = await adminClient
      .from('revenues')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Revenue update error:', error)
      return errorResponse('Failed to update revenue', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ revenue })
  } catch (error) {
    console.error('Update revenue API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// DELETE - 매출 삭제
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
      return errorResponse('Revenue ID is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('revenues')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Revenue delete error:', error)
      return errorResponse('Failed to delete revenue', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ message: 'Revenue deleted successfully' })
  } catch (error) {
    console.error('Delete revenue API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

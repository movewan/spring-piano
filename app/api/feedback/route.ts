import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

// GET - 피드백 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const monthYear = searchParams.get('month')
    const studentId = searchParams.get('student_id')

    const adminClient = createAdminClient()

    let query = adminClient
      .from('feedback')
      .select(`
        *,
        student:students(id, name),
        teacher:teachers(id, name)
      `)

    if (monthYear) {
      query = query.eq('month_year', monthYear)
    }

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: feedback, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Feedback fetch error:', error)
      return errorResponse('Failed to fetch feedback', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ feedback })
  } catch (error) {
    console.error('Feedback API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// POST - 피드백 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.student_id || !body.teacher_id || !body.month_year || !body.content) {
      return errorResponse('Missing required fields', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const { data: feedback, error } = await adminClient
      .from('feedback')
      .insert({
        student_id: body.student_id,
        teacher_id: body.teacher_id,
        month_year: body.month_year,
        content: body.content,
        video_url: body.video_url || null,
        is_published: body.is_published || false,
        published_at: body.is_published ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Feedback creation error:', error)
      return errorResponse('Failed to create feedback', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ feedback }, 201)
  } catch (error) {
    console.error('Create feedback API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// PUT - 피드백 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.id) {
      return errorResponse('Feedback ID is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (body.content !== undefined) updateData.content = body.content
    if (body.video_url !== undefined) updateData.video_url = body.video_url
    if (body.is_published !== undefined) {
      updateData.is_published = body.is_published
      if (body.is_published) {
        updateData.published_at = new Date().toISOString()
      }
    }

    const { data: feedback, error } = await adminClient
      .from('feedback')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Feedback update error:', error)
      return errorResponse('Failed to update feedback', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ feedback })
  } catch (error) {
    console.error('Update feedback API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

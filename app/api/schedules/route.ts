import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

// GET - 스케줄 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const day = searchParams.get('day')
    const teacherId = searchParams.get('teacher_id')

    const adminClient = createAdminClient()

    let query = adminClient
      .from('schedules')
      .select(`
        *,
        student:students(id, name),
        teacher:teachers(id, name, color)
      `)
      .eq('is_active', true)

    if (day) {
      query = query.eq('day_of_week', parseInt(day))
    }

    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    const { data: schedules, error } = await query.order('start_time')

    if (error) {
      console.error('Schedules fetch error:', error)
      return errorResponse('Failed to fetch schedules', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ schedules })
  } catch (error) {
    console.error('Schedules API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// POST - 스케줄 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.student_id || !body.teacher_id || body.day_of_week === undefined || !body.start_time || !body.end_time) {
      return errorResponse('Missing required fields', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    // 시간 겹침 확인
    const { data: conflicts } = await adminClient
      .from('schedules')
      .select('id')
      .eq('teacher_id', body.teacher_id)
      .eq('day_of_week', body.day_of_week)
      .eq('is_active', true)
      .or(`and(start_time.lt.${body.end_time},end_time.gt.${body.start_time})`)

    if (conflicts && conflicts.length > 0) {
      return errorResponse('Schedule conflicts with existing schedule', 400, ErrorCodes.DUPLICATE_ENTRY)
    }

    const { data: schedule, error } = await adminClient
      .from('schedules')
      .insert({
        student_id: body.student_id,
        teacher_id: body.teacher_id,
        day_of_week: body.day_of_week,
        start_time: body.start_time,
        end_time: body.end_time,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Schedule creation error:', error)
      return errorResponse('Failed to create schedule', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ schedule }, 201)
  } catch (error) {
    console.error('Create schedule API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// DELETE - 스케줄 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return errorResponse('Schedule ID is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('schedules')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Schedule deletion error:', error)
      return errorResponse('Failed to delete schedule', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ message: 'Schedule deleted successfully' })
  } catch (error) {
    console.error('Delete schedule API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

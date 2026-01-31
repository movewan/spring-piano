import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'
import { verifyParentToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    // JWT 검증
    const cookieStore = await cookies()
    const token = cookieStore.get('parent_token')?.value

    if (!token) {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const payload = verifyParentToken(token)
    if (!payload) {
      return errorResponse('Invalid token', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('student_id')
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    const adminClient = createAdminClient()

    // 먼저 이 학부모가 해당 학생의 보호자인지 확인
    if (studentId) {
      const { data: relation } = await adminClient
        .from('parent_student_relations')
        .select('id')
        .eq('parent_id', payload.parentId)
        .eq('student_id', studentId)
        .single()

      if (!relation) {
        return errorResponse('Forbidden', 403, ErrorCodes.FORBIDDEN)
      }
    }

    // 월의 시작과 끝 계산
    const startDate = `${month}-01`
    const endDate = new Date(
      parseInt(month.slice(0, 4)),
      parseInt(month.slice(5, 7)),
      0
    ).toISOString().split('T')[0]

    // 자녀의 출석 기록 조회
    let query = adminClient
      .from('attendance')
      .select(`
        id,
        check_in_time,
        check_out_time,
        student:students(id, name)
      `)
      .gte('check_in_time', startDate)
      .lte('check_in_time', `${endDate}T23:59:59`)

    if (studentId) {
      query = query.eq('student_id', studentId)
    } else {
      // 모든 자녀의 출석 조회
      const { data: relations } = await adminClient
        .from('parent_student_relations')
        .select('student_id')
        .eq('parent_id', payload.parentId)

      const studentIds = relations?.map((r) => r.student_id) || []
      if (studentIds.length === 0) {
        return successResponse({ attendance: [] })
      }
      query = query.in('student_id', studentIds)
    }

    const { data: attendance, error } = await query.order('check_in_time', { ascending: false })

    if (error) {
      console.error('Attendance fetch error:', error)
      return errorResponse('Failed to fetch attendance', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ attendance })
  } catch (error) {
    console.error('Attendance API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

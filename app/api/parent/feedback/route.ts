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

    // 자녀의 피드백 조회
    let query = adminClient
      .from('feedback')
      .select(`
        id,
        month_year,
        content,
        video_url,
        created_at,
        teacher:teachers(name),
        student:students(id, name)
      `)
      .eq('is_published', true)

    if (studentId) {
      query = query.eq('student_id', studentId)
    } else {
      // 모든 자녀의 피드백 조회
      const { data: relations } = await adminClient
        .from('parent_student_relations')
        .select('student_id')
        .eq('parent_id', payload.parentId)

      const studentIds = relations?.map((r) => r.student_id) || []
      if (studentIds.length === 0) {
        return successResponse({ feedback: [] })
      }
      query = query.in('student_id', studentIds)
    }

    const { data: feedback, error } = await query.order('month_year', { ascending: false })

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

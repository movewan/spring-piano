import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes, checkRateLimit } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting (IP 기반)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = checkRateLimit(`kiosk-checkin:${ip}`, 5, 10000) // 10초에 5회

    if (!rateLimitResult.allowed) {
      return errorResponse(
        '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
        429,
        ErrorCodes.RATE_LIMITED
      )
    }

    const body = await request.json()
    const { student_id } = body

    if (!student_id) {
      return errorResponse('학생 ID가 필요합니다', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    // 오늘 이미 출석했는지 확인
    const today = new Date().toISOString().split('T')[0]
    const { data: existingAttendance } = await adminClient
      .from('attendance')
      .select('id')
      .eq('student_id', student_id)
      .gte('check_in_time', today)
      .limit(1)

    if (existingAttendance && existingAttendance.length > 0) {
      return errorResponse('오늘 이미 출석했습니다', 400, ErrorCodes.DUPLICATE_ENTRY)
    }

    // 출석 체크
    const { data: attendance, error } = await adminClient
      .from('attendance')
      .insert({
        student_id,
        check_in_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Kiosk checkin error:', error)
      return errorResponse('출석 체크 중 오류가 발생했습니다', 500, ErrorCodes.INTERNAL_ERROR)
    }

    // 학생 이름 조회 (응답용)
    const { data: student } = await adminClient
      .from('students')
      .select('name')
      .eq('id', student_id)
      .single()

    return successResponse({
      attendance,
      student_name: student?.name || '알 수 없음',
      message: '출석이 완료되었습니다!',
    }, 201)
  } catch (error) {
    console.error('Kiosk checkin API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'
import { verifyParentToken } from '@/lib/auth/jwt'
import { decryptPhone } from '@/lib/crypto/aes'

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

    const adminClient = createAdminClient()

    // 학부모-원생 관계로 자녀 조회
    const { data: relations, error } = await adminClient
      .from('parent_student_relations')
      .select(`
        student:students(
          id,
          name,
          encrypted_phone,
          birth_date,
          school,
          grade,
          video_folder_url,
          product:products(id, name),
          schedules(
            day_of_week,
            start_time,
            end_time,
            teacher:teachers(name, color)
          )
        )
      `)
      .eq('parent_id', payload.parentId)

    if (error) {
      console.error('Children fetch error:', error)
      return errorResponse('Failed to fetch children', 500, ErrorCodes.INTERNAL_ERROR)
    }

    const children = relations?.map((r) => {
      const student = r.student as unknown as {
        id: string
        name: string
        encrypted_phone: string
        birth_date: string | null
        school: string | null
        grade: number | null
        video_folder_url: string | null
        product: { id: string; name: string } | null
        schedules: Array<{
          day_of_week: number
          start_time: string
          end_time: string
          teacher: { name: string; color: string }
        }>
      }
      return {
        id: student.id,
        name: student.name,
        phone: student.encrypted_phone ? decryptPhone(student.encrypted_phone) : null,
        birth_date: student.birth_date,
        school: student.school,
        grade: student.grade,
        video_folder_url: student.video_folder_url,
        product: student.product,
        schedules: student.schedules,
      }
    })

    return successResponse({ children })
  } catch (error) {
    console.error('Children API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

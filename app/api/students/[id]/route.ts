import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'
import { decryptPhone, encryptPhone } from '@/lib/crypto/aes'
import { hashPhoneLast4 } from '@/lib/crypto/hash'

// GET - 원생 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const adminClient = createAdminClient()

    const { data: student, error } = await adminClient
      .from('students')
      .select(`
        *,
        product:products(id, name, price, duration_minutes, lessons_per_month),
        family:families(id, family_name, discount_tier),
        schedules(
          id,
          day_of_week,
          start_time,
          end_time,
          teacher:teachers(id, name, color)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !student) {
      return errorResponse('Student not found', 404, ErrorCodes.NOT_FOUND)
    }

    // 보호자 조회
    const { data: relations } = await adminClient
      .from('parent_student_relations')
      .select(`
        relationship,
        is_primary,
        parent:parents(id, name, encrypted_phone, birth_date)
      `)
      .eq('student_id', id)

    const parents = relations?.map(rel => {
      const parent = rel.parent as unknown as { id: string; name: string; encrypted_phone?: string; birth_date?: string } | null
      return {
        ...parent,
        phone: parent?.encrypted_phone ? decryptPhone(parent.encrypted_phone) : null,
        encrypted_phone: undefined,
        relationship: rel.relationship,
        is_primary: rel.is_primary,
      }
    })

    // 전화번호 복호화
    const studentWithPhone = {
      ...student,
      phone: student.encrypted_phone ? decryptPhone(student.encrypted_phone) : null,
      encrypted_phone: undefined,
      phone_search_hash: undefined,
      parents,
    }

    return successResponse({ student: studentWithPhone })
  } catch (error) {
    console.error('Get student API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// PUT - 원생 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()
    const adminClient = createAdminClient()

    // 수정할 필드 구성
    const updateData: Record<string, unknown> = {}

    if (body.name) updateData.name = body.name
    if (body.phone) {
      updateData.encrypted_phone = encryptPhone(body.phone)
      updateData.phone_search_hash = hashPhoneLast4(body.phone)
    }
    if (body.birth_date !== undefined) updateData.birth_date = body.birth_date
    if (body.school !== undefined) updateData.school = body.school
    if (body.grade !== undefined) updateData.grade = body.grade
    if (body.product_id !== undefined) updateData.product_id = body.product_id
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data: student, error } = await adminClient
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update student error:', error)
      return errorResponse('Failed to update student', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ student })
  } catch (error) {
    console.error('Update student API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// DELETE - 원생 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const adminClient = createAdminClient()

    // Soft delete (is_active = false)
    const { error } = await adminClient
      .from('students')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Delete student error:', error)
      return errorResponse('Failed to delete student', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ message: 'Student deleted successfully' })
  } catch (error) {
    console.error('Delete student API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

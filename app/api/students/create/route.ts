import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'
import { encryptPhone } from '@/lib/crypto/aes'
import { hashPhoneLast4 } from '@/lib/crypto/hash'

interface CreateStudentRequest {
  name: string
  phone: string
  birth_date?: string
  school?: string
  grade?: number
  product_id?: string
  notes?: string
  consent_signed: boolean
  parent?: {
    name: string
    phone: string
    birth_date?: string
    relationship?: string
  }
  family_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body: CreateStudentRequest = await request.json()

    // 필수 필드 검증
    if (!body.name || !body.phone) {
      return errorResponse('Name and phone are required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    if (!body.consent_signed) {
      return errorResponse('Consent is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()
    let familyId = body.family_id

    // 가족이 없으면 새로 생성
    if (!familyId) {
      const { data: family, error: familyError } = await adminClient
        .from('families')
        .insert({ family_name: `${body.name} 가족` })
        .select()
        .single()

      if (familyError) {
        console.error('Family creation error:', familyError)
        return errorResponse('Failed to create family', 500, ErrorCodes.INTERNAL_ERROR)
      }

      familyId = family.id
    }

    // 원생 등록
    const encryptedPhone = encryptPhone(body.phone)
    const phoneHash = hashPhoneLast4(body.phone)

    const { data: student, error: studentError } = await adminClient
      .from('students')
      .insert({
        family_id: familyId,
        name: body.name,
        encrypted_phone: encryptedPhone,
        phone_search_hash: phoneHash,
        birth_date: body.birth_date || null,
        school: body.school || null,
        grade: body.grade || null,
        product_id: body.product_id || null,
        notes: body.notes || null,
        consent_signed: body.consent_signed,
        consent_date: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single()

    if (studentError) {
      console.error('Student creation error:', studentError)
      return errorResponse('Failed to create student', 500, ErrorCodes.INTERNAL_ERROR)
    }

    // 보호자 정보가 있으면 등록
    if (body.parent) {
      const parentEncryptedPhone = encryptPhone(body.parent.phone)
      const parentPhoneHash = hashPhoneLast4(body.parent.phone)

      const { data: parent, error: parentError } = await adminClient
        .from('parents')
        .insert({
          family_id: familyId,
          name: body.parent.name,
          encrypted_phone: parentEncryptedPhone,
          phone_search_hash: parentPhoneHash,
          birth_date: body.parent.birth_date || null,
        })
        .select()
        .single()

      if (parentError) {
        console.error('Parent creation error:', parentError)
        // 원생은 이미 생성됨, 보호자 실패 로그만
      } else {
        // 원생-보호자 관계 생성
        await adminClient
          .from('parent_student_relations')
          .insert({
            parent_id: parent.id,
            student_id: student.id,
            relationship: body.parent.relationship || '보호자',
            is_primary: true,
          })
      }
    }

    return successResponse({ student }, 201)
  } catch (error) {
    console.error('Create student API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

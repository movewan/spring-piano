import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'
import { decryptPhone, encryptPhone } from '@/lib/crypto/aes'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabase
      .from('teachers')
      .select('id, name, specialty, color, email, hire_date, salary, is_active, encrypted_phone, created_at')
      .order('name')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: teachers, error } = await query

    if (error) {
      console.error('Teachers fetch error:', error)
      return errorResponse('Failed to fetch teachers', 500, ErrorCodes.INTERNAL_ERROR)
    }

    // 전화번호 복호화
    const teachersWithPhone = teachers?.map(teacher => ({
      ...teacher,
      phone: teacher.encrypted_phone ? decryptPhone(teacher.encrypted_phone) : null,
      encrypted_phone: undefined,
    }))

    return successResponse({ teachers: teachersWithPhone })
  } catch (error) {
    console.error('Teachers API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// POST - 선생님 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()

    if (!body.name) {
      return errorResponse('Name is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const { data: teacher, error } = await adminClient
      .from('teachers')
      .insert({
        name: body.name,
        specialty: body.specialty || null,
        encrypted_phone: body.phone ? encryptPhone(body.phone) : null,
        color: body.color || '#7BC4C4',
        email: body.email || null,
        hire_date: body.hire_date || null,
        salary: body.salary || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Teacher creation error:', error)
      return errorResponse('Failed to create teacher', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ teacher }, 201)
  } catch (error) {
    console.error('Create teacher API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// PUT - 선생님 수정
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
      return errorResponse('Teacher ID is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.specialty !== undefined) updateData.specialty = body.specialty
    if (body.phone !== undefined) updateData.encrypted_phone = body.phone ? encryptPhone(body.phone) : null
    if (body.color !== undefined) updateData.color = body.color
    if (body.email !== undefined) updateData.email = body.email
    if (body.hire_date !== undefined) updateData.hire_date = body.hire_date
    if (body.salary !== undefined) updateData.salary = body.salary
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data: teacher, error } = await adminClient
      .from('teachers')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Teacher update error:', error)
      return errorResponse('Failed to update teacher', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ teacher })
  } catch (error) {
    console.error('Update teacher API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// DELETE - 선생님 삭제 (soft delete)
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
      return errorResponse('Teacher ID is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('teachers')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Teacher delete error:', error)
      return errorResponse('Failed to delete teacher', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ message: 'Teacher deleted successfully' })
  } catch (error) {
    console.error('Delete teacher API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'
import { decryptPhone } from '@/lib/crypto/aes'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('is_active')
    const productId = searchParams.get('product_id')

    const offset = (page - 1) * limit

    // Admin client로 데이터 조회 (RLS 우회)
    const adminClient = createAdminClient()

    let query = adminClient
      .from('students')
      .select(`
        *,
        product:products(id, name, price),
        schedules(
          id,
          day_of_week,
          start_time,
          end_time,
          teacher:teachers(id, name, color)
        )
      `, { count: 'exact' })

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data: students, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Students fetch error:', error)
      return errorResponse('Failed to fetch students', 500, ErrorCodes.INTERNAL_ERROR)
    }

    // 전화번호 복호화
    const studentsWithPhone = students?.map(student => ({
      ...student,
      phone: student.encrypted_phone ? decryptPhone(student.encrypted_phone) : null,
      encrypted_phone: undefined,
      phone_search_hash: undefined,
    }))

    return successResponse({
      students: studentsWithPhone,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Students API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

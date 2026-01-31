import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes, checkRateLimit } from '@/lib/api-response'
import { sha256 } from '@/lib/crypto/hash'

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting (IP 기반)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = checkRateLimit(`kiosk-search:${ip}`, 10, 60000) // 1분에 10회

    if (!rateLimitResult.allowed) {
      return errorResponse(
        '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
        429,
        ErrorCodes.RATE_LIMITED
      )
    }

    const body = await request.json()
    const { last4digits } = body

    if (!last4digits || last4digits.length !== 4 || !/^\d{4}$/.test(last4digits)) {
      return errorResponse('전화번호 뒷4자리를 입력해주세요', 400, ErrorCodes.VALIDATION_ERROR)
    }

    // SHA-256 해시로 검색
    const searchHash = sha256(last4digits)
    const adminClient = createAdminClient()

    const { data: students, error } = await adminClient
      .from('students')
      .select(`
        id,
        name,
        product:products(name)
      `)
      .eq('phone_search_hash', searchHash)
      .eq('is_active', true)

    if (error) {
      console.error('Kiosk search error:', error)
      return errorResponse('검색 중 오류가 발생했습니다', 500, ErrorCodes.INTERNAL_ERROR)
    }

    if (!students || students.length === 0) {
      return successResponse({ students: [] })
    }

    // 결과 반환 (민감한 정보 제외)
    const result = students.map((s) => ({
      id: s.id,
      name: s.name,
      product_name: (s.product as unknown as { name: string } | null)?.name || null,
    }))

    return successResponse({ students: result })
  } catch (error) {
    console.error('Kiosk search API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

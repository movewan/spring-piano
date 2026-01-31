import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes, checkRateLimit } from '@/lib/api-response'
import { sha256, verifyPin } from '@/lib/crypto/hash'
import { signParentToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitResult = checkRateLimit(`parent-login:${ip}`, 3, 60000) // 1분에 3회

    if (!rateLimitResult.allowed) {
      return errorResponse(
        '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.',
        429,
        ErrorCodes.RATE_LIMITED
      )
    }

    const body = await request.json()
    const { phone, name, birth_date, pin } = body

    // 필수 필드 확인
    if (!phone) {
      return errorResponse('전화번호를 입력해주세요', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const last4 = phone.replace(/[^0-9]/g, '').slice(-4)
    const searchHash = sha256(last4)

    const adminClient = createAdminClient()

    // 전화번호 뒷4자리로 부모 찾기
    const { data: parents, error } = await adminClient
      .from('parents')
      .select(`
        id,
        name,
        family_id,
        birth_date,
        parent_auth(pin_hash, failed_attempts, locked_until)
      `)
      .eq('phone_search_hash', searchHash)

    if (error || !parents || parents.length === 0) {
      return errorResponse('등록된 학부모를 찾을 수 없습니다', 404, ErrorCodes.NOT_FOUND)
    }

    // 이름과 생년월일로 필터링 (최초 로그인)
    let matchedParent = parents[0]
    if (name && birth_date) {
      const filtered = parents.filter(
        (p) => p.name === name && p.birth_date === birth_date
      )
      if (filtered.length === 0) {
        return errorResponse('이름 또는 생년월일이 일치하지 않습니다', 401, ErrorCodes.UNAUTHORIZED)
      }
      matchedParent = filtered[0]
    }

    const parentAuth = matchedParent.parent_auth as unknown as { pin_hash: string; failed_attempts: number; locked_until: string | null } | null

    // PIN이 설정되어 있는 경우
    if (parentAuth?.pin_hash) {
      // 잠금 확인
      if (parentAuth.locked_until && new Date(parentAuth.locked_until) > new Date()) {
        return errorResponse('계정이 잠겼습니다. 나중에 다시 시도해주세요.', 403, ErrorCodes.FORBIDDEN)
      }

      // PIN 검증
      if (!pin) {
        return successResponse({ needs_pin: true, parent_id: matchedParent.id })
      }

      const isValid = await verifyPin(pin, parentAuth.pin_hash)
      if (!isValid) {
        // 실패 횟수 증가
        const newFailedAttempts = (parentAuth.failed_attempts || 0) + 1
        const updateData: { failed_attempts: number; locked_until?: string } = {
          failed_attempts: newFailedAttempts,
        }

        if (newFailedAttempts >= 5) {
          updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30분 잠금
        }

        await adminClient
          .from('parent_auth')
          .update(updateData)
          .eq('parent_id', matchedParent.id)

        return errorResponse('PIN이 올바르지 않습니다', 401, ErrorCodes.UNAUTHORIZED)
      }

      // 성공 시 실패 횟수 초기화
      await adminClient
        .from('parent_auth')
        .update({ failed_attempts: 0, locked_until: null })
        .eq('parent_id', matchedParent.id)
    } else {
      // PIN이 없는 경우 (최초 로그인)
      if (!name || !birth_date) {
        return errorResponse('최초 로그인 시 이름과 생년월일이 필요합니다', 400, ErrorCodes.VALIDATION_ERROR)
      }

      // PIN 설정 필요함을 알림
      return successResponse({
        needs_pin_setup: true,
        parent_id: matchedParent.id,
        parent_name: matchedParent.name,
      })
    }

    // JWT 발급
    const token = signParentToken({
      parentId: matchedParent.id,
      familyId: matchedParent.family_id,
      name: matchedParent.name,
    })

    // 쿠키에 토큰 저장
    const response = NextResponse.json({
      success: true,
      data: {
        parent_id: matchedParent.id,
        name: matchedParent.name,
      },
    })

    response.cookies.set('parent_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Parent login API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

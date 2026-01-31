import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'
import { hashPin } from '@/lib/crypto/hash'
import { signParentToken } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parent_id, pin } = body

    if (!parent_id || !pin) {
      return errorResponse('부모 ID와 PIN이 필요합니다', 400, ErrorCodes.VALIDATION_ERROR)
    }

    // PIN 유효성 검사 (4-6자리 숫자)
    if (!/^\d{4,6}$/.test(pin)) {
      return errorResponse('PIN은 4-6자리 숫자여야 합니다', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    // 부모 존재 확인
    const { data: parent, error: parentError } = await adminClient
      .from('parents')
      .select('id, name, family_id')
      .eq('id', parent_id)
      .single()

    if (parentError || !parent) {
      return errorResponse('부모를 찾을 수 없습니다', 404, ErrorCodes.NOT_FOUND)
    }

    // PIN 해시 생성 및 저장
    const pinHash = await hashPin(pin)

    const { error } = await adminClient
      .from('parent_auth')
      .upsert({
        parent_id,
        pin_hash: pinHash,
        failed_attempts: 0,
        locked_until: null,
      })

    if (error) {
      console.error('Set PIN error:', error)
      return errorResponse('PIN 설정에 실패했습니다', 500, ErrorCodes.INTERNAL_ERROR)
    }

    // JWT 발급
    const token = signParentToken({
      parentId: parent.id,
      familyId: parent.family_id,
      name: parent.name,
    })

    // 쿠키에 토큰 저장
    const response = NextResponse.json({
      success: true,
      data: {
        message: 'PIN이 설정되었습니다',
        parent_id: parent.id,
        name: parent.name,
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
    console.error('Set PIN API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

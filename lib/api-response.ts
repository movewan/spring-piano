import { NextResponse } from 'next/server'

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status }
  )
}

export function errorResponse(
  message: string,
  status = 400,
  code?: string
) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message, code },
    { status }
  )
}

// 공통 에러 코드
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
} as const

// Rate Limiting (메모리 기반 - 간단한 구현)
const rateLimit = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimit.get(key)

  if (!record || now > record.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs }
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetAt - now,
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetIn: record.resetAt - now,
  }
}

// 오래된 Rate Limit 기록 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimit.entries()) {
    if (now > record.resetAt) {
      rateLimit.delete(key)
    }
  }
}, 60000) // 1분마다 정리

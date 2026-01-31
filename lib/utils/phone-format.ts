/**
 * 전화번호 포맷팅 유틸리티
 * 한국 휴대폰 번호 형식: 010-0000-0000
 */

/**
 * 전화번호에 하이픈 자동 추가
 * @param value - 원시 입력값
 * @returns 포맷된 전화번호 (예: 010-1234-5678)
 */
export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '')

  if (cleaned.length <= 3) {
    return cleaned
  }

  if (cleaned.length <= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  }

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`
}

/**
 * 전화번호에서 하이픈 제거 (저장용)
 * @param value - 포맷된 전화번호
 * @returns 숫자만 포함된 전화번호
 */
export function cleanPhone(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * 전화번호 유효성 검사
 * @param value - 검사할 전화번호
 * @returns 유효 여부
 */
export function validatePhone(value: string): boolean {
  const cleaned = cleanPhone(value)

  // 한국 휴대폰 번호: 010, 011, 016, 017, 018, 019로 시작, 총 10-11자리
  const mobilePattern = /^01[0-9]{8,9}$/

  // 한국 일반 전화: 02, 031-064 등으로 시작
  const landlinePattern = /^0[2-6][0-9]{7,8}$/

  return mobilePattern.test(cleaned) || landlinePattern.test(cleaned)
}

/**
 * 전화번호 뒷 4자리 추출
 * @param value - 전화번호
 * @returns 뒷 4자리
 */
export function getPhoneLast4(value: string): string {
  const cleaned = cleanPhone(value)
  return cleaned.slice(-4)
}

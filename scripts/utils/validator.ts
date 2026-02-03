// Data Validation Utilities

import { logger } from './logger'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// 전화번호 유효성 검사
export function validatePhone(phone: string | null | undefined): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

  if (!phone) {
    result.warnings.push('전화번호가 비어있습니다')
    return result
  }

  const normalized = phone.replace(/[^0-9]/g, '')

  if (normalized.length < 10 || normalized.length > 11) {
    result.isValid = false
    result.errors.push(`전화번호 길이가 올바르지 않습니다: ${phone} (${normalized.length}자리)`)
  }

  if (!normalized.startsWith('01')) {
    result.warnings.push(`휴대폰 번호 형식이 아닐 수 있습니다: ${phone}`)
  }

  return result
}

// 이름 유효성 검사
export function validateName(name: string | null | undefined): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

  if (!name || name.trim() === '') {
    result.isValid = false
    result.errors.push('이름이 비어있습니다')
    return result
  }

  if (name.length > 50) {
    result.warnings.push(`이름이 너무 깁니다: ${name.slice(0, 20)}...`)
  }

  return result
}

// 생년월일 유효성 검사
export function validateBirthDate(date: string | null | undefined): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

  if (!date) {
    return result // 선택 필드
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    result.isValid = false
    result.errors.push(`생년월일 형식이 올바르지 않습니다: ${date} (YYYY-MM-DD 필요)`)
    return result
  }

  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) {
    result.isValid = false
    result.errors.push(`유효하지 않은 날짜입니다: ${date}`)
  }

  // 미래 날짜 체크
  if (parsed > new Date()) {
    result.warnings.push(`미래 날짜입니다: ${date}`)
  }

  // 너무 오래된 날짜 체크 (100년 전)
  const hundredYearsAgo = new Date()
  hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 100)
  if (parsed < hundredYearsAgo) {
    result.warnings.push(`너무 오래된 날짜입니다: ${date}`)
  }

  return result
}

// 요일 유효성 검사 (0-6)
export function validateDayOfWeek(day: number | null | undefined): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

  if (day === null || day === undefined) {
    result.isValid = false
    result.errors.push('요일이 지정되지 않았습니다')
    return result
  }

  if (!Number.isInteger(day) || day < 0 || day > 6) {
    result.isValid = false
    result.errors.push(`유효하지 않은 요일입니다: ${day} (0-6 필요)`)
  }

  return result
}

// 시간 형식 유효성 검사 (HH:MM)
export function validateTime(time: string | null | undefined): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

  if (!time) {
    result.isValid = false
    result.errors.push('시간이 지정되지 않았습니다')
    return result
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (!timeRegex.test(time)) {
    result.isValid = false
    result.errors.push(`시간 형식이 올바르지 않습니다: ${time} (HH:MM 필요)`)
  }

  return result
}

// 학생 데이터 종합 검증
export function validateStudentData(student: {
  name?: string | null
  phone?: string | null
  birth_date?: string | null
}): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] }

  const nameResult = validateName(student.name)
  const phoneResult = validatePhone(student.phone)
  const birthResult = validateBirthDate(student.birth_date)

  result.errors.push(...nameResult.errors, ...phoneResult.errors, ...birthResult.errors)
  result.warnings.push(...nameResult.warnings, ...phoneResult.warnings, ...birthResult.warnings)
  result.isValid = nameResult.isValid && phoneResult.isValid && birthResult.isValid

  return result
}

// 검증 결과 로깅
export function logValidationResult(
  context: string,
  result: ValidationResult,
  logWarnings = true
) {
  if (!result.isValid) {
    result.errors.forEach(err => logger.error(`[${context}] ${err}`))
  }
  if (logWarnings && result.warnings.length > 0) {
    result.warnings.forEach(warn => logger.warn(`[${context}] ${warn}`))
  }
  return result.isValid
}

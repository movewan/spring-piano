// Notion → Supabase Data Transformers

import { encryptPhone, normalizePhone } from '../../lib/crypto/aes'
import { hashPhoneLast4 } from '../../lib/crypto/hash'
import { logger } from '../utils/logger'
import { validateStudentData, logValidationResult } from '../utils/validator'
import {
  NotionPage,
  NotionStudent,
  NotionTeacher,
  MigrationContext,
  getNotionText,
  getNotionDate,
  getNotionNumber,
  getNotionCheckbox,
  getNotionSelect,
  dayStringToNumber,
  normalizeTime,
} from './types'

// Notion 페이지 → 원생 데이터 추출
// 속성 이름은 실제 Notion 데이터베이스에 맞게 조정 필요
export function parseNotionStudent(page: NotionPage): NotionStudent {
  const props = page.properties

  // 실제 Notion 속성 이름에 맞게 매핑 (예시)
  // 원장님의 Notion 구조 확인 후 조정 필요
  return {
    id: page.id,
    name: getNotionText(props['이름']) || getNotionText(props['Name']) || '',
    phone: getNotionText(props['전화번호']) || getNotionText(props['Phone']),
    birthDate: getNotionDate(props['생년월일']) || getNotionDate(props['Birth Date']),
    school: getNotionText(props['학교']) || getNotionText(props['School']),
    grade: getNotionNumber(props['학년']) || getNotionNumber(props['Grade']),
    className: getNotionSelect(props['반']) || getNotionSelect(props['Class']),
    teacherName: getNotionSelect(props['담당 선생님']) || getNotionText(props['Teacher']),
    parentName: getNotionText(props['보호자 이름']) || getNotionText(props['Parent Name']),
    parentPhone: getNotionText(props['보호자 연락처']) || getNotionText(props['Parent Phone']),
    dayOfWeek: getNotionSelect(props['요일']) || getNotionText(props['Day']),
    startTime: getNotionText(props['시작 시간']) || getNotionText(props['Start Time']),
    endTime: getNotionText(props['종료 시간']) || getNotionText(props['End Time']),
    isActive: getNotionCheckbox(props['활성']) ?? !getNotionCheckbox(props['퇴원']),
    notes: getNotionText(props['메모']) || getNotionText(props['Notes']),
  }
}

// Notion 페이지 → 선생님 데이터 추출
export function parseNotionTeacher(page: NotionPage): NotionTeacher {
  const props = page.properties

  return {
    id: page.id,
    name: getNotionText(props['이름']) || getNotionText(props['Name']) || '',
    phone: getNotionText(props['전화번호']) || getNotionText(props['Phone']),
    specialty: getNotionText(props['전공']) || getNotionSelect(props['Specialty']),
    isActive: getNotionCheckbox(props['활성']) ?? true,
  }
}

// 전화번호 암호화 처리
export function transformPhone(phone: string | null): {
  encrypted_phone: string
  phone_search_hash: string
} | null {
  if (!phone) return null

  try {
    const normalized = normalizePhone(phone)
    if (normalized.length < 10) {
      logger.warn(`전화번호 길이 부족: ${phone}`)
      return null
    }

    return {
      encrypted_phone: encryptPhone(phone),
      phone_search_hash: hashPhoneLast4(phone),
    }
  } catch (error) {
    logger.error(`전화번호 암호화 실패: ${phone}`, error)
    return null
  }
}

// Notion 원생 → Supabase students 테이블 데이터
export function transformToSupabaseStudent(
  notionStudent: NotionStudent,
  context: MigrationContext,
  options: { consentSigned: boolean }
): {
  data: Record<string, unknown> | null
  familyData: Record<string, unknown> | null
  parentData: Record<string, unknown> | null
  scheduleData: Record<string, unknown> | null
} {
  // 검증
  const validation = validateStudentData({
    name: notionStudent.name,
    phone: notionStudent.phone,
    birth_date: notionStudent.birthDate,
  })

  if (!validation.isValid) {
    logValidationResult(`Student ${notionStudent.name}`, validation)
    return { data: null, familyData: null, parentData: null, scheduleData: null }
  }

  // 전화번호 암호화
  const phoneData = transformPhone(notionStudent.phone)

  // Product ID 매핑
  const productId = notionStudent.className
    ? context.productIdMap.get(notionStudent.className)
    : null

  if (notionStudent.className && !productId) {
    logger.warn(`반 매핑 실패: ${notionStudent.className}`)
  }

  // 학생 데이터
  const studentData: Record<string, unknown> = {
    name: notionStudent.name,
    encrypted_phone: phoneData?.encrypted_phone || '',
    phone_search_hash: phoneData?.phone_search_hash || '',
    birth_date: notionStudent.birthDate,
    school: notionStudent.school,
    grade: notionStudent.grade,
    product_id: productId,
    notes: notionStudent.notes,
    is_active: notionStudent.isActive,
    consent_signed: options.consentSigned,
    consent_date: options.consentSigned ? new Date().toISOString().split('T')[0] : null,
  }

  // 가족 데이터 (보호자가 있는 경우)
  let familyData: Record<string, unknown> | null = null
  let parentData: Record<string, unknown> | null = null

  if (notionStudent.parentName) {
    familyData = {
      family_name: `${notionStudent.name} 가족`,
      discount_tier: 0, // 기본값, 필요시 조정
    }

    const parentPhoneData = transformPhone(notionStudent.parentPhone)
    if (parentPhoneData) {
      parentData = {
        name: notionStudent.parentName,
        encrypted_phone: parentPhoneData.encrypted_phone,
        phone_search_hash: parentPhoneData.phone_search_hash,
      }
    }
  }

  // 스케줄 데이터
  let scheduleData: Record<string, unknown> | null = null
  const dayNum = dayStringToNumber(notionStudent.dayOfWeek)
  const startTime = normalizeTime(notionStudent.startTime)
  const endTime = normalizeTime(notionStudent.endTime)
  const teacherId = notionStudent.teacherName
    ? context.teacherIdMap.get(notionStudent.teacherName)
    : null

  if (dayNum !== null && startTime && teacherId) {
    scheduleData = {
      day_of_week: dayNum,
      start_time: startTime,
      end_time: endTime || calculateEndTime(startTime, 50), // 기본 50분
      teacher_id: teacherId,
      is_active: notionStudent.isActive,
    }
  }

  return { data: studentData, familyData, parentData, scheduleData }
}

// Notion 선생님 → Supabase teachers 테이블 데이터
export function transformToSupabaseTeacher(
  notionTeacher: NotionTeacher
): Record<string, unknown> | null {
  if (!notionTeacher.name) {
    logger.error('선생님 이름이 비어있습니다')
    return null
  }

  const phoneData = transformPhone(notionTeacher.phone)

  return {
    name: notionTeacher.name,
    specialty: notionTeacher.specialty,
    encrypted_phone: phoneData?.encrypted_phone || null,
    color: generateTeacherColor(notionTeacher.name),
    is_active: notionTeacher.isActive,
  }
}

// 기본 선생님 색상 생성 (이름 기반)
function generateTeacherColor(name: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ]

  // 이름의 해시값으로 색상 선택
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash = hash & hash
  }

  return colors[Math.abs(hash) % colors.length]
}

// 종료 시간 계산 (시작 시간 + 분)
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes

  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60

  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}

// 빈 마이그레이션 컨텍스트 생성
export function createMigrationContext(): MigrationContext {
  return {
    teacherIdMap: new Map(),
    productIdMap: new Map(),
    familyIdMap: new Map(),
    parentIdMap: new Map(),
    studentIdMap: new Map(),
    insertedIds: {
      teachers: [],
      products: [],
      families: [],
      parents: [],
      students: [],
      parentStudentRelations: [],
      schedules: [],
      payments: [],
      feedback: [],
    },
    stats: {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    },
  }
}

// Notion API Response Types for Migration

// Notion 속성 타입들
export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'people'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by'

// Notion Rich Text
export interface NotionRichText {
  type: 'text' | 'mention' | 'equation'
  text?: {
    content: string
    link: { url: string } | null
  }
  plain_text: string
  annotations?: {
    bold: boolean
    italic: boolean
    strikethrough: boolean
    underline: boolean
    code: boolean
    color: string
  }
}

// Notion Date
export interface NotionDate {
  start: string // ISO 8601 date or datetime
  end: string | null
  time_zone: string | null
}

// Notion Select
export interface NotionSelect {
  id: string
  name: string
  color: string
}

// Notion Page Properties
export interface NotionProperties {
  [key: string]: {
    id: string
    type: NotionPropertyType
    title?: NotionRichText[]
    rich_text?: NotionRichText[]
    number?: number | null
    select?: NotionSelect | null
    multi_select?: NotionSelect[]
    date?: NotionDate | null
    checkbox?: boolean
    url?: string | null
    email?: string | null
    phone_number?: string | null
    relation?: { id: string }[]
    formula?: {
      type: 'string' | 'number' | 'boolean' | 'date'
      string?: string | null
      number?: number | null
      boolean?: boolean | null
      date?: NotionDate | null
    }
  }
}

// Notion Page
export interface NotionPage {
  id: string
  object: 'page'
  created_time: string
  last_edited_time: string
  archived: boolean
  properties: NotionProperties
  url: string
}

// Notion Database Query Response
export interface NotionQueryResponse {
  object: 'list'
  results: NotionPage[]
  next_cursor: string | null
  has_more: boolean
}

// 원생 Notion 데이터 (예상 구조)
export interface NotionStudent {
  id: string
  name: string
  phone: string | null
  birthDate: string | null
  school: string | null
  grade: number | null
  className: string | null     // 반 이름 (product 매핑)
  teacherName: string | null   // 선생님 이름 (teacher 매핑)
  parentName: string | null
  parentPhone: string | null
  dayOfWeek: string | null     // 요일
  startTime: string | null     // 시작 시간
  endTime: string | null       // 종료 시간
  isActive: boolean
  notes: string | null
}

// 선생님 Notion 데이터 (예상 구조)
export interface NotionTeacher {
  id: string
  name: string
  phone: string | null
  specialty: string | null
  isActive: boolean
}

// 제품/반 Notion 데이터 (예상 구조)
export interface NotionProduct {
  id: string
  name: string
  description: string | null
  price: number
  durationMinutes: number
  lessonsPerMonth: number
  isActive: boolean
}

// 마이그레이션 컨텍스트 (ID 매핑)
export interface MigrationContext {
  // Notion name/ID → Supabase UUID
  teacherIdMap: Map<string, string>
  productIdMap: Map<string, string>
  familyIdMap: Map<string, string>
  parentIdMap: Map<string, string>
  studentIdMap: Map<string, string>

  // 삽입된 ID 기록 (롤백용)
  insertedIds: {
    teachers: string[]
    products: string[]
    families: string[]
    parents: string[]
    students: string[]
    parentStudentRelations: string[]
    schedules: string[]
    payments: string[]
    feedback: string[]
  }

  // 통계
  stats: {
    processed: number
    succeeded: number
    failed: number
    skipped: number
  }
}

// 마이그레이션 옵션
export interface MigrationOptions {
  dryRun: boolean                    // 실제 저장 없이 검증만
  skipExisting: boolean              // 기존 데이터 스킵
  batchSize: number                  // 배치 크기
  delayMs: number                    // API 호출 간 딜레이
  consentSigned: boolean             // 기존 데이터 동의 여부
  validateOnly: boolean              // 검증만 수행
}

// 유틸리티 함수들

// Notion 속성에서 텍스트 추출
export function getNotionText(prop: NotionProperties[string] | undefined): string | null {
  if (!prop) return null

  if (prop.type === 'title' && prop.title) {
    return prop.title.map(t => t.plain_text).join('') || null
  }

  if (prop.type === 'rich_text' && prop.rich_text) {
    return prop.rich_text.map(t => t.plain_text).join('') || null
  }

  if (prop.type === 'phone_number') {
    return prop.phone_number || null
  }

  if (prop.type === 'email') {
    return prop.email || null
  }

  if (prop.type === 'url') {
    return prop.url || null
  }

  return null
}

// Notion 속성에서 날짜 추출
export function getNotionDate(prop: NotionProperties[string] | undefined): string | null {
  if (!prop || prop.type !== 'date' || !prop.date) return null
  return prop.date.start.split('T')[0] // YYYY-MM-DD
}

// Notion 속성에서 숫자 추출
export function getNotionNumber(prop: NotionProperties[string] | undefined): number | null {
  if (!prop || prop.type !== 'number') return null
  return prop.number ?? null
}

// Notion 속성에서 체크박스 추출
export function getNotionCheckbox(prop: NotionProperties[string] | undefined): boolean {
  if (!prop || prop.type !== 'checkbox') return false
  return prop.checkbox ?? false
}

// Notion 속성에서 Select 추출
export function getNotionSelect(prop: NotionProperties[string] | undefined): string | null {
  if (!prop || prop.type !== 'select' || !prop.select) return null
  return prop.select.name
}

// Notion 속성에서 Multi-select 추출
export function getNotionMultiSelect(prop: NotionProperties[string] | undefined): string[] {
  if (!prop || prop.type !== 'multi_select' || !prop.multi_select) return []
  return prop.multi_select.map(s => s.name)
}

// 요일 문자열을 숫자로 변환 (0=일, 1=월, ...)
export function dayStringToNumber(day: string | null): number | null {
  if (!day) return null

  const dayMap: Record<string, number> = {
    '일': 0, '일요일': 0, 'Sunday': 0, 'Sun': 0,
    '월': 1, '월요일': 1, 'Monday': 1, 'Mon': 1,
    '화': 2, '화요일': 2, 'Tuesday': 2, 'Tue': 2,
    '수': 3, '수요일': 3, 'Wednesday': 3, 'Wed': 3,
    '목': 4, '목요일': 4, 'Thursday': 4, 'Thu': 4,
    '금': 5, '금요일': 5, 'Friday': 5, 'Fri': 5,
    '토': 6, '토요일': 6, 'Saturday': 6, 'Sat': 6,
  }

  return dayMap[day] ?? null
}

// 시간 문자열 정규화 (HH:MM 형식으로)
export function normalizeTime(time: string | null): string | null {
  if (!time) return null

  // 이미 HH:MM 형식인 경우
  const match = time.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const hours = match[1].padStart(2, '0')
    return `${hours}:${match[2]}`
  }

  // HH시 MM분 형식
  const koreanMatch = time.match(/(\d{1,2})시\s*(\d{2})분?/)
  if (koreanMatch) {
    const hours = koreanMatch[1].padStart(2, '0')
    return `${hours}:${koreanMatch[2]}`
  }

  // 오전/오후 형식
  const ampmMatch = time.match(/(오전|오후|AM|PM)\s*(\d{1,2}):?(\d{2})?/i)
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[2])
    const minutes = ampmMatch[3] || '00'
    const isPM = ampmMatch[1].toLowerCase() === '오후' || ampmMatch[1].toUpperCase() === 'PM'

    if (isPM && hours < 12) hours += 12
    if (!isPM && hours === 12) hours = 0

    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }

  return null
}

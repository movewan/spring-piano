#!/usr/bin/env npx tsx
/**
 * Notion MCP → Supabase 피드백 마이그레이션 스크립트
 *
 * 사용법:
 *   npx tsx scripts/migrate-notion-feedback.ts --dry-run          # 테스트 실행
 *   npx tsx scripts/migrate-notion-feedback.ts                    # 실제 마이그레이션
 *
 * 필수 환경변수:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * 참고: 이 스크립트는 원생 마이그레이션 후 실행합니다.
 *       Notion MCP로 조회한 피드백 데이터를 scripts/data/notion-feedback.json에 저장한 후 실행합니다.
 *
 * Notion 피드백 데이터 구조 (진도 및 피드백 내부 데이터베이스):
 *   - 날짜/월 (Date)
 *   - 진도 내용 (Text)
 *   - 피드백 (Text)
 *   - 영상 링크 (URL, 선택)
 */

import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
function loadEnvFile(filepath: string) {
  if (!fs.existsSync(filepath)) return
  const content = fs.readFileSync(filepath, 'utf-8')
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

loadEnvFile(path.join(process.cwd(), '.env.local'))
loadEnvFile(path.join(process.cwd(), '.env'))

import { createAdminClient } from '../lib/supabase/admin'
import { logger } from './utils/logger'

// Notion 피드백 데이터 구조 (MCP 조회 결과)
interface NotionFeedbackEntry {
  pageId: string              // 피드백 페이지 ID
  title: string               // "25년 4월", "24년 12월" 등
  studentName: string         // 학생 이름 (ancestor-3-page에서 추출)
  content: string             // 진도 + 피드백 내용
}

// CLI 인자 파싱
function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    inputFile: args.find(a => a.startsWith('--input='))?.split('=')[1] || 'notion-feedback.json'
  }
}

// 환경변수 확인
function checkEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    logger.error(`필수 환경변수 누락: ${missing.join(', ')}`)
    process.exit(1)
  }

  logger.success('환경변수 확인 완료')
}

/**
 * Notion 데이터 로드
 */
function loadNotionData(filename: string): NotionFeedbackEntry[] {
  const filepath = path.join(__dirname, 'data', filename)

  if (!fs.existsSync(filepath)) {
    logger.error(`데이터 파일 없음: ${filepath}`)
    logger.info('Notion MCP로 피드백 데이터를 조회한 후 scripts/data/notion-feedback.json에 저장하세요.')
    process.exit(1)
  }

  const raw = fs.readFileSync(filepath, 'utf-8')
  const data = JSON.parse(raw)

  return Array.isArray(data) ? data : data.results || []
}

/**
 * 제목에서 month_year 형식으로 변환
 * "25년 4월" → "2025-04"
 * "24년 12월" → "2024-12"
 * "2025년 1월" → "2025-01"
 */
function normalizeMonthYear(title: string): string | null {
  if (!title) return null

  // 한글 형식: "25년 4월" 또는 "2025년 1월"
  const korMatch = title.match(/(\d{2,4})년\s*(\d{1,2})월?/)
  if (korMatch) {
    let year = parseInt(korMatch[1], 10)
    const month = parseInt(korMatch[2], 10)

    // 2자리 연도는 2000년대로 변환
    if (year < 100) {
      year = 2000 + year
    }

    // 유효성 검사
    if (month < 1 || month > 12) return null
    if (year < 2020 || year > 2030) return null

    return `${year}-${month.toString().padStart(2, '0')}`
  }

  // YYYY-MM 또는 YYYY-MM-DD 형식
  const isoMatch = title.match(/^(\d{4})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`
  }

  return null
}

/**
 * 학생 이름으로 Supabase 학생 ID 조회
 */
async function getStudentNameMap(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name')

  if (error) {
    logger.error('학생 데이터 조회 실패', error)
    return new Map<string, string>()
  }

  const map = new Map<string, string>()
  data?.forEach(s => {
    if (s.name) {
      // 이름에서 학년 정보 제거하고 매핑 (예: "김나은(3)" → "김나은")
      const nameOnly = s.name.replace(/\(\d+\)$/, '').trim()
      map.set(nameOnly, s.id)
      map.set(s.name, s.id)  // 원본도 저장
    }
  })

  logger.info(`학생 ${data?.length || 0}명 로드됨 (이름 매핑: ${map.size}개)`)
  return map
}

/**
 * 기본 선생님 ID 조회 (피드백에 teacher_id 필요)
 */
async function getDefaultTeacherId(supabase: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error || !data) {
    logger.warn('기본 선생님을 찾을 수 없습니다')
    return null
  }

  return data.id
}

/**
 * 기존 피드백 조회 (중복 체크용)
 * student_id + month_year 조합으로 Set 생성
 */
async function getExistingFeedback(
  supabase: ReturnType<typeof createAdminClient>
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('feedback')
    .select('student_id, month_year')

  if (error) {
    logger.error('기존 피드백 조회 실패', error)
    return new Set()
  }

  const existingSet = new Set<string>()
  data?.forEach(f => {
    existingSet.add(`${f.student_id}:${f.month_year}`)
  })

  logger.info(`기존 피드백 ${data?.length || 0}개 로드됨`)
  return existingSet
}

/**
 * 메인 마이그레이션 로직
 */
async function main() {
  console.log('\n')
  console.log('='.repeat(60))
  console.log('  Notion → Spring Piano 피드백 마이그레이션')
  console.log('='.repeat(60))
  console.log('\n')

  const options = parseArgs()

  if (options.dryRun) {
    logger.warn('DRY-RUN 모드: 실제 데이터는 저장되지 않습니다')
  }

  checkEnvironment()

  const supabase = createAdminClient()
  logger.success('Supabase 연결 완료')

  // 1. 학생 이름 → ID 매핑 로드
  const studentNameMap = await getStudentNameMap(supabase)
  if (studentNameMap.size === 0) {
    logger.error('학생 데이터가 없습니다. 먼저 migrate-notion-students.ts를 실행하세요.')
    process.exit(1)
  }

  // 2. 기본 선생님 ID 조회
  const defaultTeacherId = await getDefaultTeacherId(supabase)
  if (!defaultTeacherId) {
    logger.error('등록된 선생님이 없습니다. 선생님을 먼저 등록하세요.')
    process.exit(1)
  }
  logger.info(`기본 선생님 ID: ${defaultTeacherId}`)

  // 3. 기존 피드백 조회 (중복 체크용)
  const existingFeedback = await getExistingFeedback(supabase)

  // 4. Notion 피드백 데이터 로드
  const notionData = loadNotionData(options.inputFile)
  logger.info(`Notion 피드백 데이터 ${notionData.length}건 로드됨`)

  // 통계
  const stats = {
    processed: 0,
    created: 0,
    skipped: 0,
    noStudent: 0,
    duplicate: 0,
    failed: 0,
  }

  // 5. 각 피드백 항목 처리
  for (const entry of notionData) {
    stats.processed++

    // month_year 파싱
    const monthYear = normalizeMonthYear(entry.title)
    if (!monthYear) {
      logger.warn(`월/년 파싱 실패: ${entry.title}`)
      stats.failed++
      continue
    }

    // 학생 이름으로 ID 찾기
    const studentName = entry.studentName.replace(/\(\d+\)$/, '').trim()
    const studentId = studentNameMap.get(studentName)
    if (!studentId) {
      logger.warn(`학생 찾기 실패: ${entry.studentName}`)
      stats.noStudent++
      continue
    }

    // 중복 체크
    const feedbackKey = `${studentId}:${monthYear}`
    if (existingFeedback.has(feedbackKey)) {
      logger.info(`중복 스킵: ${entry.studentName} - ${monthYear}`)
      stats.duplicate++
      continue
    }

    // 내용 확인
    const content = entry.content?.trim()
    if (!content || content.length < 10) {
      logger.warn(`내용 부족: ${entry.studentName} - ${monthYear}`)
      stats.skipped++
      continue
    }

    const feedbackData = {
      student_id: studentId,
      teacher_id: defaultTeacherId,
      month_year: monthYear,
      content: content,
      is_published: true,
      published_at: new Date().toISOString(),
    }

    if (options.dryRun) {
      logger.info(`[DRY-RUN] 피드백 생성: ${entry.studentName} - ${monthYear}`)
      console.log(`  내용: ${content.substring(0, 60)}...`)
      stats.created++
      existingFeedback.add(feedbackKey)
      continue
    }

    // 피드백 생성
    const { error } = await supabase
      .from('feedback')
      .insert(feedbackData)

    if (error) {
      logger.error(`피드백 생성 실패: ${entry.studentName} - ${monthYear}`, error)
      stats.failed++
    } else {
      logger.success(`피드백 생성: ${entry.studentName} - ${monthYear}`)
      stats.created++
      existingFeedback.add(feedbackKey)
    }
  }

  // 결과 요약
  console.log('\n' + '='.repeat(50))
  console.log('피드백 마이그레이션 결과')
  console.log('='.repeat(50))
  console.log(`  처리: ${stats.processed}건`)
  console.log(`  생성: ${stats.created}건`)
  console.log(`  중복 스킵: ${stats.duplicate}건`)
  console.log(`  학생 없음: ${stats.noStudent}건`)
  console.log(`  스킵: ${stats.skipped}건`)
  console.log(`  실패: ${stats.failed}건`)
  console.log('='.repeat(50))

  if (options.dryRun) {
    console.log('\n[DRY-RUN] 실제 실행하려면 --dry-run 옵션을 제거하세요.\n')
  }
}

main().catch(console.error)

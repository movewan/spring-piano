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
  studentNotionPageId: string  // 원생의 Notion 페이지 ID
  studentName: string          // 참조용 원생 이름
  feedbacks: Array<{
    date: string              // "2025-01" 또는 "2025-01-15" 형식
    progress: string          // 진도 내용
    feedback: string          // 피드백 내용
    videoUrl?: string         // 영상 링크 (선택)
  }>
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
 * 날짜 문자열을 month_year 형식으로 변환
 * "2025-01-15" → "2025-01"
 * "2025-01" → "2025-01"
 * "January 2025" → "2025-01"
 */
function normalizeMonthYear(dateStr: string): string | null {
  if (!dateStr) return null

  // YYYY-MM 또는 YYYY-MM-DD 형식
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`
  }

  // 한글 형식: "2025년 1월"
  const korMatch = dateStr.match(/(\d{4})년\s*(\d{1,2})월/)
  if (korMatch) {
    return `${korMatch[1]}-${korMatch[2].padStart(2, '0')}`
  }

  // 영문 형식: "January 2025"
  const months: Record<string, string> = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12'
  }
  const engMatch = dateStr.toLowerCase().match(/(\w+)\s+(\d{4})/)
  if (engMatch && months[engMatch[1]]) {
    return `${engMatch[2]}-${months[engMatch[1]]}`
  }

  return null
}

/**
 * Notion 페이지 ID로 Supabase 학생 ID 조회
 */
async function getStudentIdMap(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from('students')
    .select('id, notion_page_id')
    .not('notion_page_id', 'is', null)

  if (error) {
    logger.error('학생 데이터 조회 실패', error)
    return new Map<string, string>()
  }

  const map = new Map<string, string>()
  data?.forEach(s => {
    if (s.notion_page_id) {
      map.set(s.notion_page_id, s.id)
    }
  })

  logger.info(`Notion 연동 학생 ${map.size}명 로드됨`)
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
 */
async function getExistingFeedback(
  supabase: ReturnType<typeof createAdminClient>,
  studentId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('feedback')
    .select('month_year')
    .eq('student_id', studentId)

  if (error) {
    return new Set()
  }

  return new Set(data?.map(f => f.month_year) || [])
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

  // 1. 학생 ID 매핑 로드
  const studentIdMap = await getStudentIdMap(supabase)
  if (studentIdMap.size === 0) {
    logger.error('Notion과 연동된 학생이 없습니다. 먼저 migrate-notion-students.ts를 실행하세요.')
    process.exit(1)
  }

  // 2. 기본 선생님 ID 조회
  const defaultTeacherId = await getDefaultTeacherId(supabase)
  if (!defaultTeacherId) {
    logger.error('등록된 선생님이 없습니다. 선생님을 먼저 등록하세요.')
    process.exit(1)
  }

  // 3. Notion 피드백 데이터 로드
  const notionData = loadNotionData(options.inputFile)
  logger.info(`Notion 피드백 데이터 ${notionData.length}명분 로드됨`)

  // 통계
  const stats = {
    studentsProcessed: 0,
    feedbackCreated: 0,
    feedbackSkipped: 0,
    failed: 0,
  }

  // 4. 각 학생별 피드백 처리
  for (const entry of notionData) {
    stats.studentsProcessed++

    // Notion 페이지 ID로 Supabase 학생 ID 조회
    const studentId = studentIdMap.get(entry.studentNotionPageId)

    if (!studentId) {
      logger.warn(`학생 매핑 실패: ${entry.studentName} (pageId: ${entry.studentNotionPageId})`)
      stats.failed++
      continue
    }

    // 기존 피드백 조회 (중복 체크)
    const existingMonths = await getExistingFeedback(supabase, studentId)

    for (const fb of entry.feedbacks) {
      const monthYear = normalizeMonthYear(fb.date)

      if (!monthYear) {
        logger.warn(`날짜 파싱 실패: ${fb.date} (${entry.studentName})`)
        stats.failed++
        continue
      }

      // 중복 체크
      if (existingMonths.has(monthYear)) {
        logger.debug(`피드백 스킵 (이미 존재): ${entry.studentName} ${monthYear}`)
        stats.feedbackSkipped++
        continue
      }

      // 피드백 내용 합성
      const content = [fb.progress, fb.feedback]
        .filter(Boolean)
        .join('\n\n')

      if (!content) {
        logger.debug(`피드백 스킵 (내용 없음): ${entry.studentName} ${monthYear}`)
        stats.feedbackSkipped++
        continue
      }

      const feedbackData = {
        student_id: studentId,
        teacher_id: defaultTeacherId,
        month_year: monthYear,
        content: content,
        video_url: fb.videoUrl || null,
        is_published: true,  // 기존 데이터는 이미 공유됨
        published_at: new Date().toISOString(),
      }

      if (options.dryRun) {
        logger.info(`[DRY-RUN] 피드백 생성: ${entry.studentName} ${monthYear}`, {
          hasVideo: !!fb.videoUrl,
          contentLength: content.length,
        })
        stats.feedbackCreated++
        existingMonths.add(monthYear)
        continue
      }

      const { error } = await supabase
        .from('feedback')
        .insert(feedbackData)

      if (error) {
        logger.error(`피드백 생성 실패: ${entry.studentName} ${monthYear}`, error)
        stats.failed++
      } else {
        logger.success(`피드백 생성: ${entry.studentName} ${monthYear}`)
        stats.feedbackCreated++
        existingMonths.add(monthYear)
      }
    }
  }

  // 결과 요약
  console.log('\n' + '='.repeat(50))
  console.log('마이그레이션 결과')
  console.log('='.repeat(50))
  console.log(`  처리 학생: ${stats.studentsProcessed}명`)
  console.log(`  피드백 생성: ${stats.feedbackCreated}건`)
  console.log(`  피드백 스킵: ${stats.feedbackSkipped}건`)
  console.log(`  실패: ${stats.failed}건`)
  console.log('='.repeat(50))

  if (options.dryRun) {
    console.log('\n[DRY-RUN] 실제 실행하려면 --dry-run 옵션을 제거하세요.\n')
  }
}

main().catch(console.error)

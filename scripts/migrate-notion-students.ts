#!/usr/bin/env npx tsx
/**
 * Notion MCP → Supabase 원생 마이그레이션 스크립트
 *
 * 사용법:
 *   npx tsx scripts/migrate-notion-students.ts --dry-run          # 테스트 실행
 *   npx tsx scripts/migrate-notion-students.ts                    # 실제 마이그레이션
 *
 * 필수 환경변수:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ENCRYPTION_KEY
 *
 * 참고: 이 스크립트는 Claude Code의 Notion MCP와 함께 사용합니다.
 *       MCP로 조회한 Notion 데이터를 scripts/data/notion-students.json에 저장한 후 실행합니다.
 *
 * Notion 원생 관리 데이터베이스 구조:
 *   - 이름 (제목): "김시훈 김하윤" 형태 (형제/자매)
 *   - 원생 (Select): 재원생/퇴원생
 *   - 각 원생 페이지 내:
 *     - 연주 영상: Google Drive 폴더 링크
 *     - 진도 및 피드백: 내부 데이터베이스 (월별)
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
import { encryptPhone, normalizePhone } from '../lib/crypto/aes'
import { hashPhoneLast4 } from '../lib/crypto/hash'
import { logger } from './utils/logger'

// Notion 원생 관리 데이터 구조 (MCP 조회 결과)
interface NotionStudentEntry {
  pageId: string
  title: string           // "김시훈 김하윤" 또는 "김하은(4)"
  status: string          // "재원생" | "퇴원생"
  videoFolderUrl?: string // Google Drive 폴더 링크
  sharing?: boolean       // 학부모님 공유중 체크박스
}

// 파싱된 개별 학생 정보
interface ParsedStudent {
  name: string
  grade: number | null
  notionPageId: string
  videoFolderUrl: string | null
  isActive: boolean
  siblingGroup?: string   // 형제/자매 그룹 식별자
}

// CLI 인자 파싱
function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    inputFile: args.find(a => a.startsWith('--input='))?.split('=')[1] || 'notion-students.json'
  }
}

// 환경변수 확인
function checkEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
  ]

  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    logger.error(`필수 환경변수 누락: ${missing.join(', ')}`)
    process.exit(1)
  }

  logger.success('환경변수 확인 완료')
}

/**
 * Notion 제목에서 학생 이름과 학년 파싱
 *
 * 예시:
 *   "김시훈 김하윤" → [{ name: "김시훈" }, { name: "김하윤" }]
 *   "김하은(4)" → [{ name: "김하은", grade: 4 }]
 *   "박민준 박서연(3)" → [{ name: "박민준" }, { name: "박서연", grade: 3 }]
 */
function parseStudentNames(title: string): Array<{ name: string; grade: number | null }> {
  const students: Array<{ name: string; grade: number | null }> = []

  // 공백으로 분리 (형제/자매)
  const parts = title.trim().split(/\s+/)

  for (const part of parts) {
    // 학년 정보 추출: "이름(숫자)" 패턴
    const gradeMatch = part.match(/^(.+?)\((\d+)\)$/)

    if (gradeMatch) {
      students.push({
        name: gradeMatch[1],
        grade: parseInt(gradeMatch[2], 10)
      })
    } else {
      students.push({
        name: part,
        grade: null
      })
    }
  }

  return students.filter(s => s.name.length > 0)
}

/**
 * Google Drive 폴더 URL 추출
 * 페이지 내용에서 drive.google.com 링크 찾기
 */
function extractGoogleDriveUrl(content: string | undefined): string | null {
  if (!content) return null

  // Google Drive 폴더 링크 패턴
  const patterns = [
    /https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+/g,
    /https:\/\/drive\.google\.com\/[^\s"<>]+/g,
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match[0]) {
      return match[0]
    }
  }

  return null
}

/**
 * Notion 데이터 로드
 */
function loadNotionData(filename: string): NotionStudentEntry[] {
  const filepath = path.join(__dirname, 'data', filename)

  if (!fs.existsSync(filepath)) {
    logger.error(`데이터 파일 없음: ${filepath}`)
    logger.info('Notion MCP로 원생 데이터를 조회한 후 scripts/data/notion-students.json에 저장하세요.')
    process.exit(1)
  }

  const raw = fs.readFileSync(filepath, 'utf-8')
  const data = JSON.parse(raw)

  return Array.isArray(data) ? data : data.results || []
}

/**
 * 기존 학생 데이터 조회 (중복 체크용)
 */
async function getExistingStudents(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, notion_page_id')

  if (error) {
    logger.error('기존 학생 데이터 조회 실패', error)
    return new Map<string, string>()
  }

  // notion_page_id → student.id 매핑
  const pageIdMap = new Map<string, string>()
  data?.forEach(s => {
    if (s.notion_page_id) {
      pageIdMap.set(s.notion_page_id, s.id)
    }
  })

  logger.info(`기존 학생 ${data?.length || 0}명 로드됨 (Notion 연동: ${pageIdMap.size}명)`)
  return pageIdMap
}

/**
 * 가족 그룹 생성 또는 조회
 */
async function getOrCreateFamily(
  supabase: ReturnType<typeof createAdminClient>,
  familyName: string,
  dryRun: boolean
): Promise<string | null> {
  // 기존 가족 조회
  const { data: existing } = await supabase
    .from('families')
    .select('id')
    .eq('family_name', familyName)
    .single()

  if (existing) {
    return existing.id
  }

  if (dryRun) {
    logger.info(`[DRY-RUN] 가족 생성: ${familyName}`)
    return 'dry-run-family-id'
  }

  // 새 가족 생성
  const { data: newFamily, error } = await supabase
    .from('families')
    .insert({ family_name: familyName, discount_tier: 0 })
    .select('id')
    .single()

  if (error) {
    logger.error(`가족 생성 실패: ${familyName}`, error)
    return null
  }

  logger.success(`가족 생성 완료: ${familyName}`)
  return newFamily.id
}

/**
 * 메인 마이그레이션 로직
 */
async function main() {
  console.log('\n')
  console.log('='.repeat(60))
  console.log('  Notion → Spring Piano 원생 마이그레이션')
  console.log('='.repeat(60))
  console.log('\n')

  const options = parseArgs()

  if (options.dryRun) {
    logger.warn('DRY-RUN 모드: 실제 데이터는 저장되지 않습니다')
  }

  checkEnvironment()

  const supabase = createAdminClient()
  logger.success('Supabase 연결 완료')

  // 1. Notion 데이터 로드
  const notionData = loadNotionData(options.inputFile)
  logger.info(`Notion 원생 데이터 ${notionData.length}건 로드됨`)

  // 2. 기존 학생 데이터 조회
  const existingPageIds = await getExistingStudents(supabase)

  // 통계
  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    familiesCreated: 0,
  }

  // 3. 각 Notion 항목 처리
  for (const entry of notionData) {
    stats.processed++

    // 퇴원생 스킵 옵션 (선택)
    const isActive = entry.status !== '퇴원생'

    // 이름 파싱 (형제/자매 분리)
    const parsedNames = parseStudentNames(entry.title)

    if (parsedNames.length === 0) {
      logger.warn(`이름 파싱 실패: ${entry.title}`)
      stats.failed++
      continue
    }

    // 형제/자매인 경우 가족 그룹 생성
    let familyId: string | null = null
    if (parsedNames.length > 1) {
      const familyName = `${parsedNames[0].name} 가족`
      familyId = await getOrCreateFamily(supabase, familyName, options.dryRun)
      if (familyId && !options.dryRun && familyId !== 'dry-run-family-id') {
        stats.familiesCreated++
      }
    }

    // 각 학생 처리
    for (const parsed of parsedNames) {
      // 이미 마이그레이션된 경우 업데이트
      const existingId = existingPageIds.get(entry.pageId)

      const studentData = {
        name: parsed.name,
        grade: parsed.grade,
        is_active: isActive,
        video_folder_url: entry.videoFolderUrl || null,
        notion_page_id: entry.pageId,
        family_id: familyId,
        // 기본값
        encrypted_phone: '',
        phone_search_hash: '',
        consent_signed: true,
        consent_date: new Date().toISOString().split('T')[0],
      }

      if (options.dryRun) {
        logger.info(`[DRY-RUN] ${existingId ? '업데이트' : '생성'}: ${parsed.name}`, {
          grade: parsed.grade,
          isActive,
          hasFamilyGroup: !!familyId,
          videoFolder: !!entry.videoFolderUrl,
        })
        stats.created++
        continue
      }

      if (existingId) {
        // 업데이트
        const { error } = await supabase
          .from('students')
          .update({
            grade: parsed.grade,
            is_active: isActive,
            video_folder_url: entry.videoFolderUrl || null,
            family_id: familyId,
          })
          .eq('id', existingId)

        if (error) {
          logger.error(`학생 업데이트 실패: ${parsed.name}`, error)
          stats.failed++
        } else {
          logger.success(`학생 업데이트: ${parsed.name}`)
          stats.updated++
        }
      } else {
        // 새로 생성
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert(studentData)
          .select('id')
          .single()

        if (error) {
          logger.error(`학생 생성 실패: ${parsed.name}`, error)
          stats.failed++
        } else {
          logger.success(`학생 생성: ${parsed.name}`)
          stats.created++

          // 새로 생성된 학생의 page ID 기록 (중복 방지)
          existingPageIds.set(entry.pageId, newStudent.id)
        }
      }
    }
  }

  // 결과 요약
  console.log('\n' + '='.repeat(50))
  console.log('마이그레이션 결과')
  console.log('='.repeat(50))
  console.log(`  처리: ${stats.processed}건`)
  console.log(`  생성: ${stats.created}명`)
  console.log(`  업데이트: ${stats.updated}명`)
  console.log(`  스킵: ${stats.skipped}명`)
  console.log(`  실패: ${stats.failed}건`)
  console.log(`  가족 그룹 생성: ${stats.familiesCreated}개`)
  console.log('='.repeat(50))

  if (options.dryRun) {
    console.log('\n[DRY-RUN] 실제 실행하려면 --dry-run 옵션을 제거하세요.\n')
  }
}

main().catch(console.error)

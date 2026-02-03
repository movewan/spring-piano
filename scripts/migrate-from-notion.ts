#!/usr/bin/env npx tsx
/**
 * Notion → Supabase 마이그레이션 스크립트
 *
 * 사용법:
 *   npx tsx scripts/migrate-from-notion.ts --dry-run          # 테스트 실행
 *   npx tsx scripts/migrate-from-notion.ts                    # 실제 마이그레이션
 *   npx tsx scripts/migrate-from-notion.ts --validate-only    # 검증만
 *
 * 필수 환경변수:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ENCRYPTION_KEY
 *
 * Notion 데이터는 JSON 파일로 내보낸 후 사용:
 *   - scripts/data/students.json
 *   - scripts/data/teachers.json (선택)
 */

// Load environment variables from .env.local
import * as fs from 'fs'
import * as path from 'path'

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
      // Remove quotes
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
import {
  NotionPage,
  NotionStudent,
  MigrationContext,
  MigrationOptions,
} from './notion/types'
import {
  parseNotionStudent,
  parseNotionTeacher,
  transformToSupabaseStudent,
  transformToSupabaseTeacher,
  createMigrationContext,
} from './notion/transformers'

// CLI 인자 파싱
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    skipExisting: args.includes('--skip-existing'),
    batchSize: 50,
    delayMs: 100, // Notion API rate limit 대응
    consentSigned: true, // 기존 원생은 이미 동의 완료
    validateOnly: args.includes('--validate-only'),
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

// JSON 파일에서 데이터 로드
function loadNotionData<T>(filename: string): T[] {
  const filepath = path.join(__dirname, 'data', filename)

  if (!fs.existsSync(filepath)) {
    logger.warn(`데이터 파일 없음: ${filepath}`)
    return []
  }

  const raw = fs.readFileSync(filepath, 'utf-8')
  const data = JSON.parse(raw)

  // Notion 내보내기 형식에 따라 조정
  if (Array.isArray(data)) {
    return data
  }
  if (data.results && Array.isArray(data.results)) {
    return data.results
  }

  logger.warn(`알 수 없는 데이터 형식: ${filename}`)
  return []
}

// 기존 선생님 데이터 로드 (ID 매핑용)
async function loadExistingTeachers(
  supabase: ReturnType<typeof createAdminClient>,
  context: MigrationContext
) {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, name')
    .eq('is_active', true)

  if (error) {
    logger.error('선생님 데이터 로드 실패', error)
    return
  }

  data?.forEach(teacher => {
    context.teacherIdMap.set(teacher.name, teacher.id)
  })

  logger.info(`기존 선생님 ${data?.length || 0}명 로드됨`)
}

// 기존 제품(반) 데이터 로드 (ID 매핑용)
async function loadExistingProducts(
  supabase: ReturnType<typeof createAdminClient>,
  context: MigrationContext
) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true)

  if (error) {
    logger.error('제품 데이터 로드 실패', error)
    return
  }

  data?.forEach(product => {
    context.productIdMap.set(product.name, product.id)
  })

  logger.info(`기존 제품(반) ${data?.length || 0}개 로드됨`)
}

// 선생님 마이그레이션
async function migrateTeachers(
  supabase: ReturnType<typeof createAdminClient>,
  context: MigrationContext,
  options: MigrationOptions
): Promise<void> {
  logger.info('=== 선생님 마이그레이션 시작 ===')

  const notionTeachers = loadNotionData<NotionPage>('teachers.json')
  if (notionTeachers.length === 0) {
    logger.info('선생님 데이터 없음 - 스킵')
    return
  }

  for (const page of notionTeachers) {
    const teacher = parseNotionTeacher(page)
    const transformed = transformToSupabaseTeacher(teacher)

    if (!transformed) {
      context.stats.failed++
      continue
    }

    // 이미 존재하는지 확인
    if (context.teacherIdMap.has(teacher.name)) {
      if (options.skipExisting) {
        logger.debug(`선생님 스킵 (기존): ${teacher.name}`)
        context.stats.skipped++
        continue
      }
    }

    context.stats.processed++

    if (options.dryRun || options.validateOnly) {
      logger.info(`[DRY-RUN] 선생님 삽입: ${teacher.name}`)
      context.stats.succeeded++
      continue
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert(transformed)
      .select('id')
      .single()

    if (error) {
      logger.error(`선생님 삽입 실패: ${teacher.name}`, error)
      context.stats.failed++
    } else {
      logger.success(`선생님 삽입 완료: ${teacher.name}`)
      context.teacherIdMap.set(teacher.name, data.id)
      context.insertedIds.teachers.push(data.id)
      context.stats.succeeded++
    }

    await delay(options.delayMs)
  }
}

// 학생 마이그레이션 (가족, 보호자, 스케줄 포함)
async function migrateStudents(
  supabase: ReturnType<typeof createAdminClient>,
  context: MigrationContext,
  options: MigrationOptions
): Promise<void> {
  logger.info('=== 원생 마이그레이션 시작 ===')

  const notionStudents = loadNotionData<NotionPage>('students.json')
  if (notionStudents.length === 0) {
    logger.error('원생 데이터 없음 - students.json 파일을 확인하세요')
    return
  }

  logger.info(`총 ${notionStudents.length}명의 원생 데이터 발견`)

  for (const page of notionStudents) {
    const student = parseNotionStudent(page)
    const { data, familyData, parentData, scheduleData } = transformToSupabaseStudent(
      student,
      context,
      { consentSigned: options.consentSigned }
    )

    if (!data) {
      context.stats.failed++
      continue
    }

    context.stats.processed++

    if (options.dryRun || options.validateOnly) {
      logger.info(`[DRY-RUN] 원생 삽입: ${student.name}`, {
        hasFamily: !!familyData,
        hasParent: !!parentData,
        hasSchedule: !!scheduleData,
      })
      context.stats.succeeded++
      continue
    }

    try {
      // 1. 가족 삽입 (있는 경우)
      let familyId: string | null = null
      if (familyData) {
        const { data: family, error: familyError } = await supabase
          .from('families')
          .insert(familyData)
          .select('id')
          .single()

        if (familyError) {
          logger.warn(`가족 삽입 실패: ${student.name}`, familyError)
        } else {
          familyId = family.id
          context.insertedIds.families.push(family.id)
        }
      }

      // 2. 보호자 삽입 (있는 경우)
      let parentId: string | null = null
      if (parentData && familyId) {
        const { data: parent, error: parentError } = await supabase
          .from('parents')
          .insert({ ...parentData, family_id: familyId })
          .select('id')
          .single()

        if (parentError) {
          logger.warn(`보호자 삽입 실패: ${student.name}`, parentError)
        } else {
          parentId = parent.id
          context.insertedIds.parents.push(parent.id)
        }
      }

      // 3. 원생 삽입
      const studentToInsert = {
        ...data,
        family_id: familyId,
      }

      const { data: insertedStudent, error: studentError } = await supabase
        .from('students')
        .insert(studentToInsert)
        .select('id')
        .single()

      if (studentError) {
        logger.error(`원생 삽입 실패: ${student.name}`, studentError)
        context.stats.failed++
        continue
      }

      context.studentIdMap.set(student.id, insertedStudent.id)
      context.insertedIds.students.push(insertedStudent.id)

      // 4. 보호자-원생 관계 삽입
      if (parentId) {
        const { error: relationError } = await supabase
          .from('parent_student_relations')
          .insert({
            parent_id: parentId,
            student_id: insertedStudent.id,
            relationship: 'parent', // 기본값
          })

        if (relationError) {
          logger.warn(`보호자-원생 관계 삽입 실패: ${student.name}`, relationError)
        } else {
          context.insertedIds.parentStudentRelations.push(`${parentId}-${insertedStudent.id}`)
        }
      }

      // 5. 스케줄 삽입 (있는 경우)
      if (scheduleData) {
        const { error: scheduleError } = await supabase
          .from('schedules')
          .insert({
            ...scheduleData,
            student_id: insertedStudent.id,
          })

        if (scheduleError) {
          logger.warn(`스케줄 삽입 실패: ${student.name}`, scheduleError)
        } else {
          context.insertedIds.schedules.push(insertedStudent.id)
        }
      }

      logger.success(`원생 삽입 완료: ${student.name}`)
      context.stats.succeeded++

    } catch (error) {
      logger.error(`원생 처리 중 오류: ${student.name}`, error)
      context.stats.failed++
    }

    await delay(options.delayMs)
  }
}

// 롤백 함수
async function rollback(
  supabase: ReturnType<typeof createAdminClient>,
  context: MigrationContext
): Promise<void> {
  logger.warn('=== 롤백 시작 ===')

  // 역순으로 삭제
  const tables: Array<{ table: string; ids: string[] }> = [
    { table: 'schedules', ids: context.insertedIds.schedules },
    { table: 'parent_student_relations', ids: [] }, // 복합키 처리 필요
    { table: 'students', ids: context.insertedIds.students },
    { table: 'parents', ids: context.insertedIds.parents },
    { table: 'families', ids: context.insertedIds.families },
    { table: 'teachers', ids: context.insertedIds.teachers },
  ]

  for (const { table, ids } of tables) {
    if (ids.length === 0) continue

    logger.info(`${table} 롤백 중... (${ids.length}건)`)

    if (table === 'schedules') {
      // schedules는 student_id로 삭제
      const { error } = await supabase
        .from(table)
        .delete()
        .in('student_id', ids)

      if (error) {
        logger.error(`${table} 롤백 실패`, error)
      }
    } else {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids)

      if (error) {
        logger.error(`${table} 롤백 실패`, error)
      }
    }
  }

  logger.warn('롤백 완료')
}

// 딜레이 함수
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 메인 함수
async function main() {
  console.log('\n')
  console.log('='.repeat(60))
  console.log('  Notion → Supabase 마이그레이션 스크립트')
  console.log('='.repeat(60))
  console.log('\n')

  const options = parseArgs()

  if (options.dryRun) {
    logger.warn('DRY-RUN 모드: 실제 데이터는 저장되지 않습니다')
  }
  if (options.validateOnly) {
    logger.warn('VALIDATE-ONLY 모드: 검증만 수행합니다')
  }

  // 환경변수 확인
  checkEnvironment()

  // Supabase 클라이언트 생성
  const supabase = createAdminClient()
  logger.success('Supabase 연결 완료')

  // 마이그레이션 컨텍스트 초기화
  const context = createMigrationContext()

  try {
    // 기존 데이터 로드 (ID 매핑용)
    await loadExistingTeachers(supabase, context)
    await loadExistingProducts(supabase, context)

    // 1. 선생님 마이그레이션
    await migrateTeachers(supabase, context, options)

    // 2. 원생 마이그레이션 (가족, 보호자, 스케줄 포함)
    await migrateStudents(supabase, context, options)

    // 결과 요약
    const summary = logger.summary()

    if (summary.error && summary.error > 0 && !options.dryRun) {
      logger.warn('오류가 발생했습니다. 롤백하시겠습니까? (y/N)')

      // 실제 운영에서는 readline으로 입력 받기
      // 여기서는 자동 스킵
    }

  } catch (error) {
    logger.error('마이그레이션 중 치명적 오류 발생', error)

    if (!options.dryRun && context.insertedIds.students.length > 0) {
      logger.warn('삽입된 데이터가 있습니다. 롤백을 진행합니다.')
      await rollback(supabase, context)
    }

    process.exit(1)
  }

  console.log('\n마이그레이션 완료!\n')
}

// 실행
main().catch(console.error)

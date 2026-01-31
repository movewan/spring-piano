import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  readExcelBuffer,
  getHeaders,
  detectFileType,
  parseSalesExcel,
  parseDailySummaryExcel
} from '@/lib/payhere/excel-parser'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileTypeHint = formData.get('fileType') as string | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다' },
        { status: 400 }
      )
    }

    // 파일 확장자 확인
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. xlsx, xls, csv 파일만 업로드 가능합니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기가 10MB를 초과합니다' },
        { status: 400 }
      )
    }

    // 엑셀 파일 읽기
    const buffer = await file.arrayBuffer()
    const worksheet = readExcelBuffer(buffer)
    const headers = getHeaders(worksheet)

    // 파일 타입 감지
    const detectedType = fileTypeHint || detectFileType(headers)

    if (!detectedType) {
      return NextResponse.json(
        {
          error: '파일 형식을 인식할 수 없습니다',
          headers,
          suggestion: '파일 타입을 직접 선택해주세요 (sales: 결제 내역, daily_summary: 기간별 조회)'
        },
        { status: 400 }
      )
    }

    // 배치 ID 생성
    const batchId = uuidv4()
    const supabase = createAdminClient()

    let result
    let tableName: string
    let insertData: Record<string, unknown>[]

    if (detectedType === 'sales') {
      // 결제 내역 파싱
      result = parseSalesExcel(worksheet)
      tableName = 'sales_records'
      insertData = result.data.map(record => ({
        ...record,
        import_batch_id: batchId
      }))
    } else if (detectedType === 'daily_summary') {
      // 일별 집계 파싱
      result = parseDailySummaryExcel(worksheet)
      tableName = 'daily_sales_summary'
      insertData = result.data.map(record => ({
        ...record,
        import_batch_id: batchId
      }))
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 파일 타입입니다' },
        { status: 400 }
      )
    }

    if (!result.success && result.data.length === 0) {
      return NextResponse.json(
        {
          error: '데이터를 파싱할 수 없습니다',
          errors: result.errors
        },
        { status: 400 }
      )
    }

    // DB에 데이터 삽입
    const { error: insertError, count } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        {
          error: 'DB 저장 중 오류가 발생했습니다',
          details: insertError.message
        },
        { status: 500 }
      )
    }

    // Import 로그 저장
    await supabase
      .from('import_logs')
      .insert({
        batch_id: batchId,
        file_name: file.name,
        file_type: detectedType,
        records_count: result.totalRows,
        success_count: result.data.length,
        error_count: result.errors.length,
        errors: result.errors.length > 0 ? result.errors : null
      })

    return NextResponse.json({
      success: true,
      message: `${result.data.length}건의 데이터가 저장되었습니다`,
      batchId,
      fileType: detectedType,
      stats: {
        totalRows: result.totalRows,
        imported: result.data.length,
        errors: result.errors.length
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        error: '파일 처리 중 오류가 발생했습니다',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

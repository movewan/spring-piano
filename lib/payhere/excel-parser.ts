/**
 * Payhere Excel 파서
 * Payhere 엑셀 형식을 파싱하여 DB 레코드로 변환
 */

import * as XLSX from 'xlsx'
import {
  SalesRecord,
  DailySalesSummary,
  SettlementRecord,
  ParseResult,
  ExcelFileType
} from './types'

/**
 * 날짜 문자열 파싱 (다양한 형식 지원)
 * - 2026.01.02
 * - 2026-01-02
 * - 2026/01/02
 */
function parseDate(value: string | number | Date | undefined): string | null {
  if (!value) return null

  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }

  if (typeof value === 'number') {
    // Excel 날짜 시리얼 넘버 처리
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
    return null
  }

  const str = String(value).trim()

  // 2026.01.02 형식
  const dotFormat = str.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
  if (dotFormat) {
    return `${dotFormat[1]}-${dotFormat[2]}-${dotFormat[3]}`
  }

  // 2026-01-02 형식
  const dashFormat = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dashFormat) {
    return str
  }

  // 2026/01/02 형식
  const slashFormat = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (slashFormat) {
    return `${slashFormat[1]}-${slashFormat[2]}-${slashFormat[3]}`
  }

  return null
}

/**
 * 시간 문자열 파싱
 * - 13:12:49
 * - 13:12
 */
function parseTime(value: string | number | undefined): string | null {
  if (!value) return null

  if (typeof value === 'number') {
    // Excel 시간 값 (0~1 사이의 소수)
    const totalSeconds = Math.round(value * 24 * 60 * 60)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const str = String(value).trim()
  const timeFormat = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (timeFormat) {
    const [, h, m, s = '00'] = timeFormat
    return `${h.padStart(2, '0')}:${m}:${s}`
  }

  return null
}

/**
 * 숫자 파싱 (쉼표 제거, 문자열 처리)
 */
function parseNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value

  const str = String(value).replace(/,/g, '').replace(/원/g, '').trim()

  // "14건" 같은 형식
  const countMatch = str.match(/^(\d+)건?$/)
  if (countMatch) {
    return parseInt(countMatch[1], 10)
  }

  const num = parseInt(str, 10)
  return isNaN(num) ? 0 : num
}

/**
 * 엑셀 파일 타입 자동 감지
 */
export function detectFileType(headers: string[]): ExcelFileType | null {
  const headerStr = headers.join(',').toLowerCase()

  // 결제 내역 엑셀 (개별 거래)
  if (headerStr.includes('결제(환불)일') || headerStr.includes('결제 시간')) {
    return 'sales'
  }

  // 기간별 조회 엑셀 (일별 집계)
  if (headerStr.includes('결제 건수') || headerStr.includes('총 매출') || headerStr.includes('실 매출')) {
    return 'daily_summary'
  }

  // 정산 내역
  if (headerStr.includes('정산일') || headerStr.includes('수수료')) {
    return 'settlement'
  }

  return null
}

/**
 * 결제 내역 엑셀 파싱
 * 컬럼: No., 영업일, 결제(환불)일, 결제 시간, 결제(환불)내역, 합계, 결제 금액, 할인, 포인트 사용
 */
export function parseSalesExcel(worksheet: XLSX.WorkSheet): ParseResult<SalesRecord> {
  const data: SalesRecord[] = []
  const errors: { row: number; message: string }[] = []

  const jsonData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, {
    header: 1,
    raw: false
  })

  if (jsonData.length < 2) {
    return { success: false, data: [], errors: [{ row: 0, message: '데이터가 없습니다' }], totalRows: 0 }
  }

  // 헤더 행 찾기 (첫 번째 행 또는 No.가 있는 행)
  let headerRowIndex = 0
  const firstRow = jsonData[0]
  if (!firstRow || !firstRow.some(cell => cell && String(cell).includes('영업일'))) {
    // 헤더가 아닌 경우 다음 행 확인
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i]
      if (row && row.some(cell => cell && String(cell).includes('영업일'))) {
        headerRowIndex = i
        break
      }
    }
  }

  const headers = (jsonData[headerRowIndex] || []).map(h => String(h || '').trim())

  // 컬럼 인덱스 매핑
  const colMap: Record<string, number> = {}
  const columnNames = ['No.', '영업일', '결제(환불)일', '결제 시간', '결제(환불)내역', '합계', '결제 금액', '할인', '포인트 사용']

  headers.forEach((header, index) => {
    for (const name of columnNames) {
      if (header.includes(name.replace('.', ''))) {
        colMap[name] = index
        break
      }
    }
  })

  // 데이터 행 파싱
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as (string | number)[]
    if (!row || row.every(cell => !cell)) continue // 빈 행 스킵

    try {
      const saleDate = parseDate(row[colMap['영업일']])
      if (!saleDate) {
        errors.push({ row: i + 1, message: '영업일이 유효하지 않습니다' })
        continue
      }

      const totalAmount = parseNumber(row[colMap['합계']])
      const amount = parseNumber(row[colMap['결제 금액']])

      if (totalAmount === 0 && amount === 0) {
        continue // 금액이 없는 행은 스킵
      }

      const record: SalesRecord = {
        sale_date: saleDate,
        payment_date: parseDate(row[colMap['결제(환불)일']]) || undefined,
        payment_time: parseTime(row[colMap['결제 시간']]) || undefined,
        description: row[colMap['결제(환불)내역']] ? String(row[colMap['결제(환불)내역']]) : undefined,
        total_amount: totalAmount,
        amount: amount || totalAmount,
        discount: parseNumber(row[colMap['할인']]),
        point_used: parseNumber(row[colMap['포인트 사용']]),
        status: 'completed',
        source: 'excel'
      }

      data.push(record)
    } catch (err) {
      errors.push({ row: i + 1, message: `파싱 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}` })
    }
  }

  return {
    success: errors.length === 0 || data.length > 0,
    data,
    errors,
    totalRows: jsonData.length - headerRowIndex - 1
  }
}

/**
 * 기간별 조회 엑셀 파싱 (일별 집계)
 * 컬럼: 영업일, 결제 건수, 총 매출, 실 매출, 할인, 포인트 사용, 환불 금액
 */
export function parseDailySummaryExcel(worksheet: XLSX.WorkSheet): ParseResult<DailySalesSummary> {
  const data: DailySalesSummary[] = []
  const errors: { row: number; message: string }[] = []

  const jsonData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, {
    header: 1,
    raw: false
  })

  if (jsonData.length < 2) {
    return { success: false, data: [], errors: [{ row: 0, message: '데이터가 없습니다' }], totalRows: 0 }
  }

  // 헤더 행 찾기
  let headerRowIndex = 0
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i]
    if (row && row.some(cell => cell && (String(cell).includes('영업일') || String(cell).includes('결제 건수')))) {
      headerRowIndex = i
      break
    }
  }

  const headers = (jsonData[headerRowIndex] || []).map(h => String(h || '').trim())

  // 컬럼 인덱스 매핑
  const colMap: Record<string, number> = {}
  const columnNames = ['영업일', '결제 건수', '총 매출', '실 매출', '할인', '포인트 사용', '환불 금액']

  headers.forEach((header, index) => {
    for (const name of columnNames) {
      if (header.includes(name)) {
        colMap[name] = index
        break
      }
    }
  })

  // 데이터 행 파싱
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as (string | number)[]
    if (!row || row.every(cell => !cell)) continue

    try {
      const date = parseDate(row[colMap['영업일']])
      if (!date) {
        errors.push({ row: i + 1, message: '영업일이 유효하지 않습니다' })
        continue
      }

      const record: DailySalesSummary = {
        date,
        transaction_count: parseNumber(row[colMap['결제 건수']]),
        total_sales: parseNumber(row[colMap['총 매출']]),
        net_sales: parseNumber(row[colMap['실 매출']]),
        discount: parseNumber(row[colMap['할인']]),
        point_used: parseNumber(row[colMap['포인트 사용']]),
        refund_amount: parseNumber(row[colMap['환불 금액']]),
        source: 'excel'
      }

      data.push(record)
    } catch (err) {
      errors.push({ row: i + 1, message: `파싱 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}` })
    }
  }

  return {
    success: errors.length === 0 || data.length > 0,
    data,
    errors,
    totalRows: jsonData.length - headerRowIndex - 1
  }
}

/**
 * 엑셀 버퍼에서 워크시트 읽기
 */
export function readExcelBuffer(buffer: ArrayBuffer): XLSX.WorkSheet {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  return workbook.Sheets[sheetName]
}

/**
 * 헤더 행 추출
 */
export function getHeaders(worksheet: XLSX.WorkSheet): string[] {
  const jsonData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, { header: 1 })

  // 첫 5행 중 가장 많은 셀이 있는 행을 헤더로 간주
  let maxCells = 0
  let headerRow: string[] = []

  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i]
    if (row && row.length > maxCells) {
      maxCells = row.length
      headerRow = row.map(cell => String(cell || '').trim())
    }
  }

  return headerRow
}

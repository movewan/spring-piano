/**
 * 날짜 유틸리티
 */

/**
 * 주어진 날짜가 속한 주의 시작일(월요일)을 반환
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 일요일이면 이전 주 월요일
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 주어진 날짜가 속한 주의 모든 날짜를 반환 (월-일)
 */
export function getWeekDays(date: Date): Date[] {
  const weekStart = getWeekStart(date)
  const days: Date[] = []

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    days.push(day)
  }

  return days
}

/**
 * 날짜 포맷: "1월 30일"
 */
export function formatDateKorean(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

/**
 * 날짜 포맷: "2025-01-30"
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * 두 날짜가 같은 날인지 확인
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * 주 이동: -1 이전주, +1 다음주
 */
export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

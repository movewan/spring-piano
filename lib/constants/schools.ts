/**
 * 하남시 학교 목록
 * 사용자가 직접 입력도 가능하도록 자동완성으로 제공
 */

export type SchoolType = 'elementary' | 'middle' | 'high' | 'etc'

export interface School {
  name: string
  type: SchoolType
}

export const SCHOOLS: School[] = [
  // 초등학교
  { name: '미사중앙초등학교', type: 'elementary' },
  { name: '미사초등학교', type: 'elementary' },
  { name: '미사강변초등학교', type: 'elementary' },
  { name: '망월초등학교', type: 'elementary' },
  { name: '덕풍초등학교', type: 'elementary' },
  { name: '풍산초등학교', type: 'elementary' },
  { name: '위례초등학교', type: 'elementary' },
  { name: '위례별초등학교', type: 'elementary' },
  { name: '하남초등학교', type: 'elementary' },
  { name: '신장초등학교', type: 'elementary' },
  { name: '감일초등학교', type: 'elementary' },
  { name: '감일백현초등학교', type: 'elementary' },
  { name: '창우초등학교', type: 'elementary' },
  // 중학교
  { name: '미사중학교', type: 'middle' },
  { name: '덕풍중학교', type: 'middle' },
  { name: '풍산중학교', type: 'middle' },
  { name: '위례중학교', type: 'middle' },
  { name: '하남중학교', type: 'middle' },
  { name: '신장중학교', type: 'middle' },
  { name: '감일중학교', type: 'middle' },
  // 고등학교
  { name: '미사고등학교', type: 'high' },
  { name: '덕풍고등학교', type: 'high' },
  { name: '위례고등학교', type: 'high' },
  { name: '하남고등학교', type: 'high' },
]

/**
 * 학교 타입별 학년 옵션
 */
export const GRADES_BY_TYPE: Record<SchoolType, { value: string; label: string }[]> = {
  elementary: [
    { value: '1', label: '1학년' },
    { value: '2', label: '2학년' },
    { value: '3', label: '3학년' },
    { value: '4', label: '4학년' },
    { value: '5', label: '5학년' },
    { value: '6', label: '6학년' },
  ],
  middle: [
    { value: '7', label: '중1' },
    { value: '8', label: '중2' },
    { value: '9', label: '중3' },
  ],
  high: [
    { value: '10', label: '고1' },
    { value: '11', label: '고2' },
    { value: '12', label: '고3' },
  ],
  etc: [
    { value: '0', label: '미취학' },
    { value: '1', label: '1학년' },
    { value: '2', label: '2학년' },
    { value: '3', label: '3학년' },
    { value: '4', label: '4학년' },
    { value: '5', label: '5학년' },
    { value: '6', label: '6학년' },
    { value: '7', label: '중1' },
    { value: '8', label: '중2' },
    { value: '9', label: '중3' },
    { value: '10', label: '고1' },
    { value: '11', label: '고2' },
    { value: '12', label: '고3' },
    { value: '13', label: '성인' },
  ],
}

/**
 * 학교 이름에서 타입 추론
 */
export function getSchoolType(schoolName: string): SchoolType {
  if (schoolName.includes('초등학교') || schoolName.endsWith('초')) {
    return 'elementary'
  }
  if (schoolName.includes('중학교') || schoolName.endsWith('중')) {
    return 'middle'
  }
  if (schoolName.includes('고등학교') || schoolName.endsWith('고')) {
    return 'high'
  }
  return 'etc'
}

/**
 * 학교 검색 (자동완성용)
 */
export function searchSchools(query: string): School[] {
  if (!query) return []
  const lowerQuery = query.toLowerCase()
  return SCHOOLS.filter((school) =>
    school.name.toLowerCase().includes(lowerQuery)
  )
}

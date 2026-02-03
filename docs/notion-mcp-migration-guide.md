# Notion MCP 직접 연동 마이그레이션 가이드

## 개요
이 가이드는 Notion MCP를 사용하여 원장님의 Notion 데이터베이스를 Supabase로 자동 마이그레이션하는 방법을 설명합니다.

---

## 사전 요구사항

### 1. Notion MCP 설치 (완료)
```bash
claude mcp add notion --transport http https://mcp.notion.com/mcp
```

### 2. 환경변수 설정
`.env.local` 파일에 다음 환경변수가 필요합니다:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ENCRYPTION_KEY=your_32_char_encryption_key
```

---

## 마이그레이션 실행 방법

### Step 1: Claude Code 재시작
Notion MCP를 처음 설치한 후에는 Claude Code를 재시작해야 합니다.

### Step 2: OAuth 인증
Claude Code에서 Notion 관련 도구를 처음 사용하면 자동으로 OAuth 플로우가 시작됩니다:
1. 브라우저에서 Notion 로그인 페이지가 열림
2. Notion 계정으로 로그인
3. Claude Code에 데이터베이스 접근 권한 부여
4. 인증 완료 후 자동으로 토큰 관리

### Step 3: 데이터베이스 URL 제공
원장님이 Notion 원생 데이터베이스 URL을 알려주면:
```
https://notion.so/xxxxx?v=yyyy
```

URL에서 데이터베이스 ID를 추출합니다:
- `xxxxx` 부분이 데이터베이스 ID (32자리 또는 하이픈 포함 36자리)

---

## 마이그레이션 워크플로우

Claude가 다음 단계를 자동으로 수행합니다:

### 1단계: 데이터베이스 스키마 확인
```
Notion MCP `retrieve_database` 도구로 데이터베이스 구조 확인
- 속성(컬럼) 이름 및 타입 파악
- 기존 transformers.ts 매핑과 비교
```

### 2단계: 데이터 조회
```
Notion MCP `query_database` 도구로 전체 데이터 조회
- 페이지네이션 자동 처리
- Rate limit (분당 180 요청) 준수
```

### 3단계: 데이터 변환
기존 스크립트 재사용:
- `scripts/notion/transformers.ts` - 데이터 변환
- `scripts/notion/types.ts` - 타입 정의
- `lib/crypto/aes.ts` - 전화번호 암호화

### 4단계: Supabase 삽입
Supabase MCP 또는 Admin Client로 데이터 삽입:
1. 선생님 데이터 (teachers)
2. 가족 데이터 (families)
3. 보호자 데이터 (parents)
4. 원생 데이터 (students)
5. 스케줄 데이터 (schedules)

### 5단계: 검증
삽입된 데이터 검증:
- 총 레코드 수 확인
- 관계 무결성 확인
- 암호화 데이터 복호화 테스트

---

## Notion 데이터베이스 속성 매핑

현재 `transformers.ts`에서 지원하는 속성 이름:

| Notion 속성 (한글) | Notion 속성 (영문) | Supabase 필드 |
|-------------------|-------------------|---------------|
| 이름 | Name | name |
| 전화번호 | Phone | encrypted_phone |
| 생년월일 | Birth Date | birth_date |
| 학교 | School | school |
| 학년 | Grade | grade |
| 반 | Class | product_id |
| 담당 선생님 | Teacher | teacher_id (via schedules) |
| 보호자 이름 | Parent Name | parents.name |
| 보호자 연락처 | Parent Phone | parents.encrypted_phone |
| 요일 | Day | schedules.day_of_week |
| 시작 시간 | Start Time | schedules.start_time |
| 종료 시간 | End Time | schedules.end_time |
| 활성/퇴원 | Active | is_active |
| 메모 | Notes | notes |

**참고**: 속성 이름이 다른 경우 `transformers.ts`의 `parseNotionStudent` 함수 수정 필요

---

## 주의사항

### 보안
- 전화번호는 자동으로 AES-256으로 암호화됨
- 마지막 4자리 해시로 검색 가능
- ENCRYPTION_KEY 환경변수 필수

### API 제한
- Notion API: 분당 180 요청
- 대량 데이터 마이그레이션 시 자동 딜레이 적용

### 기존 원생 처리
- 기존 원생은 `consent_signed: true` 자동 설정
- 중복 확인 후 삽입 (이름 + 전화번호 기준)

---

## 문제 해결

### OAuth 인증 실패
```bash
# MCP 설정 확인
cat ~/.claude.json | grep notion
```

### 데이터베이스 접근 권한 없음
- Notion에서 해당 데이터베이스를 "공유" 설정으로 변경
- 또는 Notion Integration에 데이터베이스 접근 권한 부여

### 속성 매핑 오류
- Notion 데이터베이스의 실제 속성 이름 확인
- `transformers.ts`의 매핑 업데이트

---

## 실행 예시

원장님이 데이터베이스 URL을 제공하면:

```
원장님: "Notion 원생 데이터베이스 URL이에요: https://notion.so/abc123..."

Claude:
1. 데이터베이스 ID 추출: abc123...
2. OAuth 인증 (첫 실행 시)
3. 데이터베이스 스키마 확인
4. 원생 데이터 조회 (50명)
5. 데이터 변환 및 암호화
6. Supabase 삽입
7. 결과 보고
   - 성공: 48명
   - 실패: 2명 (전화번호 형식 오류)
```

---

## 관련 파일

- `scripts/notion/transformers.ts` - 데이터 변환 로직
- `scripts/notion/types.ts` - 타입 정의
- `scripts/utils/logger.ts` - 로깅
- `scripts/utils/validator.ts` - 데이터 검증
- `scripts/migrate-from-notion.ts` - CLI 마이그레이션 스크립트
- `lib/crypto/aes.ts` - 암호화 유틸리티

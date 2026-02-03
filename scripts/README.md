# Notion → Supabase 마이그레이션 스크립트

원장님 Notion의 기존 원생 데이터를 Spring Piano Supabase 데이터베이스로 안전하게 마이그레이션합니다.

## 사전 준비

### 1. 환경변수 확인

`.env.local` 파일에 다음 환경변수가 설정되어 있어야 합니다:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-64-char-hex-key
```

### 2. Notion 데이터 내보내기

1. Notion에서 원생 데이터베이스 열기
2. 우측 상단 `...` 메뉴 → `Export` → `Markdown & CSV` 또는 `JSON`
3. 다운로드한 파일을 `scripts/data/students.json`으로 저장

### 3. 속성 매핑 확인

Notion 데이터베이스의 속성 이름이 다음과 다르면 `notion/transformers.ts`에서 매핑을 조정하세요:

| Notion 속성 | 기본 매핑 | 설명 |
|-------------|-----------|------|
| 이름 / Name | name | 원생 이름 (필수) |
| 전화번호 / Phone | phone | 원생 연락처 |
| 생년월일 / Birth Date | birth_date | YYYY-MM-DD |
| 학교 / School | school | 학교명 |
| 학년 / Grade | grade | 숫자 |
| 반 / Class | product_id | 수강반 매핑 |
| 담당 선생님 / Teacher | teacher_id | 선생님 매핑 |
| 보호자 이름 / Parent Name | parent.name | 보호자 |
| 보호자 연락처 / Parent Phone | parent.phone | 보호자 연락처 |
| 요일 / Day | schedule.day_of_week | 월/화/수... |
| 시작 시간 / Start Time | schedule.start_time | HH:MM |
| 종료 시간 / End Time | schedule.end_time | HH:MM |
| 활성 | is_active | 체크박스 |
| 메모 / Notes | notes | 텍스트 |

## 실행 방법

### 1. Dry-run (테스트)

실제 데이터베이스에 저장하지 않고 변환 결과만 확인:

```bash
npx tsx scripts/migrate-from-notion.ts --dry-run
```

### 2. 검증만 수행

데이터 형식과 유효성만 검사:

```bash
npx tsx scripts/migrate-from-notion.ts --validate-only
```

### 3. 실제 마이그레이션

```bash
npx tsx scripts/migrate-from-notion.ts
```

### 4. 기존 데이터 스킵

이미 존재하는 데이터는 건너뛰기:

```bash
npx tsx scripts/migrate-from-notion.ts --skip-existing
```

## 마이그레이션 순서

스크립트는 의존성을 고려하여 다음 순서로 데이터를 삽입합니다:

1. **Teachers** (선생님) - 의존 없음
2. **Products** (수강반) - 기존 데이터 매핑만
3. **Families** (가족) - 의존 없음
4. **Parents** (보호자) - families 참조
5. **Students** (원생) - families, products 참조
6. **Parent-Student Relations** - parents, students 참조
7. **Schedules** (시간표) - students, teachers 참조

## 데이터 처리

### 전화번호 암호화

- 원본 전화번호는 AES-256-GCM으로 암호화
- 뒷 4자리는 SHA-256 해시로 검색용 저장
- 하이픈 등 특수문자는 자동 제거

### 동의 처리

- 기존 원생은 `consent_signed: true`로 처리 (이미 동의 완료)
- `consent_date`는 마이그레이션 날짜로 설정

### ID 매핑

- 선생님 이름 → Supabase teachers.id
- 반 이름 → Supabase products.id
- 매핑 실패 시 경고 로그 출력

## 롤백

마이그레이션 중 오류 발생 시 삽입된 데이터를 역순으로 삭제합니다:

```
schedules → relations → students → parents → families → teachers
```

## 검증 방법

마이그레이션 후 다음을 확인하세요:

### 레코드 수 확인

```sql
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM parents;
SELECT COUNT(*) FROM schedules;
```

### 관계 무결성 확인

```sql
-- family_id가 있는데 families에 없는 경우
SELECT s.id, s.name
FROM students s
LEFT JOIN families f ON s.family_id = f.id
WHERE f.id IS NULL AND s.family_id IS NOT NULL;
```

### 웹 UI 확인

1. 관리자 페이지에서 원생 목록 확인
2. 학부모 포털에서 조회 테스트

## 파일 구조

```
scripts/
├── migrate-from-notion.ts    # 메인 스크립트
├── notion/
│   ├── types.ts              # Notion 데이터 타입
│   └── transformers.ts       # 데이터 변환 로직
├── utils/
│   ├── logger.ts             # 로깅
│   └── validator.ts          # 검증
├── data/
│   ├── .gitkeep
│   ├── sample-students.json  # 샘플 형식
│   └── students.json         # 실제 데이터 (직접 추가)
└── README.md                 # 이 문서
```

## 문제 해결

### "ENCRYPTION_KEY is not set"

`.env.local`에 ENCRYPTION_KEY가 없습니다. 64자리 hex 문자열이 필요합니다.

### "선생님 매핑 실패: XXX"

Notion의 선생님 이름이 Supabase teachers 테이블과 일치하지 않습니다.
먼저 선생님 데이터를 추가하거나 이름을 맞춰주세요.

### "반 매핑 실패: XXX"

Notion의 반 이름이 Supabase products 테이블과 일치하지 않습니다.
먼저 수강반 데이터를 추가하거나 이름을 맞춰주세요.

### "전화번호 길이 부족"

전화번호가 10자리 미만입니다. Notion 데이터를 확인하세요.

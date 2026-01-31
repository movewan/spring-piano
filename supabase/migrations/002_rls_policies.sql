-- SpringPiano RLS Policies
-- Row Level Security 정책 설정

-- ============================================
-- 1. RLS 활성화
-- ============================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 관리자 정책 (admin@springpiano.local)
-- ============================================

-- families
CREATE POLICY "Admin full access on families"
  ON families FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- parents
CREATE POLICY "Admin full access on parents"
  ON parents FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- parent_auth
CREATE POLICY "Admin full access on parent_auth"
  ON parent_auth FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- students
CREATE POLICY "Admin full access on students"
  ON students FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- parent_student_relations
CREATE POLICY "Admin full access on parent_student_relations"
  ON parent_student_relations FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- products (공개 읽기)
CREATE POLICY "Everyone can read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage products"
  ON products FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- teachers (공개 읽기)
CREATE POLICY "Everyone can read teachers"
  ON teachers FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage teachers"
  ON teachers FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- schedules
CREATE POLICY "Admin full access on schedules"
  ON schedules FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- attendance
CREATE POLICY "Admin full access on attendance"
  ON attendance FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- payments
CREATE POLICY "Admin full access on payments"
  ON payments FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- feedback
CREATE POLICY "Admin full access on feedback"
  ON feedback FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- ============================================
-- 3. 키오스크 정책 (익명 접근)
-- ============================================

-- 키오스크에서 학생 조회 (phone_search_hash로 검색)
CREATE POLICY "Anon can search students by phone hash"
  ON students FOR SELECT
  USING (true);

-- 키오스크에서 출석 기록 추가
CREATE POLICY "Anon can insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 4. 학부모 정책 (JWT 기반)
-- ============================================

-- 학부모가 자녀 정보 조회
-- (서버사이드에서 JWT 검증 후 처리하므로 여기서는 별도 정책 없음)
-- API Route에서 Service Role Key로 접근

-- ============================================
-- 5. Service Role 우회
-- ============================================

-- Service Role Key를 사용하는 경우 모든 정책 우회
-- (암호화/복호화 작업, 관리자 작업 등)

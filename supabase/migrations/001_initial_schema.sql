-- SpringPiano Database Schema
-- 이화피아노의봄 원생 관리 시스템

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 기본 테이블 생성
-- ============================================

-- 가족 테이블
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name TEXT NOT NULL,
  discount_tier INTEGER DEFAULT 0 CHECK (discount_tier >= 0 AND discount_tier <= 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN families.discount_tier IS '0: 없음, 1: 5% (2명), 2: 10% (3명 이상)';

-- 수강 과정 테이블
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  lessons_per_month INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 선생님 테이블
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT,
  encrypted_phone TEXT,
  color TEXT NOT NULL DEFAULT '#7BC4C4',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 보호자 테이블
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  encrypted_phone TEXT NOT NULL,
  phone_search_hash TEXT NOT NULL,
  birth_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parents_phone_search ON parents(phone_search_hash);
CREATE INDEX idx_parents_family ON parents(family_id);

-- 보호자 인증 테이블
CREATE TABLE parent_auth (
  parent_id UUID PRIMARY KEY REFERENCES parents(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ
);

-- 원생 테이블
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  encrypted_phone TEXT NOT NULL,
  phone_search_hash TEXT NOT NULL,
  birth_date DATE,
  school TEXT,
  grade INTEGER CHECK (grade >= 1 AND grade <= 12),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  consent_signed BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_phone_search ON students(phone_search_hash);
CREATE INDEX idx_students_family ON students(family_id);
CREATE INDEX idx_students_product ON students(product_id);
CREATE INDEX idx_students_active ON students(is_active);

-- 보호자-원생 관계 테이블
CREATE TABLE parent_student_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT '보호자',
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_psr_parent ON parent_student_relations(parent_id);
CREATE INDEX idx_psr_student ON parent_student_relations(student_id);

-- 시간표 테이블
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_schedules_student ON schedules(student_id);
CREATE INDEX idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX idx_schedules_day ON schedules(day_of_week);

-- 출석 테이블
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_checkin ON attendance(check_in_time);

-- 결제 테이블
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  base_amount INTEGER NOT NULL CHECK (base_amount >= 0),
  family_discount INTEGER DEFAULT 0 CHECK (family_discount >= 0),
  additional_discount INTEGER DEFAULT 0 CHECK (additional_discount >= 0),
  final_amount INTEGER NOT NULL CHECK (final_amount >= 0),
  payment_method TEXT CHECK (payment_method IN ('card', 'cash', 'transfer')),
  payment_date DATE NOT NULL,
  month_year TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_amounts CHECK (
    final_amount = base_amount - family_discount - additional_discount
  )
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_month ON payments(month_year);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- 피드백 테이블
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  content TEXT NOT NULL,
  video_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_feedback_student ON feedback(student_id);
CREATE INDEX idx_feedback_month ON feedback(month_year);
CREATE INDEX idx_feedback_published ON feedback(is_published);

-- ============================================
-- 2. 트리거 함수
-- ============================================

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 가족 할인 티어 자동 계산
CREATE OR REPLACE FUNCTION update_family_discount()
RETURNS TRIGGER AS $$
DECLARE
  student_count INTEGER;
BEGIN
  -- 새 원생이 추가되거나 family_id가 변경된 경우
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.family_id IS DISTINCT FROM NEW.family_id) THEN
    -- 새 가족의 할인 티어 업데이트
    IF NEW.family_id IS NOT NULL THEN
      SELECT COUNT(*) INTO student_count
      FROM students
      WHERE family_id = NEW.family_id AND is_active = TRUE;

      UPDATE families
      SET discount_tier = CASE
        WHEN student_count >= 3 THEN 2
        WHEN student_count = 2 THEN 1
        ELSE 0
      END
      WHERE id = NEW.family_id;
    END IF;

    -- 이전 가족의 할인 티어 업데이트 (UPDATE의 경우)
    IF TG_OP = 'UPDATE' AND OLD.family_id IS NOT NULL AND OLD.family_id IS DISTINCT FROM NEW.family_id THEN
      SELECT COUNT(*) INTO student_count
      FROM students
      WHERE family_id = OLD.family_id AND is_active = TRUE;

      UPDATE families
      SET discount_tier = CASE
        WHEN student_count >= 3 THEN 2
        WHEN student_count = 2 THEN 1
        ELSE 0
      END
      WHERE id = OLD.family_id;
    END IF;
  END IF;

  -- 원생이 삭제되거나 비활성화된 경우
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE) THEN
    IF COALESCE(OLD.family_id, NEW.family_id) IS NOT NULL THEN
      SELECT COUNT(*) INTO student_count
      FROM students
      WHERE family_id = COALESCE(OLD.family_id, NEW.family_id) AND is_active = TRUE;

      UPDATE families
      SET discount_tier = CASE
        WHEN student_count >= 3 THEN 2
        WHEN student_count = 2 THEN 1
        ELSE 0
      END
      WHERE id = COALESCE(OLD.family_id, NEW.family_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_family_discount
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_family_discount();

-- ============================================
-- 3. Realtime 활성화
-- ============================================

-- attendance 테이블에 대해 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- ============================================
-- 4. 초기 데이터
-- ============================================

-- 기본 수강 과정
INSERT INTO products (name, description, price, duration_minutes, lessons_per_month) VALUES
  ('기초반', '피아노 입문자를 위한 기초 과정', 150000, 30, 4),
  ('정규반', '체르니 100번 이상 수준', 180000, 40, 4),
  ('심화반', '체르니 30번 이상 수준', 200000, 50, 4),
  ('성인반', '성인 취미 피아노', 180000, 40, 4);

-- 기본 선생님
INSERT INTO teachers (name, specialty, color) VALUES
  ('김선생', '클래식', '#7BC4C4'),
  ('이선생', '재즈/팝', '#FF7EB3'),
  ('박선생', '기초/입문', '#FFB347');

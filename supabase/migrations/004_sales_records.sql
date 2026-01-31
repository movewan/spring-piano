-- Sales and Settlement records tables for Excel import
-- 매출 및 정산 데이터 (Payhere 엑셀 업로드용)

-- ============================================
-- 1. 매출 데이터 테이블
-- ============================================

CREATE TABLE sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL,
  payment_date DATE,
  payment_time TIME,
  student_name TEXT,
  product_name TEXT,
  description TEXT,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  discount INTEGER DEFAULT 0,
  point_used INTEGER DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded')),
  source TEXT DEFAULT 'excel' CHECK (source IN ('excel', 'manual')),
  import_batch_id UUID,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_records_date ON sales_records(sale_date);
CREATE INDEX idx_sales_records_student ON sales_records(student_name);
CREATE INDEX idx_sales_records_batch ON sales_records(import_batch_id);
CREATE INDEX idx_sales_records_source ON sales_records(source);

COMMENT ON TABLE sales_records IS '매출 데이터 (엑셀에서 가져온 데이터)';
COMMENT ON COLUMN sales_records.sale_date IS '영업일';
COMMENT ON COLUMN sales_records.payment_date IS '결제(환불)일';
COMMENT ON COLUMN sales_records.payment_time IS '결제 시간';
COMMENT ON COLUMN sales_records.description IS '결제(환불)내역';
COMMENT ON COLUMN sales_records.total_amount IS '합계';
COMMENT ON COLUMN sales_records.amount IS '결제 금액';
COMMENT ON COLUMN sales_records.discount IS '할인';
COMMENT ON COLUMN sales_records.point_used IS '포인트 사용';
COMMENT ON COLUMN sales_records.import_batch_id IS '동일 배치로 가져온 레코드 그룹';

-- ============================================
-- 2. 일별 매출 집계 테이블
-- ============================================

CREATE TABLE daily_sales_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  transaction_count INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  net_sales INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0,
  point_used INTEGER DEFAULT 0,
  refund_amount INTEGER DEFAULT 0,
  source TEXT DEFAULT 'excel' CHECK (source IN ('excel', 'manual', 'calculated')),
  import_batch_id UUID,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_sales_date ON daily_sales_summary(date);
CREATE INDEX idx_daily_sales_batch ON daily_sales_summary(import_batch_id);

COMMENT ON TABLE daily_sales_summary IS '일별 매출 집계 (기간별 조회 엑셀)';
COMMENT ON COLUMN daily_sales_summary.transaction_count IS '결제 건수';
COMMENT ON COLUMN daily_sales_summary.total_sales IS '총 매출';
COMMENT ON COLUMN daily_sales_summary.net_sales IS '실 매출';

-- ============================================
-- 3. 정산 데이터 테이블
-- ============================================

CREATE TABLE settlement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  settlement_date DATE,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  fee INTEGER DEFAULT 0 CHECK (fee >= 0),
  net_amount INTEGER NOT NULL CHECK (net_amount >= 0),
  transaction_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  source TEXT DEFAULT 'excel' CHECK (source IN ('excel', 'manual')),
  import_batch_id UUID,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_net_amount CHECK (net_amount <= total_amount)
);

CREATE INDEX idx_settlement_period ON settlement_records(period_start, period_end);
CREATE INDEX idx_settlement_date ON settlement_records(settlement_date);
CREATE INDEX idx_settlement_status ON settlement_records(status);
CREATE INDEX idx_settlement_batch ON settlement_records(import_batch_id);

COMMENT ON TABLE settlement_records IS '정산 데이터';
COMMENT ON COLUMN settlement_records.fee IS '수수료';
COMMENT ON COLUMN settlement_records.net_amount IS '실정산액';

-- ============================================
-- 4. Import 로그 테이블
-- ============================================

CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('sales', 'daily_summary', 'settlement')),
  records_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB,
  imported_by TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_logs_batch ON import_logs(batch_id);
CREATE INDEX idx_import_logs_date ON import_logs(imported_at);

COMMENT ON TABLE import_logs IS '엑셀 업로드 로그';

-- ============================================
-- 5. RLS 정책
-- ============================================

-- 관리자만 접근 가능
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 접근 정책
CREATE POLICY "Admin full access on sales_records"
  ON sales_records FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local');

CREATE POLICY "Admin full access on daily_sales_summary"
  ON daily_sales_summary FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local');

CREATE POLICY "Admin full access on settlement_records"
  ON settlement_records FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local');

CREATE POLICY "Admin full access on import_logs"
  ON import_logs FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- Service Role은 RLS 무시 (서버사이드 API에서 사용)

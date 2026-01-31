-- 알림 이력 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('attendance', 'feedback', 'payment_reminder')),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message TEXT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  message_id TEXT, -- 외부 서비스 메시지 ID
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_student ON notifications(student_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- RLS 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "Admin full access on notifications"
  ON notifications FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@springpiano.local');

-- 시스템에서 INSERT 허용 (Service Role)
CREATE POLICY "Service role insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

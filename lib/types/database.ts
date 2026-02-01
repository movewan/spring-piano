// Supabase Database Types

export interface Family {
  id: string
  family_name: string
  discount_tier: number // 0: 없음, 1: 5%, 2: 10%
  created_at: string
}

export interface Parent {
  id: string
  family_id: string | null
  name: string
  encrypted_phone: string
  phone_search_hash: string
  birth_date: string | null
  created_at: string
}

export interface ParentAuth {
  parent_id: string
  pin_hash: string
  failed_attempts: number
  locked_until: string | null
}

export interface Student {
  id: string
  family_id: string | null
  name: string
  encrypted_phone: string
  phone_search_hash: string
  birth_date: string | null
  school: string | null
  grade: number | null
  product_id: string | null
  notes: string | null
  is_active: boolean
  consent_signed: boolean
  consent_date: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  lessons_per_month: number
  is_active: boolean
  created_at: string
}

export interface Teacher {
  id: string
  name: string
  specialty: string | null
  encrypted_phone: string | null
  color: string
  is_active: boolean
  created_at: string
}

export interface Schedule {
  id: string
  student_id: string
  teacher_id: string
  day_of_week: number // 0=일, 1=월...
  start_time: string // TIME
  end_time: string // TIME
  is_active: boolean
  created_at: string
}

export interface Attendance {
  id: string
  student_id: string
  check_in_time: string
  check_out_time: string | null
  notes: string | null
  created_at: string
}

export interface Payment {
  id: string
  student_id: string
  base_amount: number
  family_discount: number
  additional_discount: number
  final_amount: number
  payment_method: 'card' | 'cash' | 'transfer' | null
  payment_date: string
  month_year: string // "2025-02"
  notes: string | null
  created_at: string
}

export interface Feedback {
  id: string
  student_id: string
  teacher_id: string
  month_year: string
  content: string
  video_url: string | null
  is_published: boolean
  created_at: string
  published_at: string | null
}

// API Response Types
export interface StudentWithDetails extends Student {
  product?: Product
  schedules?: ScheduleWithTeacher[]
  parents?: ParentBasic[]
}

export interface ScheduleWithTeacher extends Schedule {
  teacher: Teacher
}

export interface ScheduleWithStudent extends Schedule {
  student: StudentBasic
}

export interface ParentBasic {
  id: string
  name: string
  phone?: string // 복호화된 전화번호
}

export interface StudentBasic {
  id: string
  name: string
  phone?: string // 복호화된 전화번호
}

// 출석 조회용 (키오스크)
export interface KioskStudent {
  id: string
  name: string
  product_name: string | null
}

// 관리자
export interface Admin {
  id: string
  email: string
  name: string
  encrypted_phone: string | null
  role: 'owner' | 'manager' | 'staff'
  is_active: boolean
  created_at: string
}

// 수동 매출
export interface Revenue {
  id: string
  date: string
  description: string
  amount: number
  category: 'lesson' | 'material' | 'event' | 'other'
  notes: string | null
  created_at: string
}

// 지출
export interface Expense {
  id: string
  date: string
  description: string
  amount: number
  category: 'rent' | 'salary' | 'utilities' | 'operations' | 'materials' | 'other'
  is_fixed: boolean
  is_recurring: boolean
  recurring_day: number | null
  recurring_until: string | null
  notes: string | null
  created_at: string
}

// 주간 스케줄 스냅샷
export interface WeeklyScheduleSnapshot {
  id: string
  week_start: string
  week_end: string
  status: 'draft' | 'confirmed'
  confirmed_at: string | null
  created_at: string
}

// 주간 스케줄 상세
export interface WeeklyScheduleDetail {
  id: string
  snapshot_id: string
  student_id: string
  teacher_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_number: number
  attendance_status: 'scheduled' | 'attended' | 'absent' | 'cancelled'
  notes: string | null
  created_at: string
}

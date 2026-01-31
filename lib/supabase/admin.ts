import { createClient } from '@supabase/supabase-js'

// Service Role Key를 사용하는 클라이언트 (서버사이드 전용)
// 암호화/복호화, RLS 우회 등 관리자 작업에 사용
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

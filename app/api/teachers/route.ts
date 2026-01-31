import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: teachers, error } = await supabase
      .from('teachers')
      .select('id, name, specialty, color')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Teachers fetch error:', error)
      return errorResponse('Failed to fetch teachers', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ teachers })
  } catch (error) {
    console.error('Teachers API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

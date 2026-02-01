import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

// GET - 주간 스케줄 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const searchParams = request.nextUrl.searchParams
    const weekStart = searchParams.get('week_start')

    if (!weekStart) {
      return errorResponse('week_start is required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    // 스냅샷 조회
    const { data: snapshot } = await adminClient
      .from('weekly_schedule_snapshots')
      .select('*')
      .eq('week_start', weekStart)
      .single()

    if (!snapshot) {
      // 스냅샷이 없으면 기본 스케줄에서 생성
      return successResponse({
        snapshot: null,
        details: [],
        from_base_schedule: true,
      })
    }

    // 상세 조회
    const { data: details } = await adminClient
      .from('weekly_schedule_details')
      .select(`
        *,
        student:students(id, name),
        teacher:teachers(id, name, color)
      `)
      .eq('snapshot_id', snapshot.id)
      .order('day_of_week')
      .order('slot_number')

    return successResponse({ snapshot, details })
  } catch (error) {
    console.error('Weekly schedule API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// POST - 주간 스케줄 생성/확정
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()
    const { week_start, week_end, confirm = false, copy_from_last_week = false } = body

    if (!week_start || !week_end) {
      return errorResponse('week_start and week_end are required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    // 기존 스냅샷 확인
    const { data: existingSnapshot } = await adminClient
      .from('weekly_schedule_snapshots')
      .select('*')
      .eq('week_start', week_start)
      .single()

    let snapshotId = existingSnapshot?.id

    if (!snapshotId) {
      // 새 스냅샷 생성
      const { data: newSnapshot, error: createError } = await adminClient
        .from('weekly_schedule_snapshots')
        .insert({
          week_start,
          week_end,
          status: confirm ? 'confirmed' : 'draft',
          confirmed_at: confirm ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (createError) {
        console.error('Create snapshot error:', createError)
        return errorResponse('Failed to create snapshot', 500, ErrorCodes.INTERNAL_ERROR)
      }

      snapshotId = newSnapshot.id

      if (copy_from_last_week) {
        // 지난주 스케줄 복사
        const lastWeekStart = new Date(week_start)
        lastWeekStart.setDate(lastWeekStart.getDate() - 7)
        const lastWeekStartStr = lastWeekStart.toISOString().slice(0, 10)

        const { data: lastSnapshot } = await adminClient
          .from('weekly_schedule_snapshots')
          .select('id')
          .eq('week_start', lastWeekStartStr)
          .single()

        if (lastSnapshot) {
          const { data: lastDetails } = await adminClient
            .from('weekly_schedule_details')
            .select('student_id, teacher_id, day_of_week, start_time, end_time, slot_number')
            .eq('snapshot_id', lastSnapshot.id)

          if (lastDetails && lastDetails.length > 0) {
            const newDetails = lastDetails.map((d) => ({
              snapshot_id: snapshotId,
              student_id: d.student_id,
              teacher_id: d.teacher_id,
              day_of_week: d.day_of_week,
              start_time: d.start_time,
              end_time: d.end_time,
              slot_number: d.slot_number,
              attendance_status: 'scheduled',
            }))

            await adminClient.from('weekly_schedule_details').insert(newDetails)
          }
        }
      } else {
        // 기본 스케줄에서 복사
        const { data: baseSchedules } = await adminClient
          .from('schedules')
          .select('student_id, teacher_id, day_of_week, start_time, end_time')
          .eq('is_active', true)

        if (baseSchedules && baseSchedules.length > 0) {
          const newDetails = baseSchedules.map((s) => ({
            snapshot_id: snapshotId,
            student_id: s.student_id,
            teacher_id: s.teacher_id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            slot_number: getSlotNumber(s.start_time),
            attendance_status: 'scheduled',
          }))

          await adminClient.from('weekly_schedule_details').insert(newDetails)
        }
      }
    } else if (confirm && existingSnapshot.status !== 'confirmed') {
      // 기존 스냅샷 확정
      await adminClient
        .from('weekly_schedule_snapshots')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', snapshotId)
    }

    // 최종 결과 조회
    const { data: snapshot } = await adminClient
      .from('weekly_schedule_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()

    const { data: details } = await adminClient
      .from('weekly_schedule_details')
      .select(`
        *,
        student:students(id, name),
        teacher:teachers(id, name, color)
      `)
      .eq('snapshot_id', snapshotId)
      .order('day_of_week')
      .order('slot_number')

    return successResponse({ snapshot, details }, 201)
  } catch (error) {
    console.error('Create weekly schedule API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// PUT - 출석 상태 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@springpiano.local') {
      return errorResponse('Unauthorized', 401, ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()
    const { id, attendance_status, notes } = body

    if (!id || !attendance_status) {
      return errorResponse('id and attendance_status are required', 400, ErrorCodes.VALIDATION_ERROR)
    }

    const adminClient = createAdminClient()

    const updateData: Record<string, unknown> = { attendance_status }
    if (notes !== undefined) updateData.notes = notes

    const { data: detail, error } = await adminClient
      .from('weekly_schedule_details')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update attendance error:', error)
      return errorResponse('Failed to update attendance', 500, ErrorCodes.INTERNAL_ERROR)
    }

    return successResponse({ detail })
  } catch (error) {
    console.error('Update weekly schedule API error:', error)
    return errorResponse('Internal server error', 500, ErrorCodes.INTERNAL_ERROR)
  }
}

// 시작 시간으로 슬롯 번호 계산 (70분 기준)
function getSlotNumber(startTime: string): number {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes

  // 13:00 시작, 70분 간격
  const slot1Start = 13 * 60 // 13:00
  const slotDuration = 70

  const slotIndex = Math.floor((totalMinutes - slot1Start) / slotDuration)
  return Math.max(1, Math.min(6, slotIndex + 1))
}

/**
 * 카카오톡 알림톡 Mock 서비스
 * 실제 API 연동 전 Mock 구현
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationType, renderTemplate, NOTIFICATION_TEMPLATES } from './templates'

export interface SendNotificationParams {
  type: NotificationType
  recipientPhone: string
  recipientName: string
  variables: Record<string, string>
  studentId?: string
  parentId?: string
}

export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * 알림톡 발송 (Mock)
 * 실제로는 DB에 저장하고 콘솔에 로그
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<NotificationResult> {
  const { type, recipientPhone, recipientName, variables, studentId, parentId } = params

  try {
    const supabase = createAdminClient()
    const message = renderTemplate(type, variables)
    const messageId = `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // DB에 알림 이력 저장
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        type,
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        message,
        student_id: studentId || null,
        parent_id: parentId || null,
        status: 'sent', // Mock에서는 항상 성공
        message_id: messageId,
        sent_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to save notification:', insertError)
      return { success: false, error: insertError.message }
    }

    // 콘솔 로그 (개발용)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📱 알림톡 발송 (Mock)')
    console.log(`📞 수신자: ${recipientName} (${recipientPhone})`)
    console.log(`📝 유형: ${NOTIFICATION_TEMPLATES[type].title}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(message)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return { success: true, messageId }
  } catch (error) {
    console.error('Notification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 출석 알림 발송
 */
export async function sendAttendanceNotification(params: {
  studentId: string
  studentName: string
  parentPhone: string
  parentName: string
  checkinTime: string
}) {
  return sendNotification({
    type: 'attendance',
    recipientPhone: params.parentPhone,
    recipientName: params.parentName,
    studentId: params.studentId,
    variables: {
      studentName: params.studentName,
      time: params.checkinTime,
    },
  })
}

/**
 * 피드백 알림 발송
 */
export async function sendFeedbackNotification(params: {
  studentId: string
  studentName: string
  parentPhone: string
  parentName: string
  month: string
}) {
  return sendNotification({
    type: 'feedback',
    recipientPhone: params.parentPhone,
    recipientName: params.parentName,
    studentId: params.studentId,
    variables: {
      studentName: params.studentName,
      month: params.month,
    },
  })
}

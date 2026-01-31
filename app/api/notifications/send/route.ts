import { NextRequest, NextResponse } from 'next/server'
import { sendNotification } from '@/lib/notifications/kakao-alimtalk'
import { NotificationType } from '@/lib/notifications/templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, recipientPhone, recipientName, variables, studentId, parentId } = body

    if (!type || !recipientPhone || !recipientName || !variables) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      )
    }

    const validTypes: NotificationType[] = ['attendance', 'feedback', 'payment_reminder']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 알림 유형입니다' },
        { status: 400 }
      )
    }

    const result = await sendNotification({
      type,
      recipientPhone,
      recipientName,
      variables,
      studentId,
      parentId,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { messageId: result.messageId },
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

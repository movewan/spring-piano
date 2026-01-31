/**
 * 카카오톡 알림톡 메시지 템플릿
 */

export type NotificationType = 'attendance' | 'feedback' | 'payment_reminder'

export interface NotificationTemplate {
  type: NotificationType
  title: string
  template: string
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  attendance: {
    type: 'attendance',
    title: '출석 알림',
    template: `[이화피아노의봄] {{studentName}}님이 {{time}}에 출석했습니다.

오늘도 즐거운 레슨 되세요! 🎹`,
  },
  feedback: {
    type: 'feedback',
    title: '레슨 피드백 알림',
    template: `[이화피아노의봄] {{studentName}}님의 {{month}} 레슨 피드백이 등록되었습니다.

학부모 포털에서 확인해주세요.
▶ https://spring-piano.vercel.app/parent/feedback`,
  },
  payment_reminder: {
    type: 'payment_reminder',
    title: '수강료 납부 안내',
    template: `[이화피아노의봄] {{studentName}}님의 {{month}} 수강료 납부 안내입니다.

수강료: {{amount}}원
납부 기한: {{dueDate}}

문의: 학원으로 연락 주세요.`,
  },
}

/**
 * 템플릿에 변수를 치환하여 메시지 생성
 */
export function renderTemplate(
  type: NotificationType,
  variables: Record<string, string>
): string {
  let message = NOTIFICATION_TEMPLATES[type].template

  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  return message
}

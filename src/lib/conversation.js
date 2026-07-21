import { getDeviceId } from './supabase'

/**
 * 대화 참가자 기준 발신자 판정 — 단일 소스.
 *
 * 대화의 두 참가자: 문의자 = conversation.sender_id, 소유자 = conversation.receiver_id.
 * 메시지의 sender_id는 발신 시점의 기기 ID로 저장되는데, 소유자는 익명 등록 후
 * 로그인하며 기기 ID가 계정 기준값으로 바뀌는 경우가 있다(mergeDeviceData). 그래서
 * "메시지.sender_id == 현재 getDeviceId()" 단독 비교는 신원 desync에 취약하다.
 *
 * 대신 **문의자(conversation.sender_id)를 앵커로** 삼아 "문의자가 보낸 것 / 아닌 것"으로
 * 가르면, 소유자 기기 ID가 흔들려도 좌/우·아바타 판정이 견고하다.
 */

// 현재 뷰어가 이 대화의 문의자 측인가.
export function viewerIsInquirer(conversation) {
  const me = getDeviceId()
  if (conversation?.receiver_id && me === conversation.receiver_id) return false
  if (conversation?.sender_id && me === conversation.sender_id) return true
  // 어느 참가자와도 안 맞으면(소유자 기기 ID가 바뀐 desync 등) 소유자 측으로 본다.
  return false
}

// 이 메시지를 문의자가 보냈는가 (아니면 소유자).
export function messageFromInquirer(message, conversation) {
  return !!message && message.sender_id === conversation?.sender_id
}

// 현재 뷰어가 보낸 메시지인가 — 좌/우 정렬·아바타 판정의 단일 소스.
export function isMyMessage(message, conversation) {
  return viewerIsInquirer(conversation) === messageFromInquirer(message, conversation)
}

// 뷰어 기준 '상대'의 이름 (기본 라벨: 소유자=양도인 / 문의자=문의자).
export function otherPartyName(conversation) {
  return viewerIsInquirer(conversation)
    ? (conversation?.receiver_name ?? '양도인')
    : (conversation?.sender_name ?? '문의자')
}

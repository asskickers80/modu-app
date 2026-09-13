/**
 * 기업회원 갱신 D-7 리포트 발송 — 순수 판정 (ORDER 2026-09-13 파트 B2·B5).
 * 1회만 보낸다(last_report_sent_at). 할인·만류 문구 없음 — 사실 숫자 줄만 담는다.
 */
export const RENEWAL_NOTICE_TITLE = '갱신 전 확인'
export { reportDue, reportLines, opsWatchList, renewalRate } from '../src/lib/vendorRenewalRules.js'

/**
 * 정부 지원 연결 링크 단일 소스 (ORDER 2026-09-10 파트 D)
 * 자체 챗봇을 만들지 않고 정부 서비스로 연결한다(대표 결정 2026-09-10).
 * 비활성(active=false) 항목은 렌더하지 않는다. 사용자 정보를 URL 파라미터로 넘기지 않는다.
 */
export interface GovLink { key: string; label: string; url: string; active: boolean }

export const GOV_LINKS: Record<string, GovLink> = {
  sbiz365_home: { key: 'sbiz365_home', label: '소상공인365', url: 'https://bigdata.sbiz.or.kr', active: true },
  sbiz365_ai: {
    key: 'sbiz365_ai', label: '정부 정책 도우미',
    url: 'https://bigdata.sbiz.or.kr', // PLACEHOLDER — 도우미 개시 URL 확인 후 교체·활성화 (별도 오더)
    active: false,
  },
  sbiz24: { key: 'sbiz24', label: '소상공인24', url: 'https://www.sbiz24.kr', active: true },
}

/** 고정 안내 1줄 — 결과 약속 문구 금지 */
export const GOV_LINK_NOTICE = '정부 사이트로 이동해요 · 모두는 입력 내용을 저장하지 않아요'

/** 참조 키 중 활성 항목만 (전부 비활성이면 빈 배열 = 카드 미렌더) */
export const activeGovLinks = (keys: string[], links: Record<string, GovLink> = GOV_LINKS): GovLink[] =>
  keys.map(k => links[k]).filter((l): l is GovLink => !!l && l.active).slice(0, 3)

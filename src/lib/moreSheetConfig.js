import { hasRoute } from './appRoutes'
import { shareLink } from './share'

/**
 * 더보기(⋯) 시트 프로필별 config 빌더 — MoreSheet 컴포넌트에 넘긴다.
 *
 * 노출 조건 원칙 (2026-07-18 오더):
 * - 객체가 없으면 항목 미노출 (비활성 아님). 시트가 비면 ⋯ 자체 미노출.
 * - D4·미구현 화면 항목은 하드코딩 플래그가 아니라 라우트 존재(hasRoute)로 판정
 *   → 해당 화면이 App.jsx(+appRoutes.js)에 생기면 자동으로 나타난다.
 * - D4 요건: 인박스는 단일 화면(/messages) + [문의]/[업체 제안] 필터 딥링크. 별도 세션에서 설계.
 */

const shareFeedback = (showToast, result, copiedMsg) => {
  if (result === 'copied') showToast(copiedMsg)
  else if (result === 'failed') showToast('이 브라우저에서는 공유를 지원하지 않아요')
}

/** 양도인·소유주 공동 (오더: 완전 동일 — 빌더 1개 공유). 소유주는 매물 조회 도입 전이라 listing=null. */
export function buildListingOwnerSheet({ listing, navigate, showToast, updateListingStatus, requestComplete, scrollToMarket }) {
  const has = !!listing
  return {
    shortcuts: [
      // 완료 기준상 객체(매물) 없는 신규 계정은 ⋯ 자체 미노출 — 시장 동향도 매물 보유 시에만
      {
        icon: '📊', label: '시장 동향',
        visible: has && !!scrollToMarket,
        onTap: scrollToMarket,
      },
      {
        icon: '💬', label: '받은 문의',
        visible: () => has && hasRoute('/messages'), // D4 통합 인박스 완성 시 자동 노출
        onTap: () => navigate('/messages?filter=inquiry'),
      },
    ],
    actionsLabel: '매물 관리',
    actions: [
      {
        icon: '📤', label: '내 매물 공유하기',
        visible: listing?.status === 'published', // 비공개·예시 매물은 공유 대상 아님
        onTap: async () => {
          const r = await shareLink({ title: listing.shop_name ?? '모두 매물', path: `/e2/${listing.id}` })
          shareFeedback(showToast, r, '매물 링크를 복사했어요 — 붙여넣어 공유하세요')
        },
      },
      {
        icon: '✏️', label: '내 매물 수정하기',
        visible: has && listing.status !== 'completed', // 거래완료는 수정 불가 → 미노출
        onTap: () => navigate(`/e1/1?edit=${listing.id}`),
      },
      {
        icon: '🙈', label: '내 매물 숨기기',
        visible: listing?.status === 'published',
        onTap: () => updateListingStatus('hidden', '매물을 숨겼어요 — 탐색에서 보이지 않아요'),
      },
      {
        icon: '👀', label: '내 매물 공개 전환',
        visible: listing?.status === 'hidden',
        onTap: () => updateListingStatus('published', '매물을 다시 공개했어요'),
      },
      {
        icon: '🤝', label: '거래 완료 처리',
        visible: has && (listing.status === 'published' || listing.status === 'hidden'),
        onTap: requestComplete, // 확인 모달 경유 — 기존 로직 재사용
      },
    ],
  }
}

/** 창업준비 — 찜·저장한 검색은 화면 도입 시(라우트 개설) 자동 노출 */
export function buildStartupSheet({ navigate, showToast }) {
  const hasFavorites = () => hasRoute('/favorites') // 관심 목록 화면 도입 시 이 라우트로 개설
  return {
    shortcuts: [
      { icon: '❤️', label: '관심 목록', visible: hasFavorites, onTap: () => navigate('/favorites') },
      {
        icon: '🔔', label: '저장한 검색 조건·알림',
        visible: () => hasRoute('/saved-searches'), // 저장 검색 기능 도입 시 이 라우트로 개설
        onTap: () => navigate('/saved-searches'),
      },
    ],
    actionsLabel: '관심 목록',
    actions: [
      {
        icon: '📤', label: '관심 목록 공유하기',
        visible: hasFavorites,
        onTap: async () => {
          const r = await shareLink({ title: '모두 — 내 관심 매물', path: '/favorites' })
          shareFeedback(showToast, r, '관심 목록 링크를 복사했어요')
        },
      },
    ],
  }
}

/** 운영중 — 가게 프로필 화면·D4 완성 시 자동 노출 */
export function buildOperatingSheet({ navigate, showToast }) {
  const hasShopProfile = () => hasRoute('/operating/shop-profile') // 가게 프로필 화면 도입 시 이 라우트로 개설
  return {
    shortcuts: [
      {
        icon: '📬', label: '받은 업체 제안',
        visible: () => hasRoute('/messages'), // D4 통합 인박스 완성 시 자동 노출
        onTap: () => navigate('/messages?filter=vendor'),
      },
    ],
    actionsLabel: '가게 관리',
    actions: [
      {
        icon: '📤', label: '내 가게 정보 공유하기',
        visible: hasShopProfile,
        onTap: async () => {
          const r = await shareLink({ title: '모두 — 내 가게', path: '/operating/shop-profile' })
          shareFeedback(showToast, r, '가게 정보 링크를 복사했어요')
        },
      },
      { icon: '✏️', label: '가게 정보 수정하기', visible: hasShopProfile, onTap: () => navigate('/operating/shop-profile') },
    ],
  }
}

/** 기업회원 — 업체 노출 페이지(E1b 저장·조회) 도입 시 자동 노출 */
export function buildBusinessSheet({ navigate, showToast }) {
  const hasBizPage = () => hasRoute('/e2b/:id') // 업체 노출 페이지 뷰 라우트 도입 시 자동 노출
  return {
    shortcuts: [
      {
        icon: '🤝', label: '받은 매칭 요청',
        visible: () => hasRoute('/messages'), // D4 통합 인박스 완성 시 자동 노출
        onTap: () => navigate('/messages?filter=match'),
      },
    ],
    actionsLabel: '업체 관리',
    actions: [
      {
        icon: '📤', label: '업체 프로필 공유하기',
        visible: hasBizPage,
        onTap: async () => {
          const r = await shareLink({ title: '모두 — 업체 프로필', path: '/e2b/me' })
          shareFeedback(showToast, r, '업체 프로필 링크를 복사했어요')
        },
      },
      { icon: '✏️', label: '업체 정보 수정하기', visible: hasBizPage, onTap: () => navigate('/e1b/1') },
    ],
  }
}

/** 그냥구경 — 앱 공유하기 단일 항목 */
export function buildBrowsingSheet({ showToast }) {
  return {
    shortcuts: [],
    actionsLabel: null,
    actions: [
      {
        icon: '📤', label: '앱 공유하기',
        visible: true,
        onTap: async () => {
          const r = await shareLink({ title: '모두 — 자영업자를 위한 앱', path: '/' })
          shareFeedback(showToast, r, '앱 링크를 복사했어요 — 붙여넣어 공유하세요')
        },
      },
    ],
  }
}

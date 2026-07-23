import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Outlet, useSearchParams, useNavigate } from 'react-router-dom'
import { loadListingForEdit } from '../../lib/listings'
import { listingToContext } from '../../lib/completeness'

export const E1Ctx = createContext(null)
export const useE1 = () => useContext(E1Ctx)

// 같은 탭 새로고침에서만 살아남으면 되므로 sessionStorage 사용
// (localStorage는 며칠 뒤 옛 초안이 떠서 오히려 혼란)
const DRAFT_KEY = 'modu_e1_draft'

const INITIAL_DATA = {
  address: '',
  detailAddress: '',
  shopName: '',
  floor: '',
  area: '',
  deposit: '',
  monthlyRent: '',
  maintenance: '',
  transferFee: '',
  transferType: null,   // 'bare' | 'full' | 'undecided'
  monthlySales: '',
  bizType: '',          // 표시용 라벨 (병행 기간 — 옛 화면·필터가 계속 읽는다)
  categoryMain: null,   // categories.ts 대분류 (필수)
  categorySub: null,    // categories.ts 소분류 (선택 — null 정상)
  ksicCode: null,       // 소분류에 딸린 KSIC 코드
  businessNumber: '',   // 사업자등록번호 — 공개 게이트에서 국세청 진위확인 (비공개 정보)
  biznoVerified: false, // 진위확인 통과 여부 (미검증 공개도 허용 — 완화안)
  isFranchise: null,    // null=미선택 true=프랜차이즈 false=비프랜차이즈
  franchiseBrandId: null,
  franchiseBrandName: '',
  autoFilled: false,    // true when building registry auto-filled
  // 소개글 확인 이력 — E1은 { confirmedAt, editedCount } 를 기록한다 (E1Step2 '다음').
  // 옛 매물·E1p(임대인)는 { blockId: 'keep'|'edit'|'hide' } 형태라 두 모양이 공존한다.
  reviewChoices: {},
  editedTexts: {},      // { blockId: string }
  itemVisibility: {},   // { blockId: false } — false인 항목은 비공개. 없으면 전체 공개.
  photosAdded: false,
  salesProof: false,
  facilities: [],
  interiorPhotos: [],   // [{ url, path }] — Supabase Storage 업로드 후 url만 저장 (File 객체 없음)
  exteriorPhotos: [],   // [{ url, path }]
  isDemo: false,        // 예시✦ 채움 여부 — true면 status='example'로 저장 (마켓 미노출 연습용)
  aiDraft: null,        // generateListingDraft 결과 → Step3에서 사용
  marketData: null,     // fetchMarketData 결과 → Step3에서 사용
  marketInsight: null,  // generateMarketInsight 결과 → Step3에서 사용
  shopNamePublic: true,  // 상호 공개 여부 — true=공개(기본), false=비공개
  editingListingId: null, // 수정 모드: 편집 중인 기존 매물 id (null이면 신규 등록)
}

function loadDraft() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')
    if (saved && typeof saved === 'object') return { ...INITIAL_DATA, ...saved }
  } catch {}
  return INITIAL_DATA
}

// 제출 성공 시 호출 — 안 지우면 다음 등록 때 이전 값이 복원돼 혼란
export function clearE1Draft() {
  try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
}

export function E1Provider() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editId = searchParams.get('edit')
  // 수정 세션 여부 — 수정 모드는 DB가 진실이므로 draft 저장/복원을 아예 쓰지 않는다
  // (수정 중 내용이 다음 신규 등록 draft로 새는 오염 방지)
  const editSessionRef = useRef(!!editId)
  const [data, setData] = useState(() => (editId ? INITIAL_DATA : loadDraft()))
  const [editError, setEditError] = useState(false)
  // DB 로드가 끝나기 전에 각 단계가 판단하지 않도록 하는 신호.
  // 이게 없으면 E1Step2가 aiDraft=null인 초기 state를 보고 Gemini를 재호출해
  // 기존 소개글을 덮어썼다.
  const [editLoading, setEditLoading] = useState(!!editId)

  // 수정 모드 진입: 이전 신규등록 draft 폐기 → DB에서 기존 매물 로드
  useEffect(() => {
    if (!editId) return
    editSessionRef.current = true
    setEditLoading(true)
    clearE1Draft()
    // 조회+소유권 검증은 공용 loadListingForEdit(user_id 우선)로 통일 — E1p와 복제 없음
    loadListingForEdit(editId).then(({ ok, row }) => {
      if (!ok) {
        // 조회 실패 또는 남의 매물(예시 포함) — 수정 개방 금지, 매물 상세로 돌려보낸다.
        editSessionRef.current = false
        setEditError(true)
        setEditLoading(false)
        navigate(`/e2/${editId}`, { replace: true })
        return
      }
      setData({ ...INITIAL_DATA, ...listingToContext(row), editingListingId: row.id })
      setEditLoading(false)
    })
  }, [editId])

  useEffect(() => {
    if (editSessionRef.current) return // 수정 모드는 draft 미사용
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data)) } catch {}
  }, [data])

  const update = patch => setData(prev => ({ ...prev, ...patch }))

  return (
    <E1Ctx.Provider value={{ data, update, editError, editLoading }}>
      <Outlet />
    </E1Ctx.Provider>
  )
}

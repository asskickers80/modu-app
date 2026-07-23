import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Outlet, useSearchParams, useNavigate } from 'react-router-dom'
import { loadListingForEdit } from '../../lib/listings'
import { listingToLandlordContext } from '../../lib/completeness'

const E1pCtx = createContext(null)

const INITIAL_DATA = {
  // 분기
  listingType: null,      // 'rent' | 'sale' | 'both'
  // 주소·기본
  address: '',
  detailAddress: '',
  floor: '',
  area: '',
  autoFilled: false,
  // 임대 필드
  deposit: '',
  monthlyRent: '',
  maintenance: '',
  recommendedBiz: [],
  // 매각 필드
  salePrice: '',
  capRate: '',
  // AI 초안
  aiDraft: null,
  // 검수
  reviewChoices: {},
  editedTexts: {},
  // 도면·서류
  floorPlanAdded: false,
  registryDone: true,     // 등기 자동열람: 더미로 완료
  extras: [],
  isDemo: false,          // 예시✦ 채움 여부 — true면 status='example'로 저장 (마켓 미노출 연습용, 양도인 E1과 동형)
  editingListingId: null, // 수정 모드면 해당 상가 id → 저장 시 UPDATE
}

export function E1pProvider() {
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const navigate = useNavigate()

  const [data, setData] = useState(INITIAL_DATA)
  // 수정 모드 로드 완료 전에는 Step2가 aiDraft=null을 보고 Gemini를 재호출하지 않도록 막는다
  const [editLoading, setEditLoading] = useState(!!editId)
  const editSessionRef = useRef(!!editId)

  // 수정 모드 진입: DB에서 기존 상가 로드 → 폼 채움. 소유권 검증(user_id 우선)은 loadListingForEdit 공유.
  useEffect(() => {
    if (!editId) return
    editSessionRef.current = true
    setEditLoading(true)
    loadListingForEdit(editId).then(({ ok, row }) => {
      if (!ok) {
        // 조회 실패·남의 상가(예시 포함) — 수정 개방 금지, 상세로 돌려보낸다(E2L 소유자 모드와 같은 isOwnerOf)
        editSessionRef.current = false
        setEditLoading(false)
        navigate(`/e2l/${editId}`, { replace: true })
        return
      }
      setData({ ...INITIAL_DATA, ...listingToLandlordContext(row), editingListingId: row.id })
      setEditLoading(false)
    })
  }, [editId])

  const update = patch =>
    setData(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  return (
    <E1pCtx.Provider value={{ data, update, editLoading }}>
      <Outlet />
    </E1pCtx.Provider>
  )
}

export const useE1p = () => useContext(E1pCtx)

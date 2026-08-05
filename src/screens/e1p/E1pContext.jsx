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
  // 입지 칩 (ad-frame) — 도로 접면·주차·전면 노출. 저장 컬럼 spot_frontage/spot_parking/spot_visibility
  spotFrontage: '',
  spotParking: '',
  spotVisibility: '',
  title: '',            // 상가 제목 — 소유주의 것(listing-title)
  // 시설 현황 (e1p-facility) — interior_state: 물리 상태(occupancy=임차 계약 관점과 분리)
  interiorState: null,      // 'empty'(공실) | 'equipped'(설비·집기 잔존)
  remainingFacilities: [],  // 잔존 설비 칩 (equipped일 때만)
  prevBiz: '',              // 이전 업종 라벨 (선택)
  buildingFacilities: [],   // 건물 설비 칩 (상태 무관)
  // 매각 필드
  salePrice: '',
  capRate: '',
  occupancy: null,        // 'occupied'(현 임차인 있음) | 'vacant'(공실) — 매각·둘다 필수

  // AI 초안
  aiDraft: null,
  // 검수
  reviewChoices: {},
  editedTexts: {},
  itemVisibility: {},   // 블록별 공개/비공개 (검수 1화면 — E1 방식)
  // 도면·서류 — 실업로드 [{url, path}] (components/PhotoGrid 공용)
  floorPlanPhotos: [],    // 도면 → interior_image_urls 재사용(신설 컬럼 없음, SQL 매핑표 확정)
  exteriorPhotos: [],     // 외관 → exterior_image_urls
  floorPlanAdded: false,
  registryDone: true,     // 등기 자동열람: 더미로 완료
  extras: [],
  showMap: true,          // 지도·거리뷰 공개 opt-in (기본 ON — 임대인은 위치가 상품)
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

  // 미저장 변경 추적 (edit-unsaved-warn, B안) — 수정 세션에서 값이 바뀌면 dirty.
  // 저장은 마지막 단계에서만 이뤄지므로, dirty 상태로 이탈하면 경고를 띄운다.
  const dirtyRef = useRef(false)
  const update = patch => {
    if (editSessionRef.current) dirtyRef.current = true
    setData(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }
  const clearDirty = () => { dirtyRef.current = false }
  const confirmLeaveIfDirty = () => {
    if (!dirtyRef.current) return true
    const ok = window.confirm('고친 내용이 아직 저장되지 않았어요.\n저장하려면 마지막 "저장" 단계에서 수정 완료를 눌러주세요.\n\n저장하지 않고 나갈까요?')
    if (ok) dirtyRef.current = false
    return ok
  }
  // 새로고침·탭 닫기 — 브라우저 표준 경고
  useEffect(() => {
    const onBeforeUnload = e => {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  return (
    <E1pCtx.Provider value={{ data, update, editLoading, confirmLeaveIfDirty, clearDirty }}>
      <Outlet />
    </E1pCtx.Provider>
  )
}

export const useE1p = () => useContext(E1pCtx)

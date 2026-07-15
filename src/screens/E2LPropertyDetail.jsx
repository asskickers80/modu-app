import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

const TEAL = '#1e6b6b'
const TEAL_BG = '#eef6f6'
const AMBER = '#d68b2a'
const AMBER_BG = '#fef3e2'

const LISTINGS = {
  v1: {
    id: 'v1', emoji: '🏢',
    title: '서교동 코너 상가',
    addrShort: '서울 마포구 홍대입구역 도보 3분',
    addr: '서울 마포구 서교동 332-4',
    gradFrom: '#b8d4d4', gradTo: '#8ab8b8',
    floor: '1층', area: '33㎡ (약 10평)',
    deposit: 5000, monthly: 180, maintenance: 12,
    landlordType: '임대',
    type: '임대',
    vacant: '즉시 입주',
    tags: ['코너 상가', '1층', '카페 적합', '독립출입구'],
    buildYear: '2008', structure: '철근콘크리트',
    heating: '개별난방', parking: '인근 주차 가능',
    aiDesc: {
      fact: '홍대입구역 3번 출구에서 도보 3분 거리. 1층 코너 위치로 유동인구 접근성 높음. 전용 33㎡, 주방 덕트 설치 가능 (추가 공사 필요 여부 확인 요망).',
      estimate: 'AI 추정 (참고용): 홍대 상권 1층 소형 상가 기준 월세 시세 170~210만원 대. 카페·베이커리 업종 적합도 높음. 공실 기간 단축 요소 있음.',
    },
    area_analysis: [
      { label: '일 유동인구', value: '2.3만명', note: '홍대 상권 기준' },
      { label: '주변 공실률', value: '4.1%', note: '마포구 평균 6.2%' },
      { label: '동종 월세 시세', value: '170~210만', note: 'AI 추정' },
    ],
  },
  v2: {
    id: 'v2', emoji: '🏬',
    title: '연남동 단독상가',
    addrShort: '서울 마포구 경의선숲길 도보 2분',
    addr: '서울 마포구 연남동 91-3',
    gradFrom: '#a8c8c8', gradTo: '#78a8a8',
    floor: '1층', area: '52㎡ (약 16평)',
    deposit: 5000, monthly: 220, maintenance: 15,
    landlordType: '임대',
    type: '임대',
    vacant: '2024년 3월 입주',
    tags: ['단독건물', '주차 가능', '독립출입구', '경의선 인근'],
    buildYear: '2015', structure: '철근콘크리트',
    heating: '중앙난방', parking: '전용 2대',
    aiDesc: {
      fact: '경의선숲길 도보 2분. 단독 건물 1층 전체, 전용 52㎡. 주차 2대 포함. 플로우 카페·음식점에 적합한 개방형 구조.',
      estimate: 'AI 추정 (참고용): 연남동 단독상가 기준 월 180~250만원 시세. 경의선 테라스형 수요 꾸준히 증가 추세.',
    },
    area_analysis: [
      { label: '일 유동인구', value: '1.8만명', note: '연남동 숲길 기준' },
      { label: '주변 공실률', value: '3.8%', note: '마포구 평균 대비 낮음' },
      { label: '동종 월세 시세', value: '180~250만', note: 'AI 추정' },
    ],
  },
  v3: {
    id: 'v3', emoji: '🏪',
    title: '분당 정자동 상가',
    addrShort: '경기 성남시 정자역 도보 5분',
    addr: '경기 성남시 분당구 정자동 11-2',
    gradFrom: '#b0c0d8', gradTo: '#809ab8',
    floor: '2층', area: '28㎡ (약 8.5평)',
    deposit: 2000, monthly: 95, maintenance: 8,
    landlordType: '임대',
    type: '임대',
    vacant: '즉시 입주',
    tags: ['역세권', '유동인구 많음', '소형 창업 적합'],
    buildYear: '2002', structure: '철골조',
    heating: '개별난방', parking: '건물 주차장',
    aiDesc: {
      fact: '정자역 5분 거리 소형 상가. 2층이나 에스컬레이터 접근 가능. 전용 28㎡로 1인 창업·스튜디오 업종 적합.',
      estimate: 'AI 추정 (참고용): 분당 소형 상가 기준 2층 월 80~110만원 시세. 소형 규모 창업비 낮아 초기 진입 부담 낮음.',
    },
    area_analysis: [
      { label: '일 유동인구', value: '3.1만명', note: '정자역 환승 기준' },
      { label: '주변 공실률', value: '5.5%', note: '분당 평균 수준' },
      { label: '동종 월세 시세', value: '80~110만', note: 'AI 추정' },
    ],
  },
}

function DmBottomSheet({ onClose, onGo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[390px] bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]"
            style={{ backgroundColor: TEAL_BG }}>💬</div>
          <div>
            <p className="text-[16px] font-bold text-gray-900">임대인에게 DM 문의</p>
            <p className="text-[12px] text-gray-400 mt-0.5">전화번호는 공개되지 않아요</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: TEAL_BG }}>
          <p className="text-[13px] leading-relaxed" style={{ color: TEAL }}>
            문의는 <strong>앱 내 DM</strong>으로만 시작돼요. 연락처는 양쪽 합의 후 공개됩니다.
          </p>
        </div>
        <button onClick={onGo}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white mb-2.5"
          style={{ backgroundColor: TEAL }}>
          💬 DM 문의 시작하기
        </button>
        <button onClick={onClose}
          className="w-full py-[14px] rounded-2xl text-[14px] font-medium text-gray-400">
          취소
        </button>
      </div>
    </div>
  )
}

export default function E2LPropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const listing = LISTINGS[id] || LISTINGS['v1']
  const [showDm, setShowDm] = useState(false)
  const { toast, showToast } = useToast()

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* 히어로 이미지 */}
      <div className="shrink-0 relative h-52"
        style={{ background: `linear-gradient(135deg, ${listing.gradFrom}, ${listing.gradTo})` }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-[56px]">{listing.emoji}</span>
          <span className="text-white/80 text-[13px] font-medium">{listing.floor} · {listing.area}</span>
        </div>
        <button onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14l-5-5 5-5" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="absolute top-12 right-4 flex gap-2">
          <div className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: TEAL + 'cc' }}>임대인 매물</div>
        </div>
        <div className="absolute bottom-3 left-4">
          <span className="text-[11px] font-bold text-white bg-black/30 px-2 py-0.5 rounded-full">
            즉시 입주 가능
          </span>
        </div>
      </div>

      {/* 스크롤 본문 */}
      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-5 pt-5 pb-28">

          {/* 헤드라인 */}
          <h1 className="text-[22px] font-black text-gray-900 leading-snug mb-1">
            {listing.title}
          </h1>
          <p className="text-[13px] text-gray-400 mb-4">{listing.addrShort}</p>

          {/* 태그 */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {listing.tags.map(t => (
              <span key={t} className="text-[12px] font-medium px-3 py-1 rounded-full"
                style={{ backgroundColor: TEAL_BG, color: TEAL }}>{t}</span>
            ))}
          </div>

          {/* 임대 조건 */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: TEAL_BG }}>
            <p className="text-[12px] font-bold mb-3" style={{ color: TEAL }}>임대 조건</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '보증금', value: `${listing.deposit.toLocaleString()}만` },
                { label: '월세', value: `${listing.monthly}만/월` },
                { label: '관리비', value: `${listing.maintenance}만/월` },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className="text-[11px] text-gray-500 mb-1">{item.label}</p>
                  <p className="text-[16px] font-black" style={{ color: TEAL }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 기본 팩트 */}
          <div className="rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-[13px] font-bold text-gray-900 mb-3">기본 정보</p>
            <div className="grid grid-cols-2 gap-y-3">
              {[
                { label: '면적', value: listing.area },
                { label: '층수', value: listing.floor },
                { label: '준공연도', value: `${listing.buildYear}년` },
                { label: '구조', value: listing.structure },
                { label: '난방', value: listing.heating },
                { label: '주차', value: listing.parking },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[11px] text-gray-400">{item.label}</p>
                  <p className="text-[13px] font-semibold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI 설명 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px]">✨</span>
              <p className="text-[13px] font-bold text-gray-900">AI 매물 설명</p>
            </div>
            <div className="rounded-2xl p-4 mb-2" style={{ backgroundColor: TEAL_BG }}>
              <p className="text-[11px] font-bold mb-1.5" style={{ color: TEAL }}>📋 확인된 사실</p>
              <p className="text-[13px] text-gray-700 leading-relaxed">{listing.aiDesc.fact}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: AMBER_BG }}>
              <p className="text-[11px] font-bold mb-1.5" style={{ color: AMBER }}>⚠️ AI 추정 (참고만)</p>
              <p className="text-[13px] text-gray-700 leading-relaxed">{listing.aiDesc.estimate}</p>
            </div>
          </div>

          {/* 상권 분석 */}
          <div className="mb-5">
            <p className="text-[13px] font-bold text-gray-900 mb-3">📍 상권 분석</p>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {listing.area_analysis.map((item, idx) => (
                <div key={item.label}
                  className={`flex items-center px-4 py-3 ${idx < listing.area_analysis.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <p className="text-[12px] text-gray-500 w-28">{item.label}</p>
                  <p className="text-[14px] font-bold text-gray-900 flex-1">{item.value}</p>
                  <p className="text-[11px] text-gray-400">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 번호 비공개 안내 */}
          <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
            style={{ backgroundColor: '#f8fafc' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="5" width="10" height="7" rx="1.5" stroke="#9ca3af" strokeWidth="1.2" />
              <path d="M4.5 5V4a2.5 2.5 0 015 0v1" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] text-gray-400">전화번호는 공개되지 않아요 — 양쪽 합의 후에만 교환됩니다</p>
          </div>

        </div>
      </main>

      {/* 고정 하단 바 */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
        <button
          onClick={() => setShowDm(true)}
          className="w-full py-[16px] rounded-2xl text-[15px] font-bold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: TEAL }}>
          💬 임대인에게 DM 문의하기
        </button>
      </div>

      {showDm && (
        <DmBottomSheet
          onClose={() => setShowDm(false)}
          onGo={() => {
            // 임대인 상가는 아직 Supabase 미연결(샘플 매물) — 실 대화 생성 불가
            setShowDm(false)
            showToast('빈 점포 DM 문의는 준비 중이에요 🚧')
          }}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}

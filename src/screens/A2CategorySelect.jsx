import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ModuMark from '../components/ModuMark'

const CATEGORIES = [
  { id: 'operating', label: '사장님',   sub: '지금 장사하고 있어요',              color: '#2d7a4f', bg: '#edf7f1' },
  { id: 'seller',    label: '양도인',   sub: '이제 그만할 때가 됐나봐요',         color: '#1a4d8f', bg: '#eef2fb' },
  { id: 'landlord',  label: '소유주',   sub: '상가가 있는데 함께 할 사람을 찾아요', color: '#1e6b6b', bg: '#eef6f6' },
  { id: 'startup',   label: '창업자',   sub: '창업을 준비하고 있어요',            color: '#2b8ac9', bg: '#eef6fd' },
  { id: 'business',  label: '기업회원', sub: '기업회원으로 활동할래요',           color: '#7d4ba3', bg: '#f5eefb' },
  { id: 'browse',    label: '방문자',   sub: '그냥 구경 왔어요',                 color: '#8a8a8e', bg: '#f5f5f6' },
]

export default function A2CategorySelect() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMultiprofile = searchParams.get('multiprofile') === '1'
  const [selected, setSelected] = useState([])
  const [toast, setToast] = useState('')

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const isSelected = (id) => selected.includes(id)

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-8">
      {/* 브랜드 마크 */}
      <div className="flex items-center gap-3 mb-7">
        <ModuMark size={38} color="#1683B8" />
        <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: '26px', letterSpacing: '-0.04em', color: '#111827' }}>모두</span>
      </div>
      {/* 헤더 */}
      <div className="mb-8">
        <p className="text-[15px] font-medium text-gray-400 mb-1">
          <span style={{ color: '#1683B8', fontWeight: 800 }}>모두</span>에 오신 걸 환영해요!
        </p>
        <h1 className="text-[26px] font-bold text-gray-900 leading-snug">
          당신은 누구인가요?
        </h1>
        <p className="mt-2 text-[13px] text-gray-400">복수 선택 가능</p>
      </div>

      {/* 카테고리 칩 목록 */}
      <div className="flex flex-col gap-3 flex-1">
        {CATEGORIES.map((cat) => {
          const sel = isSelected(cat.id)
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className="w-full text-left rounded-2xl border-2 px-4 py-[14px] transition-all duration-150 active:scale-[0.98]"
              style={{
                borderColor: sel ? cat.color : '#e5e7eb',
                backgroundColor: sel ? cat.bg : '#ffffff',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[16px] font-semibold leading-snug"
                    style={{ color: sel ? cat.color : '#111827' }}
                  >
                    {cat.label}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: sel ? cat.color : '#9ca3af' }}
                  >
                    {cat.sub}
                  </div>
                </div>
                {/* 선택 체크 */}
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-150"
                  style={{
                    backgroundColor: sel ? cat.color : '#e5e7eb',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2.5 2.5 3.5-4"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 준비 중 토스트 */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-[13px] font-semibold text-white shadow-lg z-50 whitespace-nowrap"
          style={{ backgroundColor: '#374151' }}>
          🚧 {toast}
        </div>
      )}

      {/* 다음 버튼 */}
      <div className="mt-6">
        <button
          disabled={selected.length === 0}
          onClick={() => {
            if (isMultiprofile) {
              sessionStorage.setItem('modu_multiprofile_pending', '1')
            }
            if (selected.includes('seller')) {
              navigate('/a3/seller')
            } else if (selected.includes('landlord')) {
              navigate('/a3/landlord')
            } else if (selected.includes('startup')) {
              navigate('/a3/startup')
            } else if (selected.includes('operating')) {
              navigate('/a3/operating')
            } else if (selected.includes('browse')) {
              navigate('/a7/browsing')
            } else if (selected.includes('business')) {
              navigate('/a3/business')
            } else {
              // 아직 미구현 카테고리
              const cat = CATEGORIES.find(c => selected.includes(c.id))
              setToast(`${cat?.sub ?? '해당 카테고리'} 화면 준비 중이에요`)
              setTimeout(() => setToast(''), 2500)
            }
          }}
          className="w-full py-[18px] rounded-2xl text-[16px] font-bold transition-all duration-200"
          style={{
            backgroundColor: selected.length > 0 ? '#111827' : '#e5e7eb',
            color: selected.length > 0 ? '#ffffff' : '#9ca3af',
          }}
        >
          다음
        </button>
      </div>
    </div>
  )
}

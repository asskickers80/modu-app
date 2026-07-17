import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ModuMark from '../components/ModuMark'

// 카피·색상은 기존 그대로, UI만 "구름 에코시스템" 디자인으로 교체
// (디자인 스펙: design_handoff_cloud_role_select — 구름 좌표·애니메이션 값 확정)
const CATEGORIES = [
  { id: 'operating', label: '사장님',   sub: '현재 영업 중, 운영에 필요한 모든 것!',              color: '#2d7a4f' },
  { id: 'seller',    label: '양도인',   sub: '매각 진행 중, 새로 들어오실 분 찾습니다!',          color: '#1a4d8f' },
  { id: 'landlord',  label: '소유주',   sub: '상가 보유 중, 팔거나 임대 맞추고 싶어요!',          color: '#1e6b6b' },
  { id: 'startup',   label: '창업자',   sub: '창업 준비 중, 프랜차이즈도 관심 있어요!',           color: '#2b8ac9' },
  { id: 'business',  label: '기업회원', sub: '프랜차이즈·부동산·컨설팅·인테리어 등 관련 업체 OK!', color: '#7d4ba3', noKeep: true },
  { id: 'browse',    label: '방문자',   sub: '둘러보고 싶어요, 구인·구직자도 모두 환영!',          color: '#8a8a8e', txtTop: '20%', txtBottom: '26%' },
]

// 구름 실루엣 원 좌표 [cx, cy, r] — viewBox 200×140 기준, 확정값
const CLOUDCFG = [
  /* 사장님   */ [[54,60,32],[98,46,40],[142,60,30],[30,86,18],[64,94,28],[104,96,29],[146,88,22],[100,74,46],[52,76,30],[146,74,26]],
  /* 양도인   */ [[64,52,36],[116,46,40],[154,74,26],[38,80,22],[78,96,30],[112,96,30],[100,74,46],[56,74,30],[140,80,26]],
  /* 소유주   */ [[56,56,34],[104,44,40],[148,62,28],[30,84,18],[66,96,28],[106,96,29],[148,86,21],[100,74,46],[54,76,30],[142,76,26]],
  /* 창업자   */ [[100,42,44],[54,66,30],[146,66,30],[34,90,18],[76,96,29],[116,96,29],[154,84,21],[100,74,46],[58,80,28],[142,80,26]],
  /* 기업회원 */ [[46,62,30],[90,46,38],[138,54,34],[26,86,17],[58,94,28],[100,94,30],[150,86,23],[100,72,46],[50,76,28],[142,72,28]],
  /* 방문자   */ [[68,54,36],[118,50,36],[156,76,20],[36,82,20],[74,96,30],[110,96,30],[98,72,44],[56,74,28],[136,76,26]],
]

// 오른쪽 열은 right 기준 배치 — 레퍼런스(필드 362px)와 앱 프레임(350px)의 폭 차 흡수
const POS = [
  { style: { left: -20,  top: 24 },  anim: 'om-float3 9s' },
  { style: { right: 0,   top: 70 },  anim: 'om-float4 11s' },
  { style: { left: -18,  top: 174 }, anim: 'om-float3 13s' },
  { style: { right: -2,  top: 234 }, anim: 'om-float4 12s' },
  { style: { left: -16,  top: 336 }, anim: 'om-float3 10s' },
  { style: { right: 0,   top: 392 }, anim: 'om-float4 14s' },
]

const DECO_SETS = {
  A: [[62,62,32],[112,52,34],[152,74,22],[82,94,26],[126,94,24],[100,74,36]],
  B: [[58,64,30],[104,50,36],[148,68,26],[80,96,24],[120,96,24],[100,74,36]],
  C: [[70,58,34],[122,54,32],[92,94,28],[146,84,18],[104,72,34]],
}
const DECOS = [
  { style: { right: 104, top: 26,  width: 58, height: 34, opacity: 0.85 }, anim: 'om-drift 12s ease-in-out infinite alternate',         set: 'A' },
  { style: { left: 128,  top: 176, width: 56, height: 32, opacity: 0.8 },  anim: 'om-drift 13s ease-in-out infinite alternate-reverse', set: 'B' },
  { style: { right: 62,  top: 240, width: 48, height: 28, opacity: 0.8 },  anim: 'om-drift 15s ease-in-out infinite alternate',         set: 'C' },
  { style: { left: 20,   top: 518, width: 62, height: 36, opacity: 0.75 }, anim: 'om-drift 14s ease-in-out infinite alternate-reverse', set: 'A' },
  { style: { right: 10,  top: 516, width: 64, height: 38, opacity: 0.75 }, anim: 'om-drift 16s ease-in-out infinite alternate',         set: 'B' },
]

// 뭉게구름 = 원들의 합집합 + 균일 외곽선.
// 아웃라인 패스(r+off)를 먼저 깔고 바디(r, 순백)를 덮어야 교차부에 파란 조각이 안 생긴다. stroke 사용 금지.
function CloudShape({ circles, selected = false, off = 4.5 }) {
  const outline = selected ? '#3D9BE0' : '#8FCBEF'
  return (
    <svg
      viewBox="0 0 200 140"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
    >
      {circles.map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r + off} fill={outline} />
      ))}
      {circles.map(([x, y, r], i) => (
        <circle key={`b${i}`} cx={x} cy={y} r={r} fill="#FFFFFF" />
      ))}
    </svg>
  )
}

export default function A2CategorySelect() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMultiprofile = searchParams.get('multiprofile') === '1'
  const [selected, setSelected] = useState([])
  const [toast, setToast] = useState('')

  // 복수 선택 가능 — 단 방문자(그냥 구경)는 다른 역할과 중복 불가
  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (id === 'browse') return ['browse']
      return [...prev.filter((x) => x !== 'browse'), id]
    })
  }

  const isSelected = (id) => selected.includes(id)
  const canProceed = selected.length > 0

  return (
    <div
      className="a2-sky relative flex flex-col overflow-hidden"
      style={{
        // 390px 앱 프레임을 벗어나 뷰포트 전체 폭으로 — 넓은 아이폰/아이패드에서도 하늘이 꽉 참
        width: '100vw',
        left: 'calc(50% - 50vw)',
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #6FBDF4 0%, #A8D9FB 46%, #E2F3FF 100%)',
        padding: '66px 0 26px',
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @keyframes om-float1 { 0% { transform: translate(0,0); } 100% { transform: translate(28px,18px); } }
        @keyframes om-float2 { 0% { transform: translate(0,0); } 100% { transform: translate(-26px,-20px); } }
        @keyframes om-float3 { 0% { transform: translate(0,0); } 100% { transform: translate(-13px,-10px); } }
        @keyframes om-float4 { 0% { transform: translate(0,0); } 100% { transform: translate(14px,11px); } }
        @keyframes om-drift  { 0% { transform: translate(0,0); } 100% { transform: translate(7px,-6px); } }
        @keyframes om-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes om-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes om-pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes om-sunpulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 36px rgba(255,190,70,0.5), 0 0 80px rgba(255,190,70,0.25); }
          50%      { transform: scale(1.05); box-shadow: 0 0 56px rgba(255,190,70,0.8), 0 0 110px rgba(255,190,70,0.4); }
        }
        .a2-cloud {
          filter: drop-shadow(0 12px 18px rgba(70,140,215,0.35));
          transition: transform 0.18s ease;
          cursor: pointer;
        }
        .a2-cloud:hover  { transform: scale(1.05); }
        .a2-cloud:active { transform: scale(0.94); }
        @media (prefers-reduced-motion: reduce) {
          .a2-sky * { animation: none !important; }
        }
      `}</style>

      {/* 앰비언트 블롭 (장식) */}
      <div className="absolute pointer-events-none" style={{ width: 320, height: 320, left: -130, top: -50, borderRadius: '50%', filter: 'blur(58px)', background: 'radial-gradient(circle at 45% 45%, rgba(255,255,255,0.7), transparent 68%)', animation: 'om-float2 14s ease-in-out infinite alternate' }} />
      <div className="absolute pointer-events-none" style={{ width: 340, height: 340, right: -140, top: 300, borderRadius: '50%', filter: 'blur(58px)', background: 'radial-gradient(circle at 45% 45%, rgba(150,205,250,0.5), transparent 68%)', animation: 'om-float1 17s ease-in-out infinite alternate' }} />
      <div className="absolute pointer-events-none" style={{ width: 300, height: 300, right: -80, top: -80, borderRadius: '50%', filter: 'blur(58px)', background: 'radial-gradient(circle at 45% 45%, rgba(255,240,200,0.5), transparent 68%)', animation: 'om-float2 19s ease-in-out infinite alternate' }} />

      {/* 콘텐츠 컬럼 — 390px 기준 중앙 정렬 (구름 좌표 기준 폭 유지) */}
      <div className="relative w-full max-w-[390px] mx-auto flex flex-col flex-1" style={{ padding: '0 20px' }}>

      {/* 브랜드 로고 행 */}
      <div className="relative z-[1] flex items-center" style={{ gap: 9 }}>
        <ModuMark size={32} color="#FFFFFF" highlight="#6FBDF4" />
        <span style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', textShadow: '0 1px 6px rgba(40,110,180,0.35)' }}>모두</span>
      </div>

      {/* 헤더 텍스트 */}
      <p className="relative z-[1]" style={{ marginTop: 20, fontSize: 13.5, fontWeight: 800, color: '#FFFFFF', textShadow: '0 1px 6px rgba(40,110,180,0.4)' }}>
        <span style={{ color: '#FFEDB3', WebkitTextStroke: '1px rgba(214,139,42,0.65)' }}>모두</span>에 오신 걸 환영해요!
      </p>
      <h1 className="relative z-[1]" style={{ marginTop: 6, fontSize: 27, fontWeight: 800, color: '#123A63', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
        당신은 누구인가요?
      </h1>
      <p className="relative z-[1]" style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: 'rgba(18,58,99,0.55)' }}>
        복수 선택 가능 · 구름을 눌러 보세요
      </p>

      {/* 구름 필드 */}
      <div className="relative z-[1] flex-1" style={{ marginTop: 12, minHeight: 554 }}>
        {/* 태양 햇살 halo */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: -8, top: -34, width: 118, height: 118, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,205,90,0.5), rgba(255,205,90,0.16) 55%, transparent 72%), repeating-conic-gradient(from 8deg, rgba(255,214,120,0.2) 0deg 16deg, rgba(255,214,120,0) 16deg 48deg)',
            filter: 'blur(10px)', animation: 'om-spin 48s linear infinite',
          }}
        />
        {/* 태양 디스크 — 중앙에 흰색 모두 심볼 */}
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            right: 22, top: -4, width: 58, height: 58, borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 32%, #FFF3D0, #FFCB55 58%, #F7A928)',
            animation: 'om-sunpulse 4.5s ease-in-out infinite',
          }}
        >
          <ModuMark size={26} color="#FFFFFF" highlight="#FFCB55" />
        </div>

        {/* 배경 미니구름 (장식) */}
        {DECOS.map((d, i) => (
          <div key={`deco${i}`} className="absolute pointer-events-none" style={{ ...d.style, animation: d.anim }}>
            <CloudShape circles={DECO_SETS[d.set]} off={4} />
          </div>
        ))}

        {/* 선택 구름 6개 */}
        {CATEGORIES.map((cat, i) => {
          const sel = isSelected(cat.id)
          return (
            <div
              key={cat.id}
              className="absolute"
              style={{ width: 222, height: 162, ...POS[i].style, animation: `${POS[i].anim} ease-in-out infinite alternate` }}
            >
              {/* 선택 글로우 — 구름 뒤 */}
              {sel && (
                <div
                  className="absolute pointer-events-none"
                  style={{ inset: -6, borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,155,240,0.5), transparent 72%)', filter: 'blur(12px)', animation: 'om-fade 0.25s ease' }}
                />
              )}
              <button
                type="button"
                aria-pressed={sel}
                onClick={() => toggle(cat.id)}
                className="a2-cloud relative block w-full h-full bg-transparent border-none p-0"
              >
                <CloudShape circles={CLOUDCFG[i]} selected={sel} />
                {/* 체크 배지 */}
                {sel && (
                  <div
                    className="absolute flex items-center justify-center"
                    style={{ top: '12%', right: '14%', width: 22, height: 22, borderRadius: '50%', background: '#2F9BF0', color: '#fff', fontSize: 11, fontWeight: 900, zIndex: 3, animation: 'om-pop 0.2s ease' }}
                  >
                    ✓
                  </div>
                )}
                {/* 구름 내부 텍스트 — 타이틀은 카테고리 주색 */}
                <div
                  className="absolute flex flex-col items-center justify-center text-center"
                  style={{ left: '7%', right: '11%', top: cat.txtTop ?? '21%', bottom: cat.txtBottom ?? '25%', zIndex: 2 }}
                >
                  <b style={{ fontSize: 16.5, fontWeight: 800, color: cat.color, letterSpacing: '-0.01em' }}>{cat.label}</b>
                  <span style={{ marginTop: 2, fontSize: 10, fontWeight: 600, color: 'rgba(23,57,92,0.78)', lineHeight: 1.4, maxWidth: 126, wordBreak: cat.noKeep ? 'normal' : 'keep-all' }}>
                    {cat.sub}
                  </span>
                </div>
              </button>
            </div>
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

      {/* 기존 회원 로그인 지름길 — 온보딩 질문 없이 바로 A4 로그인 모드로 */}
      <button
        onClick={() => navigate('/a4?mode=login')}
        className="relative z-[1] mt-4 mx-auto text-[15px] font-medium"
        style={{ color: 'rgba(18,58,99,0.75)' }}
      >
        이미 모두 회원이세요? <span className="font-bold underline underline-offset-2" style={{ color: '#1a4d8f' }}>로그인</span>
      </button>

      {/* 다음 버튼 */}
      <button
        disabled={!canProceed}
        onClick={() => {
          if (isMultiprofile) {
            sessionStorage.setItem('modu_multiprofile_pending', '1')
          }
          // 다중 선택 처리(B안) — 대표 역할 외 선택은 가입 완료 시 멀티프로필로 자동 등록
          // localStorage 사용: 카카오/네이버 로그인처럼 앱 밖을 다녀오는 경로에서
          // sessionStorage는 초기화될 수 있다 (modu_pending_category와 같은 이유)
          localStorage.setItem('modu_pending_roles', JSON.stringify(selected))
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
        className="relative z-[1] w-full flex items-center justify-center transition-transform active:scale-[0.985]"
        style={{
          marginTop: 12, height: 52, borderRadius: 16, fontSize: 16,
          ...(canProceed
            ? { background: 'linear-gradient(100deg, #2F9BF0, #5BC0FF)', border: 'none', color: '#FFFFFF', fontWeight: 800, boxShadow: '0 10px 28px rgba(47,155,240,0.4)', animation: 'om-fade 0.25s ease' }
            : { background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.85)', color: 'rgba(23,57,92,0.35)', fontWeight: 700 }),
        }}
      >
        다음
      </button>

      </div>
    </div>
  )
}

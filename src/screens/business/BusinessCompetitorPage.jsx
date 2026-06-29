import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../lib/userProfile'

const PURPLE = '#7d4ba3'
const PURPLE_BG = '#f5eefb'

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월']
const MY_DATA =   [1.0, 0.9, 1.1, 1.2, 1.0, 1.1]
const AVG_DATA =  [2.8, 3.0, 3.1, 3.2, 3.1, 3.2]

function MiniBar({ val, max, color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-400 w-5">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(val / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold text-gray-700 w-8 text-right">{val}%</span>
    </div>
  )
}

export default function BusinessCompetitorPage() {
  const navigate = useNavigate()
  const profile = getProfile()
  const bizTypeLabel = profile.bizTypeLabel ?? '인테리어·시공'
  const regionLabel = profile.region ?? '서울'

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 pb-3 px-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <p className="text-[15px] font-black text-gray-900">동종 비교 상세</p>
          <p className="text-[11px] text-gray-400">{bizTypeLabel} · {regionLabel}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'none' }}>

        {/* 핵심 지표 2×2 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: '내 전환율', val: '1.1%', sub: '하위 35%', up: false },
            { label: '업종 평균', val: '3.2%', sub: '기준선', up: null },
            { label: '내 신규 문의', val: '12건', sub: '이번 달', up: true },
            { label: '업종 평균 문의', val: '18건', sub: '기준선', up: null },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-[11px] text-gray-400 mb-1">{item.label}</p>
              <p className="text-[22px] font-black text-gray-900">{item.val}</p>
              <p className="text-[10px] mt-1"
                style={{ color: item.up === null ? '#6b7280' : item.up ? '#16a34a' : '#dc2626' }}>
                {item.up === true ? '↑' : item.up === false ? '↓' : ''} {item.sub}
              </p>
            </div>
          ))}
        </div>

        {/* 전환율 트렌드 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="text-[13px] font-bold text-gray-900 mb-3">전환율 추이 (최근 6개월)</p>
          <div className="space-y-2">
            {MONTHS.map((m, i) => (
              <div key={m}>
                <p className="text-[10px] text-gray-400 mb-1">{m}</p>
                <MiniBar val={MY_DATA[i]} max={4} color={PURPLE} label="나" />
                <div className="mt-1" />
                <MiniBar val={AVG_DATA[i]} max={4} color="#d1d5db" label="평균" />
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PURPLE }} />
              <span className="text-[10px] text-gray-500">내 전환율</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <span className="text-[10px] text-gray-500">업종 평균</span>
            </div>
          </div>
        </div>

        {/* 개선 포인트 */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="text-[13px] font-bold text-gray-900 mb-3">개선 포인트</p>
          {[
            { title: '트리거 5개 채우기', desc: '② 이럴 때 부릅니다 항목이 2개뿐이에요. 5개 이상이면 추천 알림 정확도 +40%', action: '채우기 →', path: '/e1b/2' },
            { title: '포트폴리오 사진 추가', desc: '현재 0장. 3장 이상이면 전환율 2.1배 향상', action: '추가하기 →', path: '/e1b/4' },
            { title: '응답 속도 설정', desc: '"즉시 응답"으로 설정하면 상위 노출 우선권', action: '설정 →', path: '/my' },
          ].map(pt => (
            <button key={pt.title}
              onClick={() => navigate(pt.path)}
              className="w-full flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 text-left active:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: PURPLE_BG }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke={PURPLE} strokeWidth="1.3" />
                  <path d="M7 4v3l2 2" stroke={PURPLE} strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-gray-800">{pt.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{pt.desc}</p>
              </div>
              <span className="text-[11px] font-bold shrink-0" style={{ color: PURPLE }}>{pt.action}</span>
            </button>
          ))}
        </div>

        <div className="h-4" />
      </main>
    </div>
  )
}

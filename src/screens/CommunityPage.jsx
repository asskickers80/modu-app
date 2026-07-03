import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import { supabase, getDeviceId } from '../lib/supabase'
import { generateCommunityInsight } from '../lib/gemini'
import ModuMark from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'

const AI_CACHE_KEY = 'modu_community_insight'

const ROOMS = [
  { id: 1, emoji: '🏪', name: '홍대 상권 양도자 모임', desc: '홍대·합정·연남 일대 양도 정보 공유', members: 312, unread: 5, last: '권리금 얼마 받으셨어요?', ago: '2분 전' },
  { id: 2, emoji: '📊', name: '서울 자영업 AI 정보방', desc: '모두 AI 분석·시장동향 자동 공유', members: 1204, unread: 12, last: '이번 달 카페 권리금 평균 상승했대요', ago: '7분 전' },
  { id: 3, emoji: '⚖️', name: '권리금 협상 Q&A', desc: '권리금 산정·협상 경험자 커뮤니티', members: 574, unread: 0, last: '감정평가서 꼭 받으세요', ago: '1시간 전' },
  { id: 4, emoji: '🔑', name: '계약서·법무 도우미', desc: '양도계약 시 주의사항 공유', members: 289, unread: 3, last: '특약 조항 공유합니다', ago: '3시간 전' },
  { id: 5, emoji: '🍽️', name: '식당·분식 양도자 모임', desc: '식음료업 매장 양도 전문 방', members: 441, unread: 0, last: '주방 설비 포함 가격이요', ago: '어제' },
  { id: 6, emoji: '✂️', name: '뷰티·미용 양도 채널', desc: '미용실·네일숍·피부관리 양도', members: 178, unread: 1, last: '단골 DB 이전 가능한가요?', ago: '어제' },
  { id: 7, emoji: '🏢', name: '임대인·건물주 정보방', desc: '공실 해소·임차인 관리 정보 공유', members: 523, unread: 0, last: '3개월 공실인데 어떻게 하죠', ago: '어제' },
  { id: 8, emoji: '🚀', name: '창업 준비 스터디', desc: '처음 창업하는 분들 모여요', members: 891, unread: 8, last: '사업자 내기 전 체크리스트 공유', ago: '3시간 전' },
  { id: 9, emoji: '💰', name: '세무·회계 자영업자방', desc: '부가세·종합소득세 절세 팁', members: 1567, unread: 0, last: '매입세액 공제 이거 맞아요?', ago: '2일 전' },
  { id: 10, emoji: '📢', name: '마케팅·단골 모으기', desc: '배달·SNS·쿠폰 마케팅 노하우', members: 734, unread: 2, last: '인스타 릴스 진짜 효과 있어요', ago: '5시간 전' },
]

const FEED_POSTS = [
  { id: 'f1', category: '시장동향', emoji: '📈', title: '6월 서울 카페 권리금 2.3% 상승', body: '마포·용산 일대 카페 권리금이 전월 대비 2.3% 올랐어요. 특히 홍대·이태원 핵심 상권 위주로 거래가 활발합니다.', author: 'AI 시장리포트', ago: '10분 전', likes: 45, comments: 12 },
  { id: 'f2', category: '성공사례', emoji: '🎉', title: '"권리금 없이 넘겨드렸는데 오히려 빨리 팔렸어요"', body: '3개월째 안 팔리던 매장을 권리금 조정 후 2주 만에 거래 성사. 비결은 보증금·월세 협상이었어요.', author: '홍대 카페 양도자', ago: '1시간 전', likes: 132, comments: 28 },
  { id: 'f3', category: '주의사항', emoji: '⚠️', title: '양도 계약 전 반드시 확인할 서류 5가지', body: '①임대차계약서 ②사업자등록증 ③건축물대장 ④소방안전점검서 ⑤시설물 하자 확인서. 빠뜨리면 분쟁 납니다.', author: '법무사 김변호', ago: '3시간 전', likes: 287, comments: 54 },
  { id: 'f4', category: '창업팁', emoji: '💡', title: '첫 창업, 프랜차이즈 vs 직영 어떤 게 나을까요', body: '안전성 중시면 프랜차이즈, 자유도 중시면 직영. 하지만 가맹비·로열티 꼼꼼히 따져야 손해 안 봐요.', author: '창업 컨설턴트 박씨', ago: '5시간 전', likes: 89, comments: 31 },
  { id: 'f5', category: '절세팁', emoji: '💸', title: '자영업자 절세 포인트 3가지 (이번 달 핫 게시글)', body: '①카드매출 누락 없이 등록 ②업무용 차량 경비처리 ③종합소득세 신고 전 세무사 무료 상담 활용하기', author: 'AI 세무팁봇', ago: '어제', likes: 421, comments: 77 },
]

// 상대시간 (D4 인박스와 동일 규칙)
function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

const icons = {
  home: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none" /><path d="M8 20v-7h6v7" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  explore: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.6" /><path d="M19 19l-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
  community: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 5h10a1 1 0 011 1v5a1 1 0 01-1 1H8l-3 2v-2H3a1 1 0 01-1-1V6a1 1 0 011-1z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 9h2a1 1 0 011 1v4a1 1 0 01-1 1h-1v2l-2-1.5" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  message: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="5" width="18" height="13" rx="2" stroke={c} strokeWidth="1.6" /><path d="M2 8l9 5.5L20 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  my: c => <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="4" stroke={c} strokeWidth="1.6" /><path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>,
}

export default function CommunityPage() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()
  const [activeTab, setActiveTab] = useState('chat')
  const [likedPosts, setLikedPosts] = useState({})
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Q&A 실데이터
  const [qnaPosts, setQnaPosts] = useState(null) // null = 아직 미로드
  const [showForm, setShowForm] = useState(false)
  const [qTitle, setQTitle] = useState('')
  const [qBody, setQBody] = useState('')
  const [qSubmitting, setQSubmitting] = useState(false)

  const loadQna = useCallback(async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
    setQnaPosts(data ?? [])
  }, [])

  useEffect(() => {
    if (activeTab === 'qna' && qnaPosts === null) loadQna()
  }, [activeTab, qnaPosts, loadQna])

  const fetchInsight = useCallback(async (force = false) => {
    const today = new Date().toISOString().slice(0, 10)
    if (!force) {
      const cached = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || 'null')
      if (cached?.date === today && cached?.text) { setAiInsight(cached.text); return }
    }
    setAiLoading(true)
    try {
      const text = await generateCommunityInsight()
      setAiInsight(text)
      localStorage.setItem(AI_CACHE_KEY, JSON.stringify({ date: today, text }))
    } catch { setAiInsight('오늘도 자영업자 여러분을 응원합니다. 궁금한 점은 커뮤니티에 질문해보세요.') }
    finally { setAiLoading(false) }
  }, [])

  useEffect(() => { fetchInsight() }, [fetchInsight])

  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg, home, message } = config

  const toggleLike = id => setLikedPosts(p => ({ ...p, [id]: !p[id] }))

  const submitQuestion = async () => {
    const title = qTitle.trim()
    const body = qBody.trim()
    if (!title || !body || qSubmitting) return
    setQSubmitting(true)
    try {
      const { error } = await supabase.from('community_posts').insert({
        author_device_id: getDeviceId(),
        author_nickname: getProfile().name ?? '사장님',
        category: profile.category ?? null,
        title,
        body,
      })
      if (error) throw error
      setQTitle(''); setQBody(''); setShowForm(false)
      showToast('질문이 등록됐어요')
      loadQna()
    } catch {
      showToast('등록 중 오류가 났어요. 다시 시도해 주세요.')
    } finally {
      setQSubmitting(false)
    }
  }

  const navTabs = [
    { id: 'home',      label: '홈',     onClick: () => navigate(home) },
    { id: 'explore',   label: '탐색',   onClick: () => navigate('/explore') },
    { id: 'community', label: '커뮤니티', onClick: () => {}, active: true },
    { id: 'message',   label: '메시지', onClick: message ? () => navigate(message) : () => showToast('가입 후 이용 가능해요') },
    { id: 'my',        label: '마이',   onClick: () => navigate('/my') },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 pb-0 px-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[20px] font-black text-gray-900">커뮤니티</h1>
          <button onClick={() => showToast('채팅방 만들기 준비 중이에요 🚧')}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex gap-6">
          {[
            { id: 'feed', label: '추천' },
            { id: 'chat', label: '오픈채팅' },
            { id: 'qna',  label: '질문·답변' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="pb-3 text-[13px] font-semibold border-b-2 transition-all"
              style={activeTab === t.id
                ? { color, borderColor: color }
                : { color: '#9ca3af', borderColor: 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {/* ── 추천 피드 탭 ── */}
        {activeTab === 'feed' && (
          <div className="px-4 py-3">
            {/* AI 오늘의 인사이트 */}
            <div className="mb-4 p-4 rounded-2xl border"
              style={{ backgroundColor: bg, borderColor: `${color}20` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold" style={{ color }}>✨ AI 오늘의 자영업 인사이트</span>
                <button onClick={() => fetchInsight(true)} disabled={aiLoading}
                  className="text-[18px] disabled:opacity-40" title="새로고침">
                  {aiLoading ? '⏳' : '↺'}
                </button>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2 py-1">
                  <div className="animate-pulse">
                    <ModuMark size={20} color="#1683B8" />
                  </div>
                  <span className="text-[12px] text-gray-400">AI 인사이트 생성 중...</span>
                </div>
              ) : (
                <p className="text-[13px] text-gray-700 leading-relaxed">{aiInsight}</p>
              )}
            </div>
            {FEED_POSTS.map(post => (
              <button key={post.id} onClick={() => navigate(`/community/post/${post.id}`)}
                className="w-full text-left mb-4 p-4 rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: bg, color }}>{post.category}</span>
                  <span className="text-[11px] text-gray-400">{post.author}</span>
                  <span className="text-[11px] text-gray-300 ml-auto">{post.ago}</span>
                </div>
                <p className="text-[14px] font-bold text-gray-900 mb-1.5">{post.emoji} {post.title}</p>
                <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">{post.body}</p>
                <div className="flex items-center gap-4 mt-3">
                  <button onClick={e => { e.stopPropagation(); toggleLike(post.id) }}
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: likedPosts[post.id] ? color : '#9ca3af' }}>
                    <span>{likedPosts[post.id] ? '♥' : '♡'}</span>
                    <span>{post.likes + (likedPosts[post.id] ? 1 : 0)}</span>
                  </button>
                  <span className="text-[11px] text-gray-400">💬 {post.comments}</span>
                </div>
              </button>
            ))}
            <div className="h-4" />
          </div>
        )}

        {/* ── 오픈채팅 탭 ── */}
        {activeTab === 'chat' && (
          <div className="px-4 pt-1">
            {ROOMS.map(room => (
              <button key={room.id} onClick={() => navigate(`/community/room/${room.id}`)}
                className="w-full flex items-center gap-3 py-4 border-b border-gray-50 last:border-0 text-left active:bg-gray-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px] shrink-0"
                  style={{ backgroundColor: bg }}>
                  {room.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-bold text-gray-900 leading-tight">{room.name}</p>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">{room.ago}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{room.members.toLocaleString()}명 참여 중</p>
                  <p className="text-[12px] text-gray-500 mt-1 truncate">{room.last}</p>
                </div>
                {room.unread > 0 && (
                  <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: color }}>
                    {room.unread}
                  </div>
                )}
              </button>
            ))}
            <div className="h-6" />
          </div>
        )}

        {/* ── 질문·답변 탭 (실데이터) ── */}
        {activeTab === 'qna' && (
          <div className="px-4 py-3">
            {!showForm ? (
              <button onClick={() => setShowForm(true)}
                className="w-full mb-4 py-3 rounded-2xl text-[13px] font-bold border-2 transition-colors"
                style={{ borderColor: color, color }}>
                + 질문 등록하기
              </button>
            ) : (
              <div className="mb-4 p-4 rounded-2xl border-2" style={{ borderColor: color }}>
                <input
                  type="text"
                  value={qTitle}
                  onChange={e => setQTitle(e.target.value)}
                  placeholder="질문 제목"
                  className="w-full text-[14px] font-bold outline-none bg-transparent mb-2 placeholder-gray-400"
                  autoFocus
                />
                <textarea
                  value={qBody}
                  onChange={e => setQBody(e.target.value)}
                  placeholder="궁금한 내용을 적어주세요"
                  className="w-full text-[13px] text-gray-800 placeholder-gray-400 outline-none resize-none h-24 bg-transparent"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-xl text-[12px] font-semibold text-gray-500 border border-gray-200">
                    취소
                  </button>
                  <button
                    disabled={!qTitle.trim() || !qBody.trim() || qSubmitting}
                    onClick={submitQuestion}
                    className="px-4 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-40"
                    style={{ backgroundColor: color }}>
                    등록
                  </button>
                </div>
              </div>
            )}

            {qnaPosts?.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-[28px] mb-3">💬</p>
                <p className="text-[14px] font-bold text-gray-700">아직 질문이 없어요</p>
                <p className="text-[12px] text-gray-400 mt-1">첫 질문을 남겨보세요</p>
              </div>
            )}
            {qnaPosts?.map(post => (
              <button key={post.id} onClick={() => navigate(`/community/post/${post.id}`)}
                className="w-full text-left mb-3 p-4 rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: bg, color }}>
                    {CATEGORY_CONFIG[post.category]?.label ?? '질문'}
                  </span>
                  <span className="text-[11px] text-gray-400">{post.author_nickname}</span>
                  <span className="text-[11px] text-gray-300 ml-auto">{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-[14px] font-bold text-gray-900 mb-1">{post.title}</p>
                <p className="text-[12px] text-gray-400 line-clamp-2">{post.body}</p>
              </button>
            ))}
            <div className="h-4" />
          </div>
        )}
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100 flex">
        {navTabs.map(t => {
          const c = t.active ? color : '#9ca3af'
          return (
            <button key={t.id} onClick={t.onClick}
              className="flex-1 flex flex-col items-center py-3 gap-0.5">
              <span className="relative">
                {icons[t.id](c)}
                {t.id === 'message' && <MessageTabDot />}
              </span>
              <span className="text-[10px] font-medium" style={{ color: c }}>{t.label}</span>
            </button>
          )
        })}
      </nav>

      <Toast message={toast} />
    </div>
  )
}

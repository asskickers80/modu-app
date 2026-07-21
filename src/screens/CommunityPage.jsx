import { useState, useEffect, useCallback } from 'react'
import { timeAgo } from '../lib/time'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import { supabase, getDeviceId } from '../lib/supabase'
import { generateCommunityInsight } from '../lib/gemini'
import ModuMark from '../components/ModuMark'
import MessageTabDot from '../components/MessageTabDot'
import ComingSoon from '../components/common/ComingSoon'

const AI_CACHE_KEY = 'modu_community_insight'

const FEED_POSTS = [
  { id: 'f1', category: '시장동향', emoji: '📈', title: '6월 서울 카페 권리금 2.3% 상승', body: '마포·용산 일대 카페 권리금이 전월 대비 2.3% 올랐어요. 특히 홍대·이태원 핵심 상권 위주로 거래가 활발합니다.', author: '모두 시장 리포트', ago: '10분 전', likes: 45, comments: 12 },
  { id: 'f2', category: '성공사례', emoji: '🎉', title: '"권리금 없이 넘겨드렸는데 오히려 빨리 팔렸어요"', body: '3개월째 안 팔리던 매장을 권리금 조정 후 2주 만에 거래 성사. 비결은 보증금·월세 협상이었어요.', author: '홍대 카페 양도자', ago: '1시간 전', likes: 132, comments: 28 },
  { id: 'f3', category: '주의사항', emoji: '⚠️', title: '양도 계약 전 반드시 확인할 서류 5가지', body: '①임대차계약서 ②사업자등록증 ③건축물대장 ④소방안전점검서 ⑤시설물 하자 확인서. 빠뜨리면 분쟁 납니다.', author: '법무사 김변호', ago: '3시간 전', likes: 287, comments: 54 },
  { id: 'f4', category: '창업팁', emoji: '💡', title: '첫 창업, 프랜차이즈 vs 직영 어떤 게 나을까요', body: '안전성 중시면 프랜차이즈, 자유도 중시면 직영. 하지만 가맹비·로열티 꼼꼼히 따져야 손해 안 봐요.', author: '창업 컨설턴트 박씨', ago: '5시간 전', likes: 89, comments: 31 },
  { id: 'f5', category: '절세팁', emoji: '💸', title: '자영업자 절세 포인트 3가지 (이번 달 핫 게시글)', body: '①카드매출 누락 없이 등록 ②업무용 차량 경비처리 ③종합소득세 신고 전 세무사 무료 상담 활용하기', author: '모두 세무 도우미', ago: '어제', likes: 421, comments: 77 },
]

// Q&A 카테고리 필터 — 커뮤니티 진입 가능 카테고리만 (그냥구경은 진입 차단: A7BrowsingFeed 가입 넛지)
const QNA_FILTERS = ['seller', 'startup', 'landlord', 'operating', 'business']

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
  const [qnaFilter, setQnaFilter] = useState('all')
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
    <div className="h-screen flex flex-col overflow-hidden">
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
                <span className="text-[11px] font-bold" style={{ color }}>✨ 오늘의 자영업 인사이트</span>
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
                  <span className="text-[12px] text-gray-400">인사이트 생성 중...</span>
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

        {/* ── 오픈채팅 탭 — 실채팅 연동 전 ── */}
        {activeTab === 'chat' && (
          <div className="px-4 pt-3">
            <div className="rounded-2xl border border-gray-100 bg-white">
              <ComingSoon title="오픈채팅" desc="카테고리별 오픈채팅방을 준비하고 있어요" />
            </div>
            <div className="h-6" />
          </div>
        )}

        {/* ── 질문·답변 탭 (실데이터) ── */}
        {activeTab === 'qna' && (
          <div className="px-4 py-3">
            {/* 카테고리 필터칩 */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => setQnaFilter('all')}
                className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
                style={qnaFilter === 'all'
                  ? { borderColor: '#374151', backgroundColor: '#374151', color: 'white' }
                  : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                전체
              </button>
              {QNA_FILTERS.map(id => {
                const c = CATEGORY_CONFIG[id]
                const sel = qnaFilter === id
                return (
                  <button key={id} onClick={() => setQnaFilter(id)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
                    style={sel
                      ? { borderColor: c.color, backgroundColor: c.bg, color: c.color }
                      : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                    {c.label}
                  </button>
                )
              })}
            </div>

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
            {qnaPosts?.length > 0 &&
              qnaPosts.filter(p => qnaFilter === 'all' || p.category === qnaFilter).length === 0 && (
              <div className="py-16 text-center">
                <p className="text-[12px] text-gray-400">이 카테고리의 질문이 아직 없어요</p>
              </div>
            )}
            {qnaPosts?.filter(p => qnaFilter === 'all' || p.category === qnaFilter).map(post => {
              const cat = CATEGORY_CONFIG[post.category]
              return (
                <button key={post.id} onClick={() => navigate(`/community/post/${post.id}`)}
                  className="w-full text-left mb-3 p-4 rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-1.5 mb-2">
                    {cat && (
                      <>
                        <span data-testid="category-dot" className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }} />
                        <span className="text-[11px] font-bold" style={{ color: cat.color }}>
                          {cat.label}
                        </span>
                      </>
                    )}
                    <span className="text-[11px] text-gray-400">{post.author_nickname}</span>
                    <span className="text-[11px] text-gray-300 ml-auto">{timeAgo(post.created_at)}</span>
                  </div>
                  <p className="text-[14px] font-bold text-gray-900 mb-1">{post.title}</p>
                  <p className="text-[12px] text-gray-400 line-clamp-2">{post.body}</p>
                </button>
              )
            })}
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

import { useState, useEffect, useCallback } from 'react'
import { timeAgo } from '../lib/time'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { getProfile, CATEGORY_CONFIG } from '../lib/userProfile'
import { supabase, getDeviceId } from '../lib/supabase'

// 추천 피드 더미 상세 (f1~f5) — 피드 탭이 더미인 동안 함께 유지. Q&A 더미(q1·q3)는 제거됨(실데이터).
const FEED_POSTS = {
  f1: {
    category: '시장동향', emoji: '📈',
    title: '6월 서울 카페 권리금 2.3% 상승',
    body: `마포·용산 일대 카페 권리금이 전월 대비 2.3% 올랐어요. 특히 홍대·이태원 핵심 상권 위주로 거래가 활발합니다.\n\n이번 상승세의 주요 원인은 첫째, 유동 인구 회복 및 상권 활성화, 둘째, 공급 부족 현상입니다. 특히 홍대 정문 반경 300m 내 카페는 권리금이 평균 3,200만원으로 작년 대비 15% 상승했습니다.\n\n반면 강남 구청 주변이나 역삼동 일대는 오피스 상권 특성상 비교적 안정적인 수준을 유지하고 있습니다.`,
    author: 'AI 시장리포트', ago: '10분 전', likes: 45, comments: 12, views: 234,
    tags: ['서울', '카페', '권리금', '시장동향'],
  },
  f2: {
    category: '성공사례', emoji: '🎉',
    title: '"권리금 없이 넘겨드렸는데 오히려 빨리 팔렸어요"',
    body: `3개월째 안 팔리던 매장을 권리금 조정 후 2주 만에 거래 성사했습니다.\n\n처음에는 권리금 2,500만원을 받으려 했지만, 장사가 잘 안 되고 있다보니 계속 협상이 안 됐어요. 주변의 조언을 받아 권리금을 없애고 보증금·월세를 조정했더니, 오히려 더 많은 분들이 관심을 가져주셨어요.\n\n결론적으로 권리금 없이 + 보증금 500만원 낮춤 + 인테리어 지원 조건으로 계약 성사. 기간은 첫 광고 후 11일이었습니다.`,
    author: '홍대 카페 양도자', ago: '1시간 전', likes: 132, comments: 28, views: 891,
    tags: ['성공사례', '양도', '협상'],
  },
  f3: {
    category: '주의사항', emoji: '⚠️',
    title: '양도 계약 전 반드시 확인할 서류 5가지',
    body: `양도 계약 진행 전 아래 서류를 반드시 챙기세요. 빠뜨리면 나중에 분쟁으로 이어집니다.\n\n**① 임대차계약서 사본**\n현재 임대차 조건, 잔여 기간, 특약사항을 확인. 임대인 동의 없는 양도는 무효.\n\n**② 사업자등록증**\n업종 변경 이력 및 폐업/정지 이력 확인. 허가 업종이라면 면허 이전도 체크.\n\n**③ 건축물대장**\n실제 용도(상업/주거 혼용 여부), 면적 일치 여부 확인.\n\n**④ 소방안전점검서**\n소방법 위반 사항 있으면 승계됨. 점검 완료 확인서 요청.\n\n**⑤ 시설물 하자 목록**\n에어컨, 냉장고, 주방 기기 상태 목록화하여 상태 이상 시 협의 근거 마련.`,
    author: '법무사 김변호', ago: '3시간 전', likes: 287, comments: 54, views: 1204,
    tags: ['계약', '서류', '주의사항', '법무'],
  },
  f4: {
    category: '창업팁', emoji: '💡',
    title: '첫 창업, 프랜차이즈 vs 직영 어떤 게 나을까요',
    body: `첫 창업을 앞두고 많은 분들이 고민하시는 프랜차이즈 vs 직영 창업 비교입니다.\n\n**프랜차이즈 장점:**\n- 브랜드 인지도로 초기 고객 확보 용이\n- 시스템화된 운영 매뉴얼 제공\n- 식자재 공동 구매로 원가 절감\n\n**프랜차이즈 단점:**\n- 가맹비 + 로열티 부담 (매출의 3~7%)\n- 운영 자율도 낮음\n- 본사 리스크가 그대로 영향\n\n**직영 장점:**\n- 메뉴·가격·인테리어 자유\n- 로열티 없음\n- 브랜드 자산 내 것\n\n**직영 단점:**\n- 처음부터 모든 걸 혼자 해야 함\n- 실패 리스크 본인 부담\n\n**결론:** 안전성 중시면 프랜차이즈, 자유도 중시면 직영. 단 가맹 계약서의 가맹비·광고비·리모델링 강제조항은 반드시 꼼꼼히 체크.`,
    author: '창업 컨설턴트 박씨', ago: '5시간 전', likes: 89, comments: 31, views: 567,
    tags: ['창업', '프랜차이즈', '직영'],
  },
  f5: {
    category: '절세팁', emoji: '💸',
    title: '자영업자 절세 포인트 3가지',
    body: `세금 한 푼이라도 더 아끼는 자영업자 필수 절세 포인트입니다.\n\n**① 카드 매출 누락 없이 등록**\n카드 단말기 매출은 국세청이 자동 파악. 누락하면 가산세. 현금 매출도 현금영수증 발급 습관화.\n\n**② 업무용 차량 경비처리**\n화물차·승합차는 100% 경비 처리 가능. 일반 승용차는 업무 비율만큼만. 운행일지 작성 필수.\n\n**③ 종합소득세 신고 전 세무사 무료 상담**\n5월 신고 전 세무사 무료 상담 (소상공인진흥공단 연결) 활용. 놓치기 쉬운 공제 항목 체크.`,
    author: 'AI 세무팁봇', ago: '어제', likes: 421, comments: 77, views: 2341,
    tags: ['세금', '절세', '세무'],
  },
}

export default function CommunityPostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  const profile = getProfile()
  const config = CATEGORY_CONFIG[profile.category] ?? CATEGORY_CONFIG.seller
  const { color, bg } = config

  const feedPost = FEED_POSTS[postId]

  // 실데이터 글 (Q&A)
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(!feedPost)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at')
    setComments(data ?? [])
  }, [postId])

  useEffect(() => {
    if (feedPost) return
    ;(async () => {
      const { data } = await supabase.from('community_posts').select('*').eq('id', postId)
      setPost(data?.[0] ?? null)
      await loadComments()
      setLoading(false)
    })()
  }, [postId]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitComment = async () => {
    const text = comment.trim()
    if (!text) { showToast('내용을 입력해주세요'); return }
    if (submitting) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('community_comments').insert({
        post_id: postId,
        author_device_id: getDeviceId(),
        author_nickname: getProfile().name ?? '사장님',
        category: getProfile().category ?? null,
        text,
      })
      if (error) throw error
      setComment('')
      loadComments()
    } catch {
      showToast('등록 중 오류가 났어요. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 로딩 (실데이터 글) ──
  if (!feedPost && loading) {
    return <div className="h-screen bg-white" />
  }

  // ── 없는 글 ──
  if (!feedPost && !post) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <span className="text-[40px]">😕</span>
        <p className="text-[15px] font-semibold text-gray-500">글을 찾을 수 없어요</p>
        <button onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white"
          style={{ backgroundColor: color }}>돌아가기</button>
      </div>
    )
  }

  const isReal = !feedPost

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* 헤더 */}
      <header className="shrink-0 bg-white border-b border-gray-100 pt-12 px-4 pb-0">
        <div className="flex items-center gap-3 pb-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-[15px] font-bold text-gray-900 flex-1 truncate">
            {isReal ? '질문·답변' : '추천 피드'}
          </p>
          <button onClick={() => showToast('공유 기능 준비 중이에요 🚧')}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 8a2 2 0 104 0 2 2 0 00-4 0zM12 3a2 2 0 100-4 2 2 0 000 4zM12 13a2 2 0 100-4 2 2 0 000 4zM4 10.5L12 5.5M4 5.5l8 5" stroke="#6b7280" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6">

          {/* ── 실데이터 Q&A 글 ── */}
          {isReal && (
            <>
              <div className="flex items-center gap-1.5 mb-3">
                {CATEGORY_CONFIG[post.category] && (
                  <>
                    <span data-testid="category-dot" className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_CONFIG[post.category].color }} />
                    <span className="text-[11px] font-bold"
                      style={{ color: CATEGORY_CONFIG[post.category].color }}>
                      {CATEGORY_CONFIG[post.category].label}
                    </span>
                  </>
                )}
                <span className="text-[11px] text-gray-400">{post.author_nickname}</span>
                <span className="text-[11px] text-gray-300 ml-auto">{timeAgo(post.created_at)}</span>
              </div>

              <h1 className="text-[18px] font-black text-gray-900 mb-4 leading-snug">{post.title}</h1>

              <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line mb-5 pb-4 border-b border-gray-100">
                {post.body}
              </div>

              {/* 댓글(답변) 목록 */}
              {comments.length > 0 && (
                <div className="mb-5">
                  <p className="text-[13px] font-bold text-gray-700 mb-3">답변 {comments.length}개</p>
                  {comments.map(c => {
                    const cat = CATEGORY_CONFIG[c.category]
                    return (
                      <div key={c.id} className="p-4 rounded-2xl mb-3 border border-gray-100 bg-gray-50">
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
                          <span className="text-[12px] font-bold text-gray-700">{c.author_nickname}</span>
                          <span className="text-[11px] text-gray-400">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-[13px] text-gray-700 leading-relaxed">{c.text}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 답변 입력 (실동작) */}
              <div className="border border-gray-200 rounded-2xl p-3">
                <p className="text-[12px] font-bold text-gray-700 mb-2">답변 작성</p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="도움이 될 답변을 남겨주세요..."
                  className="w-full text-[13px] text-gray-800 placeholder-gray-400 outline-none resize-none h-20 bg-transparent" />
                <div className="flex justify-end mt-2">
                  <button onClick={submitComment} disabled={submitting}
                    className="px-4 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-40"
                    style={{ backgroundColor: color }}>
                    등록
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── 추천 피드 더미 글 (유지) ── */}
          {!isReal && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: bg, color }}>{feedPost.category}</span>
                <span className="text-[11px] text-gray-400">{feedPost.author}</span>
                <span className="text-[11px] text-gray-300 ml-auto">{feedPost.ago}</span>
              </div>

              <h1 className="text-[18px] font-black text-gray-900 mb-4 leading-snug">
                {feedPost.emoji} {feedPost.title}
              </h1>

              <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                {feedPost.body}
              </div>

              {feedPost.tags && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {feedPost.tags.map(t => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">#{t}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 py-3 border-t border-gray-100 mb-5">
                <button onClick={() => setLiked(v => !v)}
                  className="flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: liked ? color : '#9ca3af' }}>
                  <span className="text-[16px]">{liked ? '♥' : '♡'}</span>
                  {(feedPost.likes ?? 0) + (liked ? 1 : 0)}
                </button>
                {feedPost.views && (
                  <span className="text-[12px] text-gray-400">👁 {feedPost.views.toLocaleString()}</span>
                )}
              </div>

              {/* 피드 더미 글의 댓글은 아직 준비 중 (피드 실연결 때 함께) */}
              <div className="border border-gray-200 rounded-2xl p-3">
                <p className="text-[12px] font-bold text-gray-700 mb-2">댓글 달기</p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="의견을 남겨주세요..."
                  className="w-full text-[13px] text-gray-800 placeholder-gray-400 outline-none resize-none h-20 bg-transparent" />
                <div className="flex justify-end mt-2">
                  <button onClick={() => {
                    if (!comment.trim()) { showToast('내용을 입력해주세요'); return }
                    showToast('등록 기능 준비 중이에요 🚧')
                    setComment('')
                  }}
                    className="px-4 py-2 rounded-xl text-[12px] font-bold text-white"
                    style={{ backgroundColor: color }}>
                    등록
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Toast message={toast} />
    </div>
  )
}

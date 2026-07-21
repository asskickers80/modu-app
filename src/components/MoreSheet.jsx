import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * 더보기(⋯) 공통 골격 — [바로가기] + [객체 액션] 2그룹 바텀시트.
 *
 * config: {
 *   shortcuts:    [{ icon, label, visible, onTap }],   // 바로가기 그룹
 *   actionsLabel: '매물 관리',                          // 객체 액션 그룹 라벨 (프로필별 객체명)
 *   actions:      [{ icon, label, visible, onTap }],   // 객체 액션 그룹
 * }
 *
 * 규칙:
 * - visible이 거짓인 항목은 비활성이 아니라 미노출.
 * - 노출 항목이 0개면 ⋯ 버튼 자체를 렌더하지 않는다 (빈 시트 금지).
 * - config 빌더는 src/lib/moreSheetConfig.js — 노출 조건은 데이터·라우트 존재로 판정.
 */
const isVisible = item => (typeof item.visible === 'function' ? item.visible() : item.visible !== false)

export default function MoreSheet({ config, dark = false, className = '' }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const shortcuts = (config?.shortcuts ?? []).filter(isVisible)
  const actions = (config?.actions ?? []).filter(isVisible)
  // 로그인 상태면 모든 프로필의 시트 최하단에 로그아웃 노출
  const showLogout = !!user
  if (shortcuts.length + actions.length + (showLogout ? 1 : 0) === 0) return null

  const handleLogout = async () => {
    close()
    await signOut()
    // 로그아웃 = 게스트로 전환 — 방문자 홈(둘러보기)으로. 재로그인·가입은 그 화면에서.
    navigate('/a7/browsing', { replace: true })
  }

  const close = () => setOpen(false)
  const renderItem = item => (
    <button
      key={item.label}
      onClick={() => { close(); item.onTap() }}
      className="w-full flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0 text-left active:bg-gray-50 transition-colors">
      <span className="text-[20px] w-8 text-center">{item.icon}</span>
      <span className="text-[14px] font-medium text-gray-800">{item.label}</span>
    </button>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${dark ? 'text-white/70' : 'text-gray-400'} text-[20px] leading-none tracking-widest ${className}`}>
        ···
      </button>

      {open && (
        <div className="fixed inset-0 z-50" onClick={close}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-3 pb-8"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {shortcuts.length > 0 && (
              <>
                <p className="text-[12px] font-bold text-gray-400 mb-1">바로가기</p>
                {shortcuts.map(renderItem)}
              </>
            )}

            {shortcuts.length > 0 && actions.length > 0 && (
              <div className="h-px bg-gray-100 my-3" />
            )}

            {actions.length > 0 && (
              <>
                {config.actionsLabel && (
                  <p className="text-[12px] font-bold text-gray-400 mb-1">{config.actionsLabel}</p>
                )}
                {actions.map(renderItem)}
              </>
            )}

            {/* 로그아웃 — 로그인 상태에서 모든 프로필 시트 최하단 */}
            {showLogout && (
              <>
                {(shortcuts.length > 0 || actions.length > 0) && <div className="h-px bg-gray-100 my-3" />}
                <button
                  data-testid="more-logout"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 py-3.5 text-left active:bg-gray-50 transition-colors">
                  <span className="text-[20px] w-8 text-center">🚪</span>
                  <span className="text-[14px] font-medium text-gray-500">로그아웃</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

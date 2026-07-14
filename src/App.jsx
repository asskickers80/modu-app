import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { getProfile, CATEGORY_CONFIG } from './lib/userProfile'
import AuthCallbackPage from './screens/AuthCallbackPage'
import AuthKakaoCallbackPage from './screens/AuthKakaoCallbackPage'
import AuthResetPasswordPage from './screens/AuthResetPasswordPage'
import A1Splash from './screens/A1Splash'
import A2CategorySelect from './screens/A2CategorySelect'
import A3SellerQuestions from './screens/A3SellerQuestions'
import A3LandlordQuestions from './screens/A3LandlordQuestions'
import A3StartupQuestions from './screens/A3StartupQuestions'
import A3OperatingQuestions from './screens/A3OperatingQuestions'
import A4SignUp from './screens/A4SignUp'
import A7SellerDashboard from './screens/A7SellerDashboard'
import A7LandlordDashboard from './screens/A7LandlordDashboard'
import A7StartupFeed from './screens/A7StartupFeed'
import A7OperatingDashboard from './screens/A7OperatingDashboard'
import A7BrowsingFeed from './screens/A7BrowsingFeed'
import E2PropertyDetail from './screens/E2PropertyDetail'
import DevMenu from './screens/DevMenu'
import D4Inbox from './screens/d4/D4Inbox'
import D4Chat from './screens/d4/D4Chat'
import E2LPropertyDetail from './screens/E2LPropertyDetail'
import D4LandlordInbox from './screens/d4landlord/D4LandlordInbox'
import D4StartupInbox from './screens/d4startup/D4StartupInbox'
import D4OperatingInbox from './screens/d4operating/D4OperatingInbox'
import D4BusinessInbox from './screens/d4business/D4BusinessInbox'
import D4BusinessChat from './screens/d4business/D4BusinessChat'
import A3BusinessQuestions from './screens/A3BusinessQuestions'
import A7BusinessDashboard from './screens/A7BusinessDashboard'
import MyPage from './screens/MyPage'
import MyDetailPage from './screens/MyDetailPage'
import ExplorePage from './screens/ExplorePage'
import CommunityPage from './screens/CommunityPage'
import BusinessPerformancePage from './screens/business/BusinessPerformancePage'
import BusinessPushPage from './screens/business/BusinessPushPage'
import SalesInputPage from './screens/operating/SalesInputPage'
import FAuthGate from './screens/FAuthGate'
import ReviewLogPage from './screens/ReviewLogPage'
import ProposalSettingsPage from './screens/ProposalSettingsPage'
import CommunityPostDetail from './screens/CommunityPostDetail'
import BrandPreviewPage from './screens/BrandPreviewPage'
import SupabaseTestPage from './screens/SupabaseTestPage'
import { E1bProvider } from './screens/e1b/E1bContext'
import E1bStep1 from './screens/e1b/E1bStep1'
import E1bStep2 from './screens/e1b/E1bStep2'
import E1bStep3 from './screens/e1b/E1bStep3'
import E1bStep4 from './screens/e1b/E1bStep4'
import E1bStep5 from './screens/e1b/E1bStep5'
import { E1Provider } from './screens/e1/E1Context'
import E1Step1 from './screens/e1/E1Step1'
import E1Step2 from './screens/e1/E1Step2'
import E1Step4 from './screens/e1/E1Step4'
import E1Step5 from './screens/e1/E1Step5'
import { E1pProvider } from './screens/e1p/E1pContext'
import E1pStep1 from './screens/e1p/E1pStep1'
import E1pStep2 from './screens/e1p/E1pStep2'
import E1pStep3 from './screens/e1p/E1pStep3'
import E1pStep4 from './screens/e1p/E1pStep4'
import E1pStep5 from './screens/e1p/E1pStep5'

// 앱 공통 틀 — 역할(카테고리)별로 페이지 배경에 주색 4% 틴트를 깐다.
// useLocation 구독으로 라우트가 바뀔 때마다 프로필을 다시 읽음 (온보딩 완료·프로필 전환 반영)
function AppFrame({ children }) {
  useLocation()
  const category = getProfile().category
  const pageBg = CATEGORY_CONFIG[category]?.pageBg ?? '#ffffff'
  return (
    <div className="flex justify-center min-h-screen bg-gray-100 overflow-x-hidden">
      <div className="w-full max-w-[430px] min-h-screen relative shadow-sm" style={{ backgroundColor: pageBg }}>
        {children}
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <AppFrame>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/kakao-callback" element={<AuthKakaoCallbackPage />} />
            <Route path="/auth/reset-password" element={<AuthResetPasswordPage />} />
            {/* /auth/naver-callback — 네이버 로그인 승인 후 추가 예정 */}
            <Route path="/" element={<A1Splash />} />
            <Route path="/a2" element={<A2CategorySelect />} />
            <Route path="/a3/seller" element={<A3SellerQuestions />} />
            <Route path="/a3/landlord" element={<A3LandlordQuestions />} />
            <Route path="/a3/startup" element={<A3StartupQuestions />} />
            <Route path="/a3/operating" element={<A3OperatingQuestions />} />
            <Route path="/a4" element={<A4SignUp />} />
            <Route path="/a7/seller" element={<A7SellerDashboard />} />
            <Route path="/a7/landlord" element={<A7LandlordDashboard />} />
            <Route path="/a7/startup" element={<A7StartupFeed />} />
            <Route path="/a7/operating" element={<A7OperatingDashboard />} />
            <Route path="/a7/browsing" element={<A7BrowsingFeed />} />
            <Route path="/e2/:id" element={<E2PropertyDetail />} />
            <Route path="/d4/inbox" element={<D4Inbox />} />
            <Route path="/d4/chat/:threadId" element={<D4Chat />} />
            <Route path="/e2l/:id" element={<E2LPropertyDetail />} />
            <Route path="/d4/landlord/inbox" element={<D4LandlordInbox />} />
            {/* 임대인·운영중·창업준비 채팅은 공용 D4Chat(/d4/chat/:threadId) 사용 */}
            <Route path="/d4/startup/inbox" element={<D4StartupInbox />} />
            {/* 창업준비 채팅은 공용 D4Chat(/d4/chat/:threadId) 사용 */}
            <Route path="/d4/operating/inbox" element={<D4OperatingInbox />} />
            <Route path="/d4/business/inbox" element={<D4BusinessInbox />} />
            <Route path="/d4/business/chat/:threadId" element={<D4BusinessChat />} />
            <Route path="/dev" element={<DevMenu />} />
            <Route path="/dev/review-log" element={<ReviewLogPage />} />
            <Route path="/dev/brand" element={<BrandPreviewPage />} />
            <Route path="/dev/supabase" element={<SupabaseTestPage />} />
            <Route path="/a3/business" element={<A3BusinessQuestions />} />
            <Route path="/a7/business" element={<A7BusinessDashboard />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/my/proposal-settings" element={<ProposalSettingsPage />} />
            <Route path="/my/:section" element={<MyDetailPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/post/:postId" element={<CommunityPostDetail />} />
            <Route path="/business/performance" element={<BusinessPerformancePage />} />
            <Route path="/business/push" element={<BusinessPushPage />} />
            <Route path="/operating/sales-input" element={<SalesInputPage />} />
            <Route path="/auth-gate" element={<FAuthGate />} />
            {/* E1'' 기업회원 노출 페이지 5단계 */}
            <Route element={<E1bProvider />}>
              <Route path="/e1b/1" element={<E1bStep1 />} />
              <Route path="/e1b/2" element={<E1bStep2 />} />
              <Route path="/e1b/3" element={<E1bStep3 />} />
              <Route path="/e1b/4" element={<E1bStep4 />} />
              <Route path="/e1b/5" element={<E1bStep5 />} />
            </Route>
            {/* E1 양도자 매물 등록 4단계 */}
            <Route element={<E1Provider />}>
              <Route path="/e1/1" element={<E1Step1 />} />
              <Route path="/e1/2" element={<E1Step2 />} />
              <Route path="/e1/3" element={<E1Step4 />} />
              <Route path="/e1/4" element={<E1Step5 />} />
            </Route>
            {/* E1' 임대인 상가 등록 5단계 */}
            <Route element={<E1pProvider />}>
              <Route path="/e1p/1" element={<E1pStep1 />} />
              <Route path="/e1p/2" element={<E1pStep2 />} />
              <Route path="/e1p/3" element={<E1pStep3 />} />
              <Route path="/e1p/4" element={<E1pStep4 />} />
              <Route path="/e1p/5" element={<E1pStep5 />} />
            </Route>
            {/* 미정의 경로 — 홈(스플래시→온보딩/대시보드)으로 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </AppFrame>
    </BrowserRouter>
    </AuthProvider>
  )
}

export default App

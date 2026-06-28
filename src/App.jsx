import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import A3BusinessQuestions from './screens/A3BusinessQuestions'
import A7BusinessDashboard from './screens/A7BusinessDashboard'
import { E1bProvider } from './screens/e1b/E1bContext'
import E1bStep1 from './screens/e1b/E1bStep1'
import E1bStep2 from './screens/e1b/E1bStep2'
import E1bStep3 from './screens/e1b/E1bStep3'
import E1bStep4 from './screens/e1b/E1bStep4'
import E1bStep5 from './screens/e1b/E1bStep5'
import { E1Provider } from './screens/e1/E1Context'
import E1Step1 from './screens/e1/E1Step1'
import E1Step2 from './screens/e1/E1Step2'
import E1Step3 from './screens/e1/E1Step3'
import E1Step4 from './screens/e1/E1Step4'
import E1Step5 from './screens/e1/E1Step5'
import { E1pProvider } from './screens/e1p/E1pContext'
import E1pStep1 from './screens/e1p/E1pStep1'
import E1pStep2 from './screens/e1p/E1pStep2'
import E1pStep3 from './screens/e1p/E1pStep3'
import E1pStep4 from './screens/e1p/E1pStep4'
import E1pStep5 from './screens/e1p/E1pStep5'

function App() {
  return (
    <BrowserRouter>
      <div className="flex justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-[390px] bg-white min-h-screen relative shadow-sm">
          <Routes>
            <Route path="/" element={<A2CategorySelect />} />
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
            <Route path="/dev" element={<DevMenu />} />
            <Route path="/a3/business" element={<A3BusinessQuestions />} />
            <Route path="/a7/business" element={<A7BusinessDashboard />} />
            {/* E1'' 기업회원 노출 페이지 5단계 */}
            <Route element={<E1bProvider />}>
              <Route path="/e1b/1" element={<E1bStep1 />} />
              <Route path="/e1b/2" element={<E1bStep2 />} />
              <Route path="/e1b/3" element={<E1bStep3 />} />
              <Route path="/e1b/4" element={<E1bStep4 />} />
              <Route path="/e1b/5" element={<E1bStep5 />} />
            </Route>
            {/* E1 양도자 매물 등록 5단계 */}
            <Route element={<E1Provider />}>
              <Route path="/e1/1" element={<E1Step1 />} />
              <Route path="/e1/2" element={<E1Step2 />} />
              <Route path="/e1/3" element={<E1Step3 />} />
              <Route path="/e1/4" element={<E1Step4 />} />
              <Route path="/e1/5" element={<E1Step5 />} />
            </Route>
            {/* E1' 임대인 상가 등록 5단계 */}
            <Route element={<E1pProvider />}>
              <Route path="/e1p/1" element={<E1pStep1 />} />
              <Route path="/e1p/2" element={<E1pStep2 />} />
              <Route path="/e1p/3" element={<E1pStep3 />} />
              <Route path="/e1p/4" element={<E1pStep4 />} />
              <Route path="/e1p/5" element={<E1pStep5 />} />
            </Route>
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App

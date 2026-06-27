import { BrowserRouter, Routes, Route } from 'react-router-dom'
import A2CategorySelect from './screens/A2CategorySelect'
import A3SellerQuestions from './screens/A3SellerQuestions'

function App() {
  return (
    <BrowserRouter>
      <div className="flex justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-[390px] bg-white min-h-screen relative shadow-sm">
          <Routes>
            <Route path="/" element={<A2CategorySelect />} />
            <Route path="/a3/seller" element={<A3SellerQuestions />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App

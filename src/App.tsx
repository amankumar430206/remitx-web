import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DesignSystem } from '@/pages/DesignSystem'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/design-system" element={<DesignSystem />} />
        <Route path="*" element={<Navigate to="/design-system" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage  from './HomePage'
import PortalApp from './PortalApp.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/workspace" element={<PortalApp />} />
        <Route path="/catalog"   element={<Navigate to="/" replace />} />
        <Route path="*"          element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

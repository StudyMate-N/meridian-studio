import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage  from './HomePage'
import PortalApp from './workspace/PortalApp.jsx'
import WriterApp from './expert/WriterApp.jsx'
import GettingStarted from './GettingStarted.jsx'
import ResetPassword from './ResetPassword.jsx'
import InfoPage from './InfoPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/getting-started" element={<GettingStarted />} />
        <Route path="/workspace" element={<PortalApp />} />
        <Route path="/expert"    element={<WriterApp />} />
        <Route path="/reset"     element={<ResetPassword />} />
        <Route path="/terms"           element={<InfoPage page="terms" />} />
        <Route path="/privacy"         element={<InfoPage page="privacy" />} />
        <Route path="/refund"          element={<InfoPage page="refund" />} />
        <Route path="/confidentiality" element={<InfoPage page="confidentiality" />} />
        <Route path="/integrity"       element={<InfoPage page="integrity" />} />
        <Route path="/contact"         element={<InfoPage page="contact" />} />
        <Route path="/catalog"   element={<Navigate to="/" replace />} />
        <Route path="*"          element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

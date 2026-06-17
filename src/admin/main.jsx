import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AdminApp from './v2/AdminApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
)

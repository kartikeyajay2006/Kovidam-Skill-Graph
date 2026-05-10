import React from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PlaceholderPage from './pages/PlaceholderPage'
import ShortlistPage from './pages/ShortlistPage'
import SemanticSearchPage from './pages/SemanticSearchPage'
import ContactPage from './pages/ContactPage'
import './App.css'

function App() {
  return (
    <Routes>
      {/* Public SaaS Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<PlaceholderPage title="Product Overview" />} />
        <Route path="/features" element={<PlaceholderPage title="Features & Capabilities" />} />
        <Route path="/about" element={<PlaceholderPage title="About Us" />} />
        <Route path="/contact" element={<ContactPage />} />
        
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<PlaceholderPage title="Reset Password" />} />
      </Route>

      {/* Core Web App / Dashboard Pages */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<PlaceholderPage title="Dashboard Hub" />} />
        <Route path="shortlist" element={<ShortlistPage />} />
        <Route path="search" element={<SemanticSearchPage />} />
        <Route path="candidate/:id" element={<PlaceholderPage title="Candidate Profile" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings & Configuration" />} />
      </Route>
    </Routes>
  )
}

export default App

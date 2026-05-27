import React from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PlaceholderPage from './pages/PlaceholderPage'
import AboutPage from './pages/AboutPage'
import TeamPage from './pages/TeamPage'
import DashboardHub from './pages/DashboardHub'
import ShortlistPage from './pages/ShortlistPage'
import PastShortlistPage from './pages/PastShortlistPage'
import SemanticSearchPage from './pages/SemanticSearchPage'
import ContactPage from './pages/ContactPage'
import AllShortlistsPage from './pages/AllShortlistsPage'
import ProductPage from './pages/ProductPage'
import './App.css'

function App() {
  return (
    <Routes>
      {/* Public SaaS Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<ProductPage />} />
        <Route path="/features" element={<PlaceholderPage title="Features & Capabilities" />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/company/team" element={<TeamPage />} />
        <Route path="/contact" element={<ContactPage />} />
        
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<PlaceholderPage title="Reset Password" />} />
      </Route>

      {/* Core Web App / Dashboard Pages */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardHub />} />
        <Route path="shortlist" element={<ShortlistPage />} />
        <Route path="history" element={<AllShortlistsPage />} />
        <Route path="history/:traceId" element={<PastShortlistPage />} />
        <Route path="search" element={<SemanticSearchPage />} />
        <Route path="candidate/:id" element={<PlaceholderPage title="Candidate Profile" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings & Configuration" />} />
      </Route>
    </Routes>
  )
}

export default App

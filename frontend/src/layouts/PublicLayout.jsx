import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChatWidget from '../components/ChatWidget'
import BackgroundEffects from '../components/BackgroundEffects'

export default function PublicLayout() {
  return (
    <div className="app-container">
      <BackgroundEffects />
      <Navbar />
      <Outlet />
      <ChatWidget />
    </div>
  )
}

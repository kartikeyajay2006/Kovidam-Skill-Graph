import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChatWidget from '../components/ChatWidget'

export default function PublicLayout() {
  return (
    <div className="app-container">
      <Navbar />
      <Outlet />
      <ChatWidget />
    </div>
  )
}

import React from 'react'
import { Outlet } from 'react-router-dom'
import BackgroundEffects from '../components/BackgroundEffects'
import DashboardNavbar from '../components/DashboardNavbar'
import { ShortlistProvider } from '../context/ShortlistContext'

export default function DashboardLayout() {
  return (
    <ShortlistProvider>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100vw',
        position: 'relative'
      }}>
        <BackgroundEffects />
        
        <DashboardNavbar />

        <main style={{ 
          flex: 1, 
          width: '100%', 
          maxWidth: '100%', 
          padding: '120px 3rem 2rem 3rem', /* Padding top accounts for fixed header */
          zIndex: 10, 
          color: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Outlet />
        </main>
      </div>
    </ShortlistProvider>
  )
}

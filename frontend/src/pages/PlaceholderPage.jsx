import React from 'react'

export default function PlaceholderPage({ title }) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(90deg, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {title}
      </h1>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', maxWidth: '600px', lineHeight: 1.6 }}>
        This page is currently under construction. Check back soon for the fully implemented premium design and functionality.
      </p>
    </div>
  )
}

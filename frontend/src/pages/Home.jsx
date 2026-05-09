import { useEffect } from 'react'
import { useMotionValue } from 'framer-motion'
import HeroLeft from '../components/HeroLeft'
import HeroRight from '../components/HeroRight'

export default function Home() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth - 0.5)
      mouseY.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <main className="hero-container">
      <HeroLeft />
      <HeroRight mouseX={mouseX} mouseY={mouseY} />
    </main>
  )
}

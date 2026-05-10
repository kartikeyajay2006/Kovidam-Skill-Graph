import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Scale, Zap } from 'lucide-react';
import './WhyKovidam.css';

const features = [
  {
    title: "Beyond Keywords.",
    highlight: "Deep Code Analysis",
    desc: "We don't just search for 'React' or 'Python' in a resume. Kovidam analyzes GitHub repositories, understands architectural choices, and evaluates actual code quality to uncover true engineering talent.",
    icon: <Code2 size={48} strokeWidth={1.5} />,
    color: "rgba(79, 70, 229, 0.2)",
    borderColor: "rgba(79, 70, 229, 0.5)"
  },
  {
    title: "Zero Bias.",
    highlight: "Objective Evaluation",
    desc: "Eliminate human bias from the top of your funnel. Our AI evaluates pure technical capability and behavioral traits blindly, ensuring a perfectly level playing field for every single candidate.",
    icon: <Scale size={48} strokeWidth={1.5} />,
    color: "rgba(124, 58, 237, 0.2)",
    borderColor: "rgba(124, 58, 237, 0.5)"
  },
  {
    title: "Instant Clarity.",
    highlight: "Curated Shortlists",
    desc: "Stop wasting weeks on manual screening. Get a highly curated list of the top 1% candidates within minutes, complete with deep technical insights, evidence-based scoring, and interview guides.",
    icon: <Zap size={48} strokeWidth={1.5} />,
    color: "rgba(56, 189, 248, 0.2)",
    borderColor: "rgba(56, 189, 248, 0.5)"
  }
];

export default function WhyKovidam({ x }) {
  return (
    <div className="why-content-wrapper" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingTop: '140px' }}>
      
      {/* Fixed Header */}
      <div className="why-fixed-header" style={{ padding: '0 8vw', marginBottom: '8vh' }}>
        <h2 
          className="section-title" 
          style={{ 
            fontSize: '4rem', 
            textAlign: 'left', 
            margin: 0,
            background: 'linear-gradient(90deg, #fff, #888)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Why Kovidam?
        </h2>
      </div>

      {/* Scrolling Track */}
      <div className="why-track-viewport" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <motion.div 
          className="why-cards-track" 
          style={{ 
            x, 
            display: 'flex', 
            gap: '8vw', 
            paddingLeft: '8vw',
            paddingRight: '8vw',
            width: '300vw' 
          }}
        >
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="premium-feature-card"
              style={{
                width: '80vw',
                maxWidth: '900px',
                height: '45vh',
                minHeight: '380px',
                flexShrink: 0,
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(30px)',
                border: `1px solid ${feature.borderColor}`,
                borderRadius: '30px',
                padding: '50px 60px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: `0 30px 60px rgba(0,0,0,0.4), inset 0 0 40px ${feature.color}`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative background glow */}
              <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '300px',
                height: '300px',
                background: feature.color,
                filter: 'blur(100px)',
                borderRadius: '50%',
                zIndex: 0
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: '70px', 
                  height: '70px', 
                  borderRadius: '18px', 
                  background: 'rgba(255,255,255,0.05)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginBottom: '30px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff'
                }}>
                  {feature.icon}
                </div>
                
                {/* Wrapped H3 to prevent text overflow layout issues */}
                <h3 style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 15px 0', color: '#fff', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span>{feature.title}</span>
                  <span style={{ color: 'var(--accent-indigo)', fontSize: '2rem' }}>{feature.highlight}</span>
                </h3>
                
                <p style={{ fontSize: '1.2rem', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '90%' }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

    </div>
  );
}

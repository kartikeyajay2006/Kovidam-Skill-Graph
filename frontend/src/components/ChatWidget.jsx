import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles } from 'lucide-react'
import './ChatWidget.css'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="chat-widget-container">
      <motion.div 
        className="chat-tooltip glass-panel"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: isOpen ? 0 : 1, x: isOpen ? 20 : 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <span>Ask Kovidam AI</span>
      </motion.div>
      
      <motion.button 
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles size={24} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="chat-window glass-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <div className="chat-header">
              <div className="chat-header-title">
                <Sparkles size={16} className="text-indigo" />
                <span>Kovidam Assistant</span>
              </div>
              <button className="close-btn" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="chat-body">
              <div className="chat-message bot-message">
                Hello. I can help you analyze candidate skill graphs or answer questions about our shortlisting engine. How can I assist you today?
              </div>
            </div>
            <div className="chat-input-area">
              <input type="text" placeholder="Type your message..." className="chat-input" />
              <button className="chat-send-btn">
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

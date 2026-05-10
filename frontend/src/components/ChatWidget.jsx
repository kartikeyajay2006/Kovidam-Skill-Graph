import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, Mic } from 'lucide-react'
import './ChatWidget.css'

const initialMessages = [
  {
    role: 'bot',
    text: 'Hello! I am Kovidm AI. I solve doubts in easy human language. Choose an option, or type/voice your question.',
    options: ['Upload resume help', 'How shortlist works', 'Required skills tips', 'Talk to Kovidm AI'],
  },
]

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState(initialMessages)

  const sendMessage = async ({ message = '', selectedOption = '' } = {}) => {
    const trimmed = message.trim()
    if (!trimmed && !selectedOption) return

    if (selectedOption) {
      setMessages((prev) => [...prev, { role: 'user', text: selectedOption }])
    } else {
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    }

    setInput('')
    setIsLoading(true)
    try {
      const response = await fetch('/chat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          selected_option: selectedOption || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Chat API failed')
      }

      const data = await response.json()
      const responseText = data.reply || 'Sorry, I could not reply right now.'
      const wantsFreshStart = responseText.toLowerCase().includes('start fresh')
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: responseText,
          options: wantsFreshStart
            ? ['Start new chat']
            : (Array.isArray(data.quick_options) ? data.quick_options : []),
        },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'Sorry, chat is not available right now. Please try again.',
          options: ['Start new chat'],
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition || isListening) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    setIsListening(true)
    recognition.start()

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || ''
      if (transcript.trim()) {
        void sendMessage({ message: transcript })
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }
  }

  const handleToggle = () => {
    setIsOpen((prev) => {
      if (prev) {
        setMessages(initialMessages)
        setInput('')
      }
      return !prev
    })
  }

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
        onClick={handleToggle}
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
              <button className="close-btn" onClick={handleToggle}>
                <X size={20} />
              </button>
            </div>
            <div className="chat-body">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`chat-message ${message.role}-message`}>
                  {message.text}
                  {message.role === 'bot' && Array.isArray(message.options) && message.options.length > 0 && (
                    <div className="quick-options">
                      {message.options.map((option) => (
                        <button
                          key={option}
                          className="quick-option-btn"
                          onClick={() => void sendMessage({ selectedOption: option })}
                          disabled={isLoading}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && <div className="chat-message bot-message">Typing...</div>}
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                placeholder="Type your message..."
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    void sendMessage({ message: input })
                  }
                }}
                disabled={isLoading}
              />
              <button
                className={`chat-voice-btn ${isListening ? 'listening' : ''}`}
                onClick={startVoiceInput}
                disabled={isLoading}
                title="Voice input"
              >
                <Mic size={16} />
              </button>
              <button
                className="chat-send-btn"
                onClick={() => void sendMessage({ message: input })}
                disabled={isLoading}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

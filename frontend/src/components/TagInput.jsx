import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { COMMON_SKILLS } from '../constants/commonSkills';

export default function TagInput({ 
  tags, 
  setTags, 
  placeholder = "Add skill...", 
  icon: Icon, 
  borderColor = "rgba(255, 255, 255, 0.1)",
  focusColor = "rgba(79, 70, 229, 0.5)",
  glowColor = "rgba(79, 70, 229, 0.15)",
  iconColor = "#818cf8"
}) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Filter suggestions when input changes
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    
    const term = inputValue.toLowerCase();
    const filtered = COMMON_SKILLS.filter(skill => 
      skill.toLowerCase().includes(term) && 
      !tags.some(tag => tag.toLowerCase() === skill.toLowerCase())
    ).slice(0, 5); // Max 5 suggestions
    
    setSuggestions(filtered);
  }, [inputValue, tags]);

  const addTag = (tagText) => {
    const trimmed = tagText.trim();
    if (trimmed && !tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setTags([...tags, trimmed]);
    }
    setInputValue('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      // If there's an exact match in suggestions or just taking top suggestion if user pressed enter quickly
      if (suggestions.length > 0 && e.key === 'Enter') {
        addTag(suggestions[0]);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="premium-input-group" style={{ position: 'relative' }}>
      <div 
        onClick={() => inputRef.current?.focus()}
        style={{
          width: '100%',
          minHeight: '52px',
          padding: '0.5rem 1rem 0.5rem 2.8rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${isFocused ? focusColor : borderColor}`,
          boxShadow: isFocused ? `0 0 0 3px ${glowColor}` : 'none',
          borderRadius: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
          cursor: 'text',
          transition: 'all 0.3s ease'
        }}
      >
        {Icon && (
          <div style={{ position: 'absolute', left: '1rem', top: '16px', color: isFocused ? iconColor : '#64748b', transition: 'color 0.3s ease' }}>
            <Icon size={18} />
          </div>
        )}

        <AnimatePresence>
          {tags.map((tag, index) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '0.3rem 0.6rem 0.3rem 0.8rem',
                borderRadius: '100px',
                fontSize: '0.85rem',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  borderRadius: '50%'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#fca5a5'}
                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay blur to allow clicking suggestions
            setTimeout(() => setIsFocused(false), 200);
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          style={{
            flex: 1,
            minWidth: '120px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'white',
            fontSize: '0.95rem',
            padding: '0.2rem 0'
          }}
        />
      </div>

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {isFocused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: 0,
              right: 0,
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '0.5rem',
              zIndex: 50,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                onClick={() => addTag(suggestion)}
                style={{
                  padding: '0.6rem 1rem',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  background: index === 0 ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.25)'}
                onMouseOut={(e) => e.currentTarget.style.background = index === 0 ? 'rgba(79, 70, 229, 0.15)' : 'transparent'}
              >
                {suggestion}
                {index === 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#64748b' }}>Press Enter</span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

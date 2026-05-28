import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Zap, Target, Award, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import TagInput from '../components/TagInput';

import { authFetch } from '../utils/api';

export default function SemanticSearchPage() {
  const [querySkills, setQuerySkills] = useState([]);
  const [formData, setFormData] = useState({
    top_k: 20,
    min_score: 0.0,
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setSelectedCandidateIndex(null);

    const data = new FormData();
    data.append('query_skills_csv', querySkills.join(','));
    data.append('top_k', formData.top_k);
    data.append('min_score', formData.min_score);

    try {
      const response = await authFetch(`/hiring/semantic-search`, {
        method: 'POST',
        body: data,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error performing search');
      }
      const json = await response.json();
      setResults(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setResults(null);
    setError(null);
    setSelectedCandidateIndex(null);
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  };

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      width: '100%',
      zIndex: 10,
      height: '100%'
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', height: '100%' }}>
        
        {/* Left Sidebar: Form Area */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Search size={20} color="#818cf8" />
              Semantic Search
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Find candidates by semantic skill matching.</p>
          </div>
          
          <div className="premium-input-group" style={{ zIndex: 20 }}>
            <label style={labelStyle}>Query Skills</label>
            <TagInput 
              tags={querySkills} 
              setTags={setQuerySkills} 
              placeholder="e.g. react, python"
              icon={Star}
            />
          </div>

          <div className="premium-input-group">
            <label style={labelStyle}>Top K Results</label>
            <Target className="premium-input-icon" />
            <input 
              type="number" 
              name="top_k" 
              value={formData.top_k} 
              onChange={handleInputChange} 
              min="1"
              className="premium-input" 
            />
          </div>

          <div className="premium-input-group">
            <label style={labelStyle}>Minimum Score</label>
            <Award className="premium-input-icon" />
            <input 
              type="number" 
              step="0.01" 
              name="min_score" 
              value={formData.min_score} 
              onChange={handleInputChange} 
              min="0"
              max="100"
              className="premium-input" 
            />
          </div>

          <div style={{ flex: 1 }} />

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', marginBottom: '1rem' }}
              >
                <XCircle size={20} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={loading || querySkills.length === 0}
            className="btn-premium btn-primary"
            style={{ 
              width: '100%',
              height: '60px',
              fontSize: '1.15rem',
              fontWeight: '600',
              display: 'flex',
              justifyContent: 'center',
              gap: '0.75rem',
              background: (loading || querySkills.length === 0) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              cursor: (loading || querySkills.length === 0) ? 'not-allowed' : 'pointer',
              marginTop: 'auto'
            }}
          >
            <Zap size={22} />
            {loading ? 'Searching...' : 'Run Search'}
          </motion.button>
        </div>

        {/* Right Main Area: Results */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 color="#34d399" size={24} />
                Search Results
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
                {results ? `Found ${results.hits?.length || 0} candidates` : 'Enter skills to perform a semantic search against the candidate pool.'}
              </p>
            </div>
            {results && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleStartOver}
                className="btn-premium"
                style={{ 
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem'
                }}
              >
                <RotateCcw size={16} />
                Clear
              </motion.button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '300px' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(79, 70, 229, 0.2)', borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#818cf8', borderRightColor: '#818cf8', borderRadius: '50%', animation: 'spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite' }} />
                  <div style={{ position: 'absolute', inset: '15px', border: '3px solid transparent', borderBottomColor: '#c7d2fe', borderLeftColor: '#c7d2fe', borderRadius: '50%', animation: 'spin 2s linear infinite reverse' }} />
                  <Zap size={24} color="#818cf8" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: 'pulse 2s infinite' }} />
                </div>
                <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Querying semantic index...</p>
                <style>{`
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                `}</style>
              </div>
            ) : results && results.hits?.length > 0 ? (
              results.hits.map((c, idx) => (
                <React.Fragment key={idx}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                  style={{ 
                    padding: '1.25rem', 
                    borderBottom: selectedCandidateIndex === idx ? 'none' : '1px solid rgba(255,255,255,0.05)', 
                    display: 'grid', 
                    gridTemplateColumns: '40px 1.5fr 1fr 1fr', 
                    gap: '1rem', 
                    alignItems: 'center', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: selectedCandidateIndex === idx ? '12px 12px 0 0' : '12px' 
                  }}
                >
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: idx === 0 ? '#facc15' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#b45309' : '#64748b' }}>
                    #{idx + 1}
                  </div>
                  
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.filename}>
                      {c.filename ? c.filename.replace(/\.[^/.]+$/, "") : 'Unknown'}
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ 
                        padding: '0.1rem 0.5rem', 
                        borderRadius: '999px', 
                        fontSize: '0.7rem', 
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        background: c.relevance_band === 'high' ? 'rgba(52, 211, 153, 0.15)' : c.relevance_band === 'medium' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                        color: c.relevance_band === 'high' ? '#34d399' : c.relevance_band === 'medium' ? '#fbbf24' : '#f87171',
                        border: `1px solid ${c.relevance_band === 'high' ? 'rgba(52, 211, 153, 0.3)' : c.relevance_band === 'medium' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
                      }}>
                        {c.relevance_band || 'low'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                      <span style={{ color: '#94a3b8' }}>Fit Score</span>
                      <span style={{ fontWeight: '600', color: '#f8fafc' }}>{(c.score_100 || 0).toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${c.score_100 || 0}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ 
                          height: '100%', 
                          background: (c.score_100 || 0) >= 75 ? 'linear-gradient(90deg, #34d399, #10b981)' : 
                                      (c.score_100 || 0) >= 45 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 
                                      'linear-gradient(90deg, #f87171, #ef4444)'
                        }} 
                      />
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setSelectedCandidateIndex(selectedCandidateIndex === idx ? null : idx); }}
                      className="btn-premium" style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem' }}
                    >
                      {selectedCandidateIndex === idx ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </motion.div>

                <AnimatePresence>
                  {selectedCandidateIndex === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', padding: '0', background: 'rgba(0,0,0,0.25)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none', marginBottom: '1rem' }}
                    >
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #818cf8' }}>
                          <div style={{ background: '#818cf8', color: '#fff', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '1.2rem' }}>
                            {(c.score_100 || 0).toFixed(1)}%
                          </div>
                          <div>
                            <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>Semantic Match Score</h4>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>This score represents the conceptual match between the candidate's skills and your search query.</p>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                          <div>
                            <h4 style={{ color: '#818cf8', marginBottom: '1rem', marginTop: 0, fontSize: '1rem' }}>Matched Query Tokens ({c.matched_query_count || 0})</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {c.matched_query_tokens?.length > 0 ? c.matched_query_tokens.map((token, tIdx) => (
                                <span key={tIdx} style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', color: '#6ee7b7' }}>
                                  {token}
                                </span>
                              )) : <span style={{ color: '#64748b', fontSize: '0.9rem' }}>No direct query matches found.</span>}
                            </div>
                          </div>
                          
                          <div>
                            <h4 style={{ color: '#818cf8', marginBottom: '1rem', marginTop: 0, fontSize: '1rem' }}>Score Breakdown</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', fontSize: '1rem' }}>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                <span style={{ color: '#94a3b8' }}>GitHub Score</span>
                                <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{(c.github_score_100 || 0).toFixed(1)}%</span>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                <span style={{ color: '#94a3b8' }}>Skills Match</span>
                                <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{(c.skills_match_score_100 || 0).toFixed(1)}%</span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                <span style={{ color: '#94a3b8' }}>Platform Strength</span>
                                <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{(c.platform_strength_score_100 || 0).toFixed(1)}%</span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                <span style={{ color: '#94a3b8' }}>Project Evidence</span>
                                <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{(c.project_evidence_score_100 || 0).toFixed(1)}%</span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                <span style={{ color: '#94a3b8' }}>Profile Completeness</span>
                                <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{(c.profile_completeness_score_100 || 0).toFixed(1)}%</span>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                <span style={{ color: '#94a3b8' }}>Experience</span>
                                <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{(c.experience_years || 0).toFixed(1)} Yrs</span>
                              </div>

                            </div>
                          </div>
                        </div>
                        
                        <h4 style={{ color: '#818cf8', marginBottom: '1rem', marginTop: 0, fontSize: '1rem' }}>Candidate Skills Preview (Total: {c.skills_total || 0})</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {c.skills_preview?.length > 0 ? c.skills_preview.map((token, tIdx) => (
                            <span key={tIdx} style={{ background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                              {token}
                            </span>
                          )) : <span style={{ color: '#64748b', fontSize: '0.9rem' }}>No skills extracted.</span>}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                </React.Fragment>
              ))
            ) : results && results.hits?.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
                No candidates matched your query.
              </div>
            ) : null}
          </div>
        </div>

      </form>
    </div>
  );
}

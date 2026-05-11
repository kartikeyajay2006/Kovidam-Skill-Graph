import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Star, 
  Users,
  ArrowLeft,
  Activity
} from 'lucide-react';

export default function PastShortlistPage() {
  const { traceId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(null);
  const targetHeadcount = 3; // Default or fetched from config

  useEffect(() => {
    setLoading(true);
    fetch(`/hiring/shortlist/${traceId}`)
      .then(res => {
        if (!res.ok) throw new Error('Shortlist not found');
        return res.json();
      })
      .then(data => {
        setResults(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [traceId]);

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '500px', background: 'rgba(12, 12, 18, 0.4)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '2.5rem' }}>
          <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(79, 70, 229, 0.2)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: '#818cf8', borderRightColor: '#818cf8', borderRadius: '50%', animation: 'spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite' }} />
          <div style={{ position: 'absolute', inset: '20px', border: '4px solid transparent', borderBottomColor: '#c7d2fe', borderLeftColor: '#c7d2fe', borderRadius: '50%', animation: 'spin 2s linear infinite reverse' }} />
          <Activity size={32} color="#818cf8" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: 'pulse 2s infinite' }} />
        </div>
        <h3 style={{ fontSize: '1.5rem', color: '#e2e8f0', marginBottom: '0.75rem', fontWeight: '600' }}>Loading Results</h3>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Retrieving historical shortlist data...</p>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '500px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <XCircle size={64} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h3 style={{ color: '#f8fafc', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Could not load shortlist</h3>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>{error}</p>
        <button className="btn-premium" onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Back to Hub
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1rem 0' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity color="#818cf8" /> Past Shortlist Results
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8' }}>ID: {traceId}</p>
        </div>
        <button 
          className="btn-premium" 
          onClick={() => navigate('/dashboard')}
          style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={18} /> Hub
        </button>
      </div>

      {results && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
        >
          {/* Shortlisted List */}
          <motion.div variants={itemVariants} className="glass-panel" style={{ borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 color="#34d399" size={28} />
                Shortlisted Candidates
              </h3>
              <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '1rem', fontWeight: '600' }}>
                {results.counts?.ranked || 0} Found
              </span>
            </div>
            
            {results.shortlisted?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(() => {
                  const topCandidates = results.shortlisted.slice(0, targetHeadcount);
                  const otherCandidates = results.shortlisted.slice(targetHeadcount);
                  
                  return (
                    <>
                      {topCandidates.length > 0 && (
                        <div style={{ padding: '2rem 2rem 1rem 2rem', background: 'rgba(79, 70, 229, 0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <h4 style={{ margin: 0, color: '#facc15', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Star size={20} fill="#facc15" />
                            Top {topCandidates.length} Candidates
                          </h4>
                        </div>
                      )}

                      {topCandidates.map((c, idx) => (
                        <React.Fragment key={idx}>
                          <motion.div 
                            whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                            style={{ padding: '1.75rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '70px 2fr 1.5fr 1fr', gap: '2rem', alignItems: 'center' }}
                          >
                            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: idx === 0 ? '#facc15' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#b45309' : '#64748b' }}>
                              #{c.rank}
                            </div>
                            
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.filename.replace(/\.[^/.]+$/, "")}
                              </h4>
                              <div style={{ fontSize: '0.95rem', color: '#94a3b8', display: 'flex', gap: '1.25rem' }}>
                                <span>{c.experience?.candidate_years?.toFixed(1) || 0} Years Exp</span>
                                {c.experience?.meets_min_experience && <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Meets Exp</span>}
                              </div>
                            </div>
                            
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1rem' }}>
                                <span style={{ color: '#94a3b8' }}>Fit Score</span>
                                <span style={{ fontWeight: '600', color: '#f8fafc' }}>{c.fit_score_100?.toFixed(1)}%</span>
                              </div>
                              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${c.fit_score_100}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  style={{ 
                                    height: '100%', 
                                    background: c.fit_score_100 > 80 ? 'linear-gradient(90deg, #34d399, #10b981)' : 
                                                c.fit_score_100 > 60 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 
                                                'linear-gradient(90deg, #818cf8, #4f46e5)'
                                  }} 
                                />
                              </div>
                            </div>
                            
                            <div style={{ textAlign: 'right' }}>
                              <button 
                                onClick={() => setSelectedCandidateIndex(selectedCandidateIndex === idx ? null : idx)}
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
                                style={{ overflow: 'hidden', padding: '0 2rem' }}
                              >
                                <div style={{ padding: '2rem', background: 'rgba(0,0,0,0.25)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none', marginBottom: '1.5rem' }}>
                                  <h4 style={{ color: '#818cf8', marginBottom: '1.5rem', marginTop: 0, fontSize: '1.1rem' }}>Score Breakdown</h4>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '1rem' }}>
                                    {c.ranking_decision_log?.candidate_metrics && Object.entries(c.ranking_decision_log.candidate_metrics).map(([key, value]) => {
                                        if (typeof value !== 'number') return null;
                                        let formattedKey = key.replace('_score_100', '').replace('_100', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                        return (
                                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                            <span style={{ color: '#94a3b8' }}>{formattedKey}</span>
                                            <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{value.toFixed(1)}%</span>
                                          </div>
                                        );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))}

                      {otherCandidates.length > 0 && (
                        <>
                          <div style={{ padding: '2rem 2rem 1rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '2px dashed rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Users size={20} color="#818cf8" />
                              Other Qualified Candidates ({otherCandidates.length})
                            </h4>
                          </div>

                          {otherCandidates.map((c, idx) => {
                            const realIdx = idx + targetHeadcount;
                            return (
                              <React.Fragment key={realIdx}>
                                <motion.div 
                                  whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                                  style={{ padding: '1.75rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '70px 2fr 1.5fr 1fr', gap: '2rem', alignItems: 'center', opacity: 0.8 }}
                                >
                                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#64748b' }}>
                                    #{c.rank}
                                  </div>
                                  
                                  <div style={{ minWidth: 0 }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {c.filename.replace(/\.[^/.]+$/, "")}
                                    </h4>
                                    <div style={{ fontSize: '0.95rem', color: '#94a3b8', display: 'flex', gap: '1.25rem' }}>
                                      <span>{c.experience?.candidate_years?.toFixed(1) || 0} Years Exp</span>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1rem' }}>
                                      <span style={{ color: '#94a3b8' }}>Fit Score</span>
                                      <span style={{ fontWeight: '600', color: '#f8fafc' }}>{c.fit_score_100?.toFixed(1)}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${c.fit_score_100}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        style={{ height: '100%', background: 'linear-gradient(90deg, #64748b, #94a3b8)' }} 
                                      />
                                    </div>
                                  </div>
                                  
                                  <div style={{ textAlign: 'right' }}>
                                    <button 
                                      onClick={() => setSelectedCandidateIndex(selectedCandidateIndex === realIdx ? null : realIdx)}
                                      className="btn-premium" style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem' }}
                                    >
                                      {selectedCandidateIndex === realIdx ? 'Hide Details' : 'View Details'}
                                    </button>
                                  </div>
                                </motion.div>

                                <AnimatePresence>
                                  {selectedCandidateIndex === realIdx && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      style={{ overflow: 'hidden', padding: '0 2rem' }}
                                    >
                                      <div style={{ padding: '2rem', background: 'rgba(0,0,0,0.25)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none', marginBottom: '1.5rem' }}>
                                        <h4 style={{ color: '#818cf8', marginBottom: '1.5rem', marginTop: 0, fontSize: '1.1rem' }}>Score Breakdown</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '1rem' }}>
                                          {c.ranking_decision_log?.candidate_metrics && Object.entries(c.ranking_decision_log.candidate_metrics).map(([key, value]) => {
                                              if (typeof value !== 'number') return null;
                                              let formattedKey = key.replace('_score_100', '').replace('_100', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                              return (
                                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                                  <span style={{ color: '#94a3b8' }}>{formattedKey}</span>
                                                  <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{value.toFixed(1)}%</span>
                                                </div>
                                              );
                                          })}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </React.Fragment>
                            );
                          })}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div style={{ padding: '5rem 2rem', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>
                No candidates met the minimum criteria.
              </div>
            )}
          </motion.div>

          {/* Rejected List */}
          {results.rejected?.length > 0 && (
            <motion.div variants={itemVariants} className="glass-panel" style={{ borderRadius: '24px', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <XCircle size={24} />
                  Filtered Candidates
                </h3>
                <span style={{ color: '#ef4444', fontSize: '1rem', fontWeight: '600' }}>
                  {results.counts?.rejected || 0} Rejected
                </span>
              </div>
              <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column' }}>
                {results.rejected.map((c, idx) => {
                  const realIdx = idx + targetHeadcount + (results.shortlisted?.length || 0);
                  return (
                    <React.Fragment key={realIdx}>
                      <motion.div 
                        whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                        style={{ padding: '1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '70px 2fr 1.5fr 1fr', gap: '2rem', alignItems: 'center', opacity: 0.7 }}
                      >
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#64748b' }}>
                          <XCircle size={28} color="#ef4444" />
                        </div>
                        
                        <div style={{ minWidth: 0 }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.filename.replace(/\.[^/.]+$/, "")}
                          </h4>
                          <div style={{ fontSize: '0.95rem', color: '#fca5a5', display: 'flex', gap: '1.25rem' }}>
                            <span>{c.rejection_reasons?.[0] || 'Unfit profile'}</span>
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1rem' }}>
                            <span style={{ color: '#94a3b8' }}>Fit Score</span>
                            <span style={{ fontWeight: '600', color: '#fca5a5' }}>{c.fit_score_100?.toFixed(1)}%</span>
                          </div>
                          <div style={{ width: '100%', height: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${c.fit_score_100}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              style={{ height: '100%', background: 'linear-gradient(90deg, #ef4444, #fca5a5)' }} 
                            />
                          </div>
                        </div>
                        
                        <div style={{ textAlign: 'right' }}>
                          <button 
                            onClick={() => setSelectedCandidateIndex(selectedCandidateIndex === realIdx ? null : realIdx)}
                            className="btn-premium" style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                          >
                            {selectedCandidateIndex === realIdx ? 'Hide Details' : 'View Details'}
                          </button>
                        </div>
                      </motion.div>

                      <AnimatePresence>
                        {selectedCandidateIndex === realIdx && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.05)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)', borderTop: 'none', marginBottom: '1.5rem' }}>
                              <h4 style={{ color: '#fca5a5', marginBottom: '1.5rem', marginTop: 0, fontSize: '1.1rem' }}>Score Breakdown</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '1rem' }}>
                                {c.ranking_decision_log?.candidate_metrics && Object.entries(c.ranking_decision_log.candidate_metrics).map(([key, value]) => {
                                    if (typeof value !== 'number' && typeof value !== 'string') return null;
                                    let formattedKey = key.replace('_score_100', '').replace('_100', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                    let displayValue = typeof value === 'number' ? value.toFixed(1) : String(value);
                                    if (typeof value === 'number' && key.includes('score_100')) {
                                      displayValue += '%';
                                    } else if (key.includes('years')) {
                                      displayValue += ' Yrs';
                                    }
                                    return (
                                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                        <span style={{ color: '#94a3b8' }}>{formattedKey}</span>
                                        <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{displayValue}</span>
                                      </div>
                                    );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

import React, { useState } from 'react';

export default function SemanticSearchPage() {
  const [formData, setFormData] = useState({
    query_skills_csv: '',
    top_k: 20,
    min_score: 0.0,
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    const data = new FormData();
    data.append('query_skills_csv', formData.query_skills_csv);
    data.append('top_k', formData.top_k);
    data.append('min_score', formData.min_score);

    try {
      const response = await fetch('/hiring/semantic-search', {
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

  return (
    <div style={{ padding: '2rem', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', background: 'linear-gradient(90deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Semantic Talent Search
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Form Section */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Query Skills (CSV) *</label>
              <input 
                type="text" 
                name="query_skills_csv" 
                value={formData.query_skills_csv} 
                onChange={handleInputChange} 
                required 
                placeholder="e.g. react, nodejs, machine learning"
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} 
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Top K Results</label>
                <input 
                  type="number" 
                  name="top_k" 
                  value={formData.top_k} 
                  onChange={handleInputChange} 
                  min="1"
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Minimum Score</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="min_score" 
                  value={formData.min_score} 
                  onChange={handleInputChange} 
                  min="0"
                  max="100"
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} 
                />
              </div>
            </div>

            <button type="submit" disabled={loading || !formData.query_skills_csv.trim()} style={{ marginTop: '1rem', padding: '0.75rem', background: loading ? '#555' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '4px', cursor: (loading || !formData.query_skills_csv.trim()) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Searching...' : 'Run Search'}
            </button>
          </form>
          {error && <div style={{ marginTop: '1rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '4px' }}>{error}</div>}
        </div>

        {/* Results Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {!results && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              Enter skills to perform a semantic search against the candidate pool.
            </div>
          )}
          
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ opacity: 0.7 }}>Querying semantic index...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            </div>
          )}

          {results && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: 0 }}>Search Results ({results.hits?.length || 0})</h3>
              </div>
              
              {results.hits?.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', opacity: 0.7, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '1rem 1.5rem' }}>Candidate</th>
                      <th style={{ padding: '1rem 1.5rem' }}>Semantic Fit Score</th>
                      <th style={{ padding: '1rem 1.5rem' }}>Relevance Band</th>
                      <th style={{ padding: '1rem 1.5rem' }}>Matched Skills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.hits.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '1.05rem' }}>{c.filename ? c.filename.replace(/\.[^/.]+$/, "") : 'Unknown Candidate'}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.75em', color: '#64748b', marginTop: '0.25rem' }}>
                            {c.resume_hash || c.id}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: c.score_100 >= 75 ? '#34d399' : c.score_100 >= 45 ? '#fbbf24' : '#f87171' }}>{(c.score_100 || 0).toFixed(1)}</span>
                            <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${c.score_100 || 0}%`, background: c.score_100 >= 75 ? '#34d399' : c.score_100 >= 45 ? '#fbbf24' : '#f87171' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '999px', 
                            fontSize: '0.8rem', 
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            background: c.relevance_band === 'high' ? 'rgba(52, 211, 153, 0.15)' : c.relevance_band === 'medium' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                            color: c.relevance_band === 'high' ? '#34d399' : c.relevance_band === 'medium' ? '#fbbf24' : '#f87171',
                            border: `1px solid ${c.relevance_band === 'high' ? 'rgba(52, 211, 153, 0.3)' : c.relevance_band === 'medium' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
                          }}>
                            {c.relevance_band || 'low'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {c.matched_query_tokens?.map((token, tIdx) => (
                              <span key={tIdx} style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem', color: '#d8b4fe' }}>
                                {token}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No candidates matched your query.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

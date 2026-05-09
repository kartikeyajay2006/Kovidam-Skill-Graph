import React, { useState } from 'react';

export default function ShortlistPage() {
  const [formData, setFormData] = useState({
    role: 'internship',
    company_name: 'Kovidam',
    position_title: 'Software Engineer',
    required_skills_csv: 'python, react, javascript',
    must_have_skills_csv: '',
    job_description: '',
    min_experience_years: 0,
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    const data = new FormData();
    for (const key in formData) {
      data.append(key, formData[key]);
    }
    files.forEach((file) => {
      data.append('files', file);
    });

    try {
      const response = await fetch('/hiring/shortlist', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error processing request');
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
        AI Shortlisting Engine
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Form Section */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Resumes (PDFs)</label>
              <input type="file" multiple onChange={handleFileChange} required style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Role Type</label>
                <select name="role" value={formData.role} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                  <option value="internship">Internship</option>
                  <option value="job">Job</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Min Experience (Yrs)</label>
                <input type="number" step="0.1" name="min_experience_years" value={formData.min_experience_years} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Company Name</label>
                <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Position Title</label>
                <input type="text" name="position_title" value={formData.position_title} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Required Skills (CSV)</label>
              <input type="text" name="required_skills_csv" value={formData.required_skills_csv} onChange={handleInputChange} required style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Must Have Skills (CSV, optional)</label>
              <input type="text" name="must_have_skills_csv" value={formData.must_have_skills_csv} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Job Description (Optional)</label>
              <textarea name="job_description" value={formData.job_description} onChange={handleInputChange} rows={4} style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: '1rem', padding: '0.75rem', background: loading ? '#555' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Processing...' : 'Run Engine'}
            </button>
          </form>
          {error && <div style={{ marginTop: '1rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '4px' }}>{error}</div>}
        </div>

        {/* Results Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {!results && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              Configure your job profile and upload resumes to see results.
            </div>
          )}
          
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ opacity: 0.7 }}>Analyzing candidates with AI...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            </div>
          )}

          {results && (
            <>
              {/* Insights */}
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h3 style={{ marginBottom: '1rem', color: '#60a5fa' }}>Top Insights</h3>
                <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {results.top_3_insights_from_ranking_decision_log?.map((insight, idx) => (
                    <li key={idx} style={{ color: 'rgba(255,255,255,0.9)' }}>{insight}</li>
                  ))}
                </ul>
              </div>

              {/* Shortlisted Table */}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                  <h3 style={{ margin: 0 }}>Shortlisted Candidates ({results.counts?.ranked || 0})</h3>
                </div>
                {results.shortlisted?.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', opacity: 0.7 }}>
                        <th style={{ padding: '1rem 1.5rem' }}>Rank</th>
                        <th style={{ padding: '1rem 1.5rem' }}>File</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Fit Score</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Experience</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.shortlisted.map((c, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem 1.5rem' }}>#{c.rank}</td>
                          <td style={{ padding: '1rem 1.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.filename}>{c.filename}</td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>{c.fit_score_100?.toFixed(1)}</span>
                              <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${c.fit_score_100}%`, background: '#3b82f6' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>{c.experience?.candidate_years?.toFixed(1) || 0} yrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No candidates shortlisted.</div>
                )}
              </div>

              {/* Rejected List */}
              {results.rejected?.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                    <h3 style={{ margin: 0, color: '#fca5a5' }}>Rejected Candidates ({results.counts?.rejected || 0})</h3>
                  </div>
                  <div style={{ padding: '1rem 1.5rem' }}>
                    <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {results.rejected.slice(0, 5).map((c, idx) => (
                        <li key={idx} style={{ opacity: 0.8 }}>
                          <strong>{c.filename}</strong>: {c.rejection_reasons?.[0] || 'Unknown reason'}
                        </li>
                      ))}
                      {results.rejected.length > 5 && <li style={{ opacity: 0.5 }}>...and {results.rejected.length - 5} more</li>}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

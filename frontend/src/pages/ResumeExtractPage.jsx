import React, { useState } from 'react';

export default function ResumeExtractPage() {
  const [files, setFiles] = useState([]);
  const [role, setRole] = useState('job');
  const [forceReprocess, setForceReprocess] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('role', role);
    formData.append('force_reprocess', forceReprocess);

    let url = '';
    
    if (files.length === 1) {
      url = '/resume/extract';
      formData.append('file', files[0]);
    } else {
      url = '/resume/extract/batch';
      files.forEach(file => formData.append('files', file));
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error extracting resumes');
      }

      const json = await response.json();
      setResults(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isBatch = results?.items !== undefined;
  // If it's a batch response, items is the array. If single, the whole result is the response.
  const resultList = isBatch ? results.items : (results ? [{ filename: files[0]?.name, ok: true, result: results }] : []);

  return (
    <div style={{ padding: '2rem', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', background: 'linear-gradient(90deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Resume Extraction
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Form Section */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', height: 'fit-content' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Resumes (PDF) *</label>
              <input 
                type="file" 
                multiple
                accept=".pdf"
                onChange={handleFileChange} 
                required 
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} 
              />
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>Select one or multiple PDF files.</p>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} 
              >
                <option value="job">Job</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="force_reprocess"
                checked={forceReprocess}
                onChange={(e) => setForceReprocess(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#8b5cf6' }}
              />
              <label htmlFor="force_reprocess" style={{ opacity: 0.8, cursor: 'pointer' }}>Force Reprocess (Skip Cache)</label>
            </div>

            <button type="submit" disabled={loading || files.length === 0} style={{ marginTop: '1rem', padding: '0.75rem', background: loading ? '#555' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '4px', cursor: (loading || files.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Extracting...' : `Extract ${files.length > 0 ? (files.length === 1 ? '1 Resume' : `${files.length} Resumes`) : ''}`}
            </button>
          </form>
          {error && <div style={{ marginTop: '1rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '4px' }}>{error}</div>}
        </div>

        {/* Results Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {!results && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              Upload resumes to extract candidate profiles.
            </div>
          )}
          
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ opacity: 0.7 }}>Parsing and extracting profiles...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            </div>
          )}

          {results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>Total Processed</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resultList.length}</div>
                </div>
                {isBatch && (
                  <>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>Successful</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>{resultList.filter(r => r.ok).length}</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>Failed</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>{resultList.filter(r => !r.ok).length}</div>
                    </div>
                  </>
                )}
              </div>

              {resultList.map((res, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {res.filename || res.file_id || 'Unknown File'}
                      <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '12px', background: res.ok ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: res.ok ? '#34d399' : '#f87171' }}>
                        {res.ok ? 'success' : 'error'}
                      </span>
                    </h3>
                  </div>
                  
                  <div style={{ padding: '1.5rem' }}>
                    {!res.ok ? (
                      <div style={{ color: '#f87171' }}>Error: {res.error}</div>
                    ) : (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                          <strong style={{ opacity: 0.7, display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Extracted Result JSON</strong>
                          <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem', margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                            {JSON.stringify(res.result || res, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


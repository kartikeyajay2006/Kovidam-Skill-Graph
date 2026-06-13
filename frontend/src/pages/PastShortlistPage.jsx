import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Star, 
  Users,
  ArrowLeft,
  Activity,
  FileText,
  Info,
  FilePlus,
  FileSpreadsheet,
  Mail,
  Phone
} from 'lucide-react';

import { authFetch } from '../utils/api';
import * as XLSX from 'xlsx';


export default function PastShortlistPage() {
  const { traceId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddMorePanel, setShowAddMorePanel] = useState(false);
  const [addMoreFiles, setAddMoreFiles] = useState([]);
  const [addMoreRequiredSkillsText, setAddMoreRequiredSkillsText] = useState('');
  const [addMoreMustHaveSkillsText, setAddMoreMustHaveSkillsText] = useState('');
  const [addMoreJobDescriptionText, setAddMoreJobDescriptionText] = useState('');
  const [addMoreLoading, setAddMoreLoading] = useState(false);
  const [addMoreError, setAddMoreError] = useState(null);
  const [addMoreProgress, setAddMoreProgress] = useState(null);
  const addMoreProgressTimerRef = useRef(null);
  const addMoreFileInputRef = useRef(null);
  const targetHeadcount = 3; // Default or fetched from config
  const addMoreFileInputId = 'add-more-resumes-input';

  const handleExportSheets = () => {
    if (!results || !results.shortlisted) return;
    const data = results.shortlisted.map((c) => ({
      "Rank": c.rank || "",
      "Candidate Name": c.filename ? c.filename.replace(/\.[^/.]+$/, "") : "Unknown",
      "Email": c.email || "N/A",
      "Phone Number": c.phone || "N/A",
      "Fit Score": c.fit_score_100 ? `${c.fit_score_100.toFixed(2)}%` : "0%",
      "Experience (Years)": c.experience?.candidate_years !== undefined ? c.experience.candidate_years.toFixed(1) : "0"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = [
      { wch: 6 },
      { wch: 30 },
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
      { wch: 20 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shortlisted Candidates");
    XLSX.writeFile(workbook, `shortlisted_candidates_${results.trace_id || 'export'}.xlsx`);
  };


  useEffect(() => {
    authFetch(`/hiring/shortlist/${traceId}`)
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

  const jobSummary = results?.job_summary || {};
  const hasReusableShortlistConfig =
    Array.isArray(jobSummary.required_skills) && jobSummary.required_skills.length > 0;
  const addMoreRequiredSkills = addMoreRequiredSkillsText
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
  const addMoreMustHaveSkills = addMoreMustHaveSkillsText
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
  const canSubmitAddMore = addMoreFiles.length > 0 && addMoreRequiredSkills.length > 0 && !addMoreLoading;

  const detailListStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.5rem'
  };

  const badgeStyle = {
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    fontSize: '0.85rem',
    lineHeight: 1.2
  };

  const handleAddMoreResumes = () => {
    const shortlistRerunContext = {
      source_trace_id: traceId,
      job_summary: jobSummary,
      shortlisted: results?.shortlisted || [],
      ranked_candidates: results?.ranked_candidates || [],
      counts: results?.counts || {},
    };

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('kovidam_shortlist_rerun_context', JSON.stringify(shortlistRerunContext));
    }

    navigate('/dashboard/shortlist', {
      state: { shortlistRerunContext },
    });
  };

  useEffect(() => {
    return () => {
      if (addMoreProgressTimerRef.current) {
        clearInterval(addMoreProgressTimerRef.current);
      }
    };
  }, []);

  const handleAddMoreFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setAddMoreFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
    e.target.value = '';
  };

  const removeAddMoreFile = (index) => {
    setAddMoreFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInlineReshortlist = async () => {
    const summary = results?.job_summary || {};
    if (!addMoreFiles.length) {
      setAddMoreError('Please add at least one resume before starting shortlisting.');
      return;
    }
    if (addMoreRequiredSkills.length === 0) {
      setAddMoreError('Please enter at least one required skill so the shortlist can be rerun.');
      return;
    }

    setAddMoreLoading(true);
    setAddMoreError(null);
    setAddMoreProgress(null);

    const clientTraceId = traceId;

    const data = new FormData();
    data.append('role', summary.role || 'job');
    data.append('company_name', summary.company_name || '');
    data.append('position_title', summary.position_title || '');
    data.append('required_skills_csv', addMoreRequiredSkills.join(','));
    data.append('must_have_skills_csv', addMoreMustHaveSkills.join(','));
    data.append('job_description', addMoreJobDescriptionText || summary.job_description || '');
    data.append('min_experience_years', String(summary.min_experience_years ?? 0));
    data.append('send_shortlist_emails', 'false');
    data.append('client_trace_id', clientTraceId);
    addMoreFiles.forEach((file) => data.append('files', file));

    const fetchProgress = async () => {
      try {
        const progressRes = await authFetch(`/hiring/shortlist/progress/${clientTraceId}`);
        if (!progressRes.ok) return;
        const progressJson = await progressRes.json();
        setAddMoreProgress(progressJson);
      } catch {
        // Best-effort progress only.
      }
    };

    await fetchProgress();
    if (addMoreProgressTimerRef.current) clearInterval(addMoreProgressTimerRef.current);
    addMoreProgressTimerRef.current = setInterval(fetchProgress, 1500);

    try {
      const response = await authFetch('/hiring/shortlist', {
        method: 'POST',
        body: data,
      });
      const rawBody = await response.text();
      let json = null;
      if (rawBody && rawBody.trim()) {
        try {
          json = JSON.parse(rawBody);
        } catch {
          throw new Error(`Server returned invalid JSON (status ${response.status})`);
        }
      }
      if (!response.ok) {
        const errorMessage =
          (json && (json.detail || json.message)) || rawBody || `Error processing request (${response.status})`;
        throw new Error(errorMessage);
      }
      if (!json) throw new Error('Server returned empty response');

      setResults(json);
      setSelectedCandidateIndex(null);
      setShowAddMorePanel(false);
      setAddMoreFiles([]);
      setAddMoreProgress(null);
    } catch (err) {
      setAddMoreError(err.message || 'Failed to re-run shortlist.');
    } finally {
      if (addMoreProgressTimerRef.current) {
        clearInterval(addMoreProgressTimerRef.current);
        addMoreProgressTimerRef.current = null;
      }
      setAddMoreLoading(false);
    }
  };

  if (loading || (!results && !error)) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            className="btn-premium"
            onClick={() => setShowDetailsModal(true)}
            style={{ padding: '0.75rem 1.25rem', background: 'rgba(129, 140, 248, 0.12)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileText size={18} /> View Shortlist Details
          </button>
          <button 
            className="btn-premium" 
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft size={18} /> Hub
          </button>
        </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '1rem', fontWeight: '600' }}>
                  {results.counts?.ranked || 0} Found
                </span>
                {results.shortlisted?.length > 0 && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportSheets}
                    className="btn-premium"
                    style={{ 
                      padding: '0.65rem 1rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34d399',
                      fontSize: '0.95rem'
                    }}
                  >
                    <FileSpreadsheet size={18} />
                    Export to Sheets
                  </motion.button>
                )}
                <button
                  type="button"
                  className="btn-premium"
                  onClick={handleAddMoreResumes}
                  style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(129, 140, 248, 0.12)' }}
                >
                  <FilePlus size={18} />
                  Add More Resumes
                </button>
              </div>

            </div>

            {typeof document !== 'undefined'
              ? createPortal(
                  <AnimatePresence>
                    {showAddMorePanel && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAddMorePanel(false)}
                        style={{
                          position: 'fixed',
                          inset: 0,
                          zIndex: 70,
                          background: 'rgba(2, 6, 23, 0.72)',
                          backdropFilter: 'blur(14px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1.25rem'
                        }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: 'min(100%, 860px)',
                            maxHeight: '88vh',
                            overflow: 'hidden',
                            borderRadius: '28px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(8, 11, 20, 0.98) 100%)',
                            boxShadow: '0 30px 100px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FilePlus size={18} color="#818cf8" />
                                Add more resumes with the same shortlist setup
                              </h4>
                              <p style={{ margin: '0.35rem 0 0 0', color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.45 }}>
                                This uses the same company, role, JD, required skills, and must-have skills from this shortlist.
                              </p>
                              {!hasReusableShortlistConfig && (
                                <p style={{ margin: '0.5rem 0 0 0', color: '#fbbf24', fontSize: '0.84rem', lineHeight: 1.4 }}>
                                  This is a legacy shortlist, so required skills are not saved yet. Fill them below once and the rerun will work from then on.
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn-premium"
                              onClick={() => {
                                setShowAddMorePanel(false);
                                setAddMoreFiles([]);
                                setAddMoreError(null);
                              }}
                              style={{ width: '40px', height: '40px', padding: 0, background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center' }}
                              aria-label="Close add more resumes popup"
                            >
                              <XCircle size={20} />
                            </button>
                          </div>

                          <div style={{ padding: '1rem 1.25rem 1.15rem 1.25rem' }}>
                            <input
                              id={addMoreFileInputId}
                              type="file"
                              multiple
                              accept=".pdf"
                              onChange={handleAddMoreFileChange}
                              ref={addMoreFileInputRef}
                              style={{ display: 'none' }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                <span style={badgeStyle}>{jobSummary.company_name || 'Company'}</span>
                                <span style={badgeStyle}>{jobSummary.position_title || 'Position'}</span>
                                <span style={badgeStyle}>{jobSummary.role || 'Role'}</span>
                                <span style={badgeStyle}>{Number(jobSummary.min_experience_years || 0).toFixed(1)} yrs min exp</span>
                              </div>
                              <button
                                type="button"
                                className="btn-premium"
                                onClick={() => addMoreFileInputRef.current?.click()}
                                style={{ padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                              >
                                <FileText size={18} />
                                Add Resumes
                              </button>
                            </div>

                            {!hasReusableShortlistConfig && (
                              <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.7rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>
                                      Required Skills
                                    </div>
                                    <input
                                      type="text"
                                      value={addMoreRequiredSkillsText}
                                      onChange={(e) => setAddMoreRequiredSkillsText(e.target.value)}
                                      placeholder="python, react, javascript"
                                      style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#e2e8f0',
                                        border: '1px solid rgba(129,140,248,0.25)',
                                        borderRadius: '12px',
                                        padding: '0.7rem 0.9rem',
                                        outline: 'none',
                                      }}
                                    />
                                  </div>
                                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>
                                      Must Have Skills
                                    </div>
                                    <input
                                      type="text"
                                      value={addMoreMustHaveSkillsText}
                                      onChange={(e) => setAddMoreMustHaveSkillsText(e.target.value)}
                                      placeholder="optional, comma-separated"
                                      style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#e2e8f0',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px',
                                        padding: '0.7rem 0.9rem',
                                        outline: 'none',
                                      }}
                                    />
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gap: '0.35rem' }}>
                                  <div style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>
                                    Job Description
                                  </div>
                                  <textarea
                                    value={addMoreJobDescriptionText}
                                    onChange={(e) => setAddMoreJobDescriptionText(e.target.value)}
                                    placeholder="Paste JD context here to improve semantic matching"
                                    rows={3}
                                    style={{
                                      width: '100%',
                                      resize: 'vertical',
                                      background: 'rgba(255,255,255,0.04)',
                                      color: '#e2e8f0',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      borderRadius: '12px',
                                      padding: '0.7rem 0.9rem',
                                      outline: 'none',
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.8rem' }}>
                              <div style={{
                                borderRadius: '16px',
                                border: '1px dashed rgba(129,140,248,0.35)',
                                background: 'rgba(0,0,0,0.18)',
                                padding: '0.9rem',
                                cursor: 'pointer',
                              }}>
                                <div onClick={() => addMoreFileInputRef.current?.click()}>
                                  {addMoreFiles.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                      <div style={{ color: '#c7d2fe', fontSize: '0.9rem', fontWeight: 600 }}>
                                        {addMoreFiles.length} resume{addMoreFiles.length !== 1 ? 's' : ''} selected
                                      </div>
                                      {addMoreFiles.map((file, idx) => (
                                        <div
                                          key={`${file.name}-${idx}`}
                                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.6rem 0.8rem' }}
                                        >
                                          <span style={{ color: '#e2e8f0', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                          <button
                                            type="button"
                                            className="btn-premium"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              removeAddMoreFile(idx);
                                            }}
                                            style={{ padding: '0.4rem 0.7rem', background: 'rgba(255,255,255,0.05)' }}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                                      Click this area or <strong style={{ color: '#c7d2fe' }}>Add Resumes</strong> to choose more PDFs for this same shortlist.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {addMoreLoading && (
                                <div style={{ borderRadius: '16px', border: '1px solid rgba(129,140,248,0.22)', background: 'rgba(79,70,229,0.08)', padding: '0.9rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                                    <div style={{ color: '#e0e7ff', fontSize: '0.92rem', fontWeight: 600 }}>
                                      Re-shortlisting in progress
                                    </div>
                                    <div style={{ color: '#c7d2fe', fontSize: '0.82rem' }}>
                                      Processed {addMoreProgress?.processed || 0}/{addMoreProgress?.uploaded || addMoreFiles.length || 0}
                                    </div>
                                  </div>
                                  <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${Math.min(100, Math.max(0, ((addMoreProgress?.processed || 0) / (addMoreProgress?.uploaded || addMoreFiles.length || 1)) * 100))}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #6366f1, #22d3ee)',
                                        transition: 'width 0.45s ease'
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {addMoreError && (
                                <div style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 0.9rem', borderRadius: '12px', fontSize: '0.9rem' }}>
                                  {addMoreError}
                                </div>
                              )}

                              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="btn-premium"
                                  onClick={() => {
                                    setShowAddMorePanel(false);
                                    setAddMoreFiles([]);
                                    setAddMoreError(null);
                                  }}
                                  style={{ padding: '0.72rem 1rem', background: 'rgba(255,255,255,0.05)' }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn-premium btn-primary"
                                  onClick={handleInlineReshortlist}
                                  disabled={!canSubmitAddMore}
                                  style={{
                                    padding: '0.72rem 1rem',
                                    opacity: !canSubmitAddMore ? 0.6 : 1,
                                    cursor: !canSubmitAddMore ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {addMoreLoading ? 'Re-shortlisting...' : 'Start Shortlisting'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )
              : null}
            
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
                                <span style={{ fontWeight: '600', color: '#f8fafc' }}>{c.fit_score_100?.toFixed(2)}%</span>
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
                                  {(c.email || c.phone) && (
                                    <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem' }}>
                                      <h4 style={{ color: '#818cf8', marginBottom: '0.75rem', marginTop: 0, fontSize: '1.1rem' }}>Contact Information</h4>
                                      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                        {c.email && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                            <Mail size={16} color="#34d399" />
                                            <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{c.email}</span>
                                          </div>
                                        )}
                                        {c.phone && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                            <Phone size={16} color="#34d399" />
                                            <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{c.phone}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <h4 style={{ color: '#818cf8', marginBottom: '1.5rem', marginTop: 0, fontSize: '1.1rem' }}>Score Breakdown</h4>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '1rem' }}>
                                    {c.ranking_decision_log?.candidate_metrics && Object.entries(c.ranking_decision_log.candidate_metrics).map(([key, value]) => {
                                        if (typeof value !== 'number') return null;
                                        let formattedKey = key.replace('_score_100', '').replace('_100', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                        return (
                                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                            <span style={{ color: '#94a3b8' }}>{formattedKey}</span>
                                            <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{value.toFixed(2)}%</span>
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
                                      <span style={{ fontWeight: '600', color: '#f8fafc' }}>{c.fit_score_100?.toFixed(2)}%</span>
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
                                        {(c.email || c.phone) && (
                                          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem' }}>
                                            <h4 style={{ color: '#818cf8', marginBottom: '0.75rem', marginTop: 0, fontSize: '1.1rem' }}>Contact Information</h4>
                                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                              {c.email && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                                  <Mail size={16} color="#34d399" />
                                                  <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{c.email}</span>
                                                </div>
                                              )}
                                              {c.phone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                                  <Phone size={16} color="#34d399" />
                                                  <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{c.phone}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        <h4 style={{ color: '#818cf8', marginBottom: '1.5rem', marginTop: 0, fontSize: '1.1rem' }}>Score Breakdown</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '1rem' }}>
                                          {c.ranking_decision_log?.candidate_metrics && Object.entries(c.ranking_decision_log.candidate_metrics).map(([key, value]) => {
                                              if (typeof value !== 'number') return null;
                                              let formattedKey = key.replace('_score_100', '').replace('_100', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                              return (
                                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                                  <span style={{ color: '#94a3b8' }}>{formattedKey}</span>
                                                  <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{value.toFixed(2)}%</span>
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
                No candidates available to rank.
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {showDetailsModal && results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetailsModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.72)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              zIndex: 60
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(100%, 980px)',
                maxHeight: '90vh',
                overflow: 'hidden',
                borderRadius: '28px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(8, 11, 20, 0.98) 100%)',
                boxShadow: '0 30px 100px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '14px', display: 'grid', placeItems: 'center', background: 'rgba(129, 140, 248, 0.16)', color: '#c7d2fe' }}>
                      <Info size={22} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.4rem' }}>Shortlist Details</h3>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
                        The job brief, criteria, and scoring context used for this shortlist.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  className="btn-premium"
                  onClick={() => setShowDetailsModal(false)}
                  style={{ width: '40px', height: '40px', padding: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.05)' }}
                  aria-label="Close details modal"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.25rem' }}>
                  <section style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>Job Brief</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Company</div>
                        <div style={{ color: '#e2e8f0', marginTop: '0.35rem' }}>{jobSummary.company_name || 'Not available'}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Position</div>
                        <div style={{ color: '#e2e8f0', marginTop: '0.35rem' }}>{jobSummary.position_title || 'Not available'}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Role Type</div>
                        <div style={{ color: '#e2e8f0', marginTop: '0.35rem', textTransform: 'capitalize' }}>{jobSummary.role || 'Not available'}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Min Experience</div>
                        <div style={{ color: '#e2e8f0', marginTop: '0.35rem' }}>{Number(jobSummary.min_experience_years || 0).toFixed(1)} years</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Job Description</div>
                      <div style={{
                        marginTop: '0.5rem',
                        color: jobSummary.job_description ? '#cbd5e1' : '#64748b',
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                        background: 'rgba(0,0,0,0.22)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '16px',
                        padding: '1rem',
                        minHeight: '120px'
                      }}>
                        {jobSummary.job_description || 'This historical record does not have the original JD text stored. If the shortlist was created recently, the full payload may still be available from the processing cache.'}
                      </div>
                    </div>
                  </section>

                  <section style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontSize: '1.1rem' }}>Criteria</h4>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Required Skills</div>
                      <div style={detailListStyle}>
                        {(jobSummary.required_skills || []).length > 0 ? jobSummary.required_skills.map((skill) => (
                          <span key={skill} style={badgeStyle}>{skill}</span>
                        )) : <span style={{ color: '#64748b', fontSize: '0.95rem' }}>Not available</span>}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Must-Have Skills</div>
                      <div style={detailListStyle}>
                        {(jobSummary.must_have_skills || []).length > 0 ? jobSummary.must_have_skills.map((skill) => (
                          <span key={skill} style={{ ...badgeStyle, background: 'rgba(52, 211, 153, 0.1)', color: '#a7f3d0', borderColor: 'rgba(52, 211, 153, 0.18)' }}>{skill}</span>
                        )) : <span style={{ color: '#64748b', fontSize: '0.95rem' }}>None specified</span>}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>JD Skills</div>
                      <div style={detailListStyle}>
                        {(jobSummary.job_description_skills || []).length > 0 ? jobSummary.job_description_skills.map((skill) => (
                          <span key={skill} style={{ ...badgeStyle, background: 'rgba(251, 191, 36, 0.1)', color: '#fde68a', borderColor: 'rgba(251, 191, 36, 0.18)' }}>{skill}</span>
                        )) : <span style={{ color: '#64748b', fontSize: '0.95rem' }}>Not available</span>}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Semantic Query Skills</div>
                      <div style={detailListStyle}>
                        {(jobSummary.semantic_query_skills || []).length > 0 ? jobSummary.semantic_query_skills.map((skill) => (
                          <span key={skill} style={{ ...badgeStyle, background: 'rgba(129, 140, 248, 0.12)', color: '#c7d2fe', borderColor: 'rgba(129, 140, 248, 0.18)' }}>{skill}</span>
                        )) : <span style={{ color: '#64748b', fontSize: '0.95rem' }}>Not available</span>}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Applied Thresholds</div>
                      <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                        {jobSummary.applied_thresholds && Object.entries(jobSummary.applied_thresholds).length > 0 ? (
                          Object.entries(jobSummary.applied_thresholds).map(([key, value]) => (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.65rem 0.8rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ color: '#94a3b8' }}>{key.replace(/_/g, ' ')}</span>
                              <span style={{ color: '#e2e8f0', textAlign: 'right' }}>
                                {typeof value === 'number' ? value.toFixed(2) : String(value)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: '#64748b', fontSize: '0.95rem' }}>Not available</div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

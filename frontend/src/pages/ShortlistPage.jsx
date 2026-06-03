import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  UploadCloud, 
  Building, 
  Briefcase, 
  Star, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Zap,
  Target,
  Award,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  FilePlus,
  Files,
  Users,
  Mail,
  BellRing,
  BellOff,
  Info,
  Trash2
} from 'lucide-react';
import TagInput from '../components/TagInput';
import { useShortlist } from '../context/ShortlistContext';

export default function ShortlistPage() {
  const {
    step, setStep,
    formData, setFormData,
    requiredSkills, setRequiredSkills,
    mustHaveSkills, setMustHaveSkills,
    files, setFiles,
    loading,
    results,
    error,
    shortlistProgress,
    loadingElapsedSec,
    loadingStageIdx,
    autoSendEmails, setAutoSendEmails,
    selectedCandidateIndex, setSelectedCandidateIndex,
    notificationPermission,
    notificationPromptSeen,
    notifyToast, setNotifyToast,
    historicalRerunContext,
    loadingStages,
    handleSubmit: contextHandleSubmit,
    applyHistoricalRerunContext,
    resetShortlist,
    requestNotificationPermission,
  } = useShortlist();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const location = useLocation();
  const isHistoricalRerun = Boolean(historicalRerunContext?.sourceTraceId);

  useEffect(() => {
    const storageKey = 'kovidam_shortlist_rerun_context';
    const maybeContext = location.state?.shortlistRerunContext;
    let storedContext = null;

    if (maybeContext) {
      storedContext = maybeContext;
    } else if (typeof window !== 'undefined') {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        try {
          storedContext = JSON.parse(raw);
        } catch {
          storedContext = null;
        }
        window.sessionStorage.removeItem(storageKey);
      }
    }

    if (storedContext) {
      applyHistoricalRerunContext(storedContext);
    }
  }, [location.state, applyHistoricalRerunContext]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    contextHandleSubmit(files);
  };

  const handleStartOver = () => resetShortlist();

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
      maxHeight: 'none',
      overflow: 'visible',
      paddingBottom: '3rem'
    }}>
      {historicalRerunContext?.sourceTraceId && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem 1.1rem', borderRadius: '16px', background: 'rgba(79, 70, 229, 0.08)', border: '1px solid rgba(129, 140, 248, 0.22)', color: '#c7d2fe' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Continuing from a past shortlist</div>
          <div style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.45 }}>
            This is old JD data from trace {historicalRerunContext.sourceTraceId}. The JD fields are locked, and only new resumes will be accepted and merged with the existing shortlist.
          </div>
        </div>
      )}
      
      {/* Wizard Header (Progress) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Configure' },
            { num: 3, label: 'Results' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step >= s.num ? '#4f46e5' : 'rgba(255,255,255,0.1)',
                  color: step >= s.num ? 'white' : '#94a3b8',
                  fontWeight: '600', fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}>
                  {step > s.num ? <CheckCircle2 size={16} /> : s.num}
                </div>
                <span style={{ 
                  color: step >= s.num ? '#e2e8f0' : '#64748b', 
                  fontWeight: step === s.num ? '600' : '400',
                  fontSize: '0.95rem'
                }}>
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div style={{ width: '40px', height: '2px', background: step > s.num ? '#4f46e5' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            <div className="glass-panel" style={{ padding: '3rem', borderRadius: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `3px dashed ${isDragging ? '#818cf8' : 'rgba(255,255,255,0.15)'}`,
                  background: isDragging ? 'rgba(79, 70, 229, 0.08)' : 'rgba(0,0,0,0.3)',
                  borderRadius: '20px',
                  padding: '4rem 2rem',
                  width: '100%',
                  maxWidth: '800px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  transform: isDragging ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  accept=".pdf"
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                />
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  <motion.div
                    animate={isDragging ? { y: [0, -10, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    {files.length > 0 ? (
                      <Files size={64} color="#818cf8" />
                    ) : (
                      <UploadCloud size={64} color={isDragging ? '#818cf8' : '#64748b'} />
                    )}
                  </motion.div>
                  
                  <div style={{ width: '100%' }}>
                    {files.length === 0 ? (
                      <>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '600', color: isDragging ? '#e0e7ff' : '#f8fafc' }}>
                          Drag & Drop Resumes
                        </h3>
                        <p style={{ margin: 0, fontSize: '1.1rem', color: '#94a3b8' }}>
                          or click to browse local files (PDF only)
                        </p>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#f8fafc' }}>
                          {files.length} Resumes Added
                        </h3>
                        <div 
                          className="premium-input"
                          style={{ 
                            maxHeight: '220px', 
                            overflowY: 'auto', 
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            background: 'rgba(0,0,0,0.2)',
                            paddingLeft: '0.5rem' // Override premium-input padding
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {files.map((file, idx) => (
                            <motion.div
                              key={`${file.name}-${idx}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1rem', 
                                background: 'rgba(255,255,255,0.03)', 
                                padding: '0.75rem 1rem', 
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                location: 'relative'
                              }}
                            >
                              <FileText size={18} color="#818cf8" />
                              <span style={{ 
                                flex: 1, 
                                textAlign: 'left', 
                                color: '#e2e8f0', 
                                fontSize: '0.9rem', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                              }}>
                                {file.name}
                              </span>
                              <motion.button
                                whileHover={{ scale: 1.1, color: '#f87171' }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(idx);
                                }}
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  color: '#64748b', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  padding: '4px',
                                  transition: 'color 0.2s'
                                }}
                              >
                                <Trash2 size={16} />
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {files.length > 0 && (
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    style={{ position: 'absolute', bottom: 0, left: 0, height: '6px', background: 'linear-gradient(90deg, #4f46e5, #818cf8)', width: '100%', transformOrigin: 'left' }} 
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem', width: '100%', maxWidth: '800px' }}>
                <motion.button 
                  whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-premium"
                  style={{ 
                    flex: 1,
                    height: '56px',
                    fontSize: '1.1rem',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <FilePlus size={20} />
                  {files.length > 0 ? 'Add More Files' : 'Select Files'}
                </motion.button>
                
                <motion.button 
                  whileHover={files.length > 0 ? { scale: 1.02 } : {}}
                  whileTap={files.length > 0 ? { scale: 0.98 } : {}}
                  onClick={() => setStep(2)}
                  disabled={files.length === 0}
                  className="btn-premium btn-primary"
                  style={{ 
                    flex: 1,
                    height: '56px',
                    fontSize: '1.1rem',
                    opacity: files.length === 0 ? 0.5 : 1,
                    cursor: files.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.75rem'
                  }}
                >
                  Continue
                  <ArrowRight size={20} />
                </motion.button>
              </div>

            </div>
          </motion.div>
        )}

        {/* STEP 2: CONFIGURE */}
        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', zIndex: 10, display: 'flex', flexDirection: 'column', height: 'auto', minHeight: '0' }}
          >
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', height: 'auto', minHeight: '0' }}>
              
              {/* Left Sidebar: Role Profile */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Briefcase size={20} color="#818cf8" />
                    Role Profile
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Define the role we are hiring for.</p>
                </div>
                
                <div className="premium-input-group">
                  <label style={labelStyle}>Role Type</label>
                  <Target className="premium-input-icon" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="premium-input"
                    style={{ paddingLeft: '2.8rem', appearance: 'none', cursor: isHistoricalRerun ? 'not-allowed' : 'pointer', opacity: isHistoricalRerun ? 0.8 : 1 }}
                    disabled={isHistoricalRerun}
                  >
                    <option value="internship" style={{ background: '#0f172a', color: 'white' }}>Internship Position</option>
                    <option value="job" style={{ background: '#0f172a', color: 'white' }}>Full-time Job</option>
                  </select>
                </div>

                <div className="premium-input-group">
                  <label style={labelStyle}>Min Experience (Years)</label>
                  <Award className="premium-input-icon" />
                  <input type="number" step="0.1" min="0" name="min_experience_years" value={formData.min_experience_years} onChange={(e) => {
                    if (parseFloat(e.target.value) < 0) e.target.value = 0;
                    handleInputChange(e);
                  }} className="premium-input" disabled={isHistoricalRerun} style={{ opacity: isHistoricalRerun ? 0.8 : 1, cursor: isHistoricalRerun ? 'not-allowed' : 'text' }} />
                </div>

                <div className="premium-input-group">
                  <label style={labelStyle}>Target Headcount</label>
                  <Users className="premium-input-icon" />
                  <input type="number" step="1" min="1" name="target_headcount" value={formData.target_headcount} onChange={(e) => {
                    if (parseInt(e.target.value) < 1) e.target.value = 1;
                    handleInputChange(e);
                  }} className="premium-input" disabled={isHistoricalRerun} style={{ opacity: isHistoricalRerun ? 0.8 : 1, cursor: isHistoricalRerun ? 'not-allowed' : 'text' }} />
                </div>

                <div className="premium-input-group">
                  <label style={labelStyle}>Company Name</label>
                  <Building className="premium-input-icon" />
                  <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} required className="premium-input" placeholder="e.g. Kovidam" disabled={isHistoricalRerun} style={{ opacity: isHistoricalRerun ? 0.8 : 1, cursor: isHistoricalRerun ? 'not-allowed' : 'text' }} />
                </div>

                <div className="premium-input-group">
                  <label style={labelStyle}>Position Title</label>
                  <Briefcase className="premium-input-icon" />
                  <input type="text" name="position_title" value={formData.position_title} onChange={handleInputChange} required className="premium-input" placeholder="e.g. Software Engineer" disabled={isHistoricalRerun} style={{ opacity: isHistoricalRerun ? 0.8 : 1, cursor: isHistoricalRerun ? 'not-allowed' : 'text' }} />
                </div>

                <div style={{ flex: 1 }} /> {/* Spacer */}

                <div style={{ background: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.15)', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ color: '#818cf8', marginTop: '2px' }}><Star size={16} /></div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#e0e7ff' }}>{isHistoricalRerun ? 'Historical JD Locked' : 'Tip'}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      {isHistoricalRerun
                        ? 'This rerun is tied to old JD data. Only new resume files are editable here.'
                        : 'More context helps AI find better matches.'}
                    </p>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-premium"
                  style={{ 
                    width: '100%',
                    height: '50px',
                    fontSize: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}
                >
                  <ArrowLeft size={18} />
                  Back
                </motion.button>
              </div>

              {/* Right Main Area: Skills & Requirements */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
                      Skills & Requirements
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
                      {isHistoricalRerun
                        ? 'Read-only historical JD values. Add only new resumes.'
                        : 'Add the skills and requirements for this role.'}
                    </p>
                  </div>
                  <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '100px', color: '#818cf8', fontWeight: '500', fontSize: '0.85rem' }}>
                    {files.length} Candidate{files.length !== 1 ? 's' : ''} Loaded
                  </div>
                </div>

                <div className="premium-input-group" style={{ zIndex: 20 }}>
                  <label style={labelStyle}>Required Skills</label>
                  {isHistoricalRerun ? (
                    <div style={{ minHeight: '52px', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', opacity: 0.95 }}>
                      {requiredSkills.length > 0 ? requiredSkills.map((tag) => (
                        <span key={tag} style={{ padding: '0.28rem 0.65rem', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '0.85rem' }}>{tag}</span>
                      )) : <span style={{ color: '#94a3b8' }}>No required skills saved on this historical shortlist.</span>}
                    </div>
                  ) : (
                    <TagInput 
                      tags={requiredSkills} 
                      setTags={setRequiredSkills} 
                      placeholder="e.g. react, python, javascript"
                      icon={Star}
                    />
                  )}
                </div>
                
                <div className="premium-input-group" style={{ zIndex: 10 }}>
                  <label style={labelStyle}>Must Have Skills</label>
                  {isHistoricalRerun ? (
                    <div style={{ minHeight: '52px', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', opacity: 0.95 }}>
                      {mustHaveSkills.length > 0 ? mustHaveSkills.map((tag) => (
                        <span key={tag} style={{ padding: '0.28rem 0.65rem', borderRadius: '999px', background: 'rgba(250, 204, 21, 0.1)', color: '#fde68a', fontSize: '0.85rem' }}>{tag}</span>
                      )) : <span style={{ color: '#94a3b8' }}>No must-have skills saved on this historical shortlist.</span>}
                    </div>
                  ) : (
                    <TagInput 
                      tags={mustHaveSkills} 
                      setTags={setMustHaveSkills} 
                      placeholder="Add must have skills"
                      icon={Zap}
                      iconColor="#facc15"
                      borderColor="rgba(250, 204, 21, 0.25)"
                      focusColor="rgba(250, 204, 21, 0.5)"
                      glowColor="rgba(250, 204, 21, 0.1)"
                    />
                  )}
                </div>

                <div className="premium-input-group" style={{ flex: 1 }}>
                  <label style={labelStyle}>Job Description <span style={{ textTransform: 'none', color: '#64748b', fontWeight: '400' }}>(Optional)</span></label>
                  <FileText className="premium-input-icon" style={{ top: '2.1rem' }} />
                  <textarea
                    name="job_description"
                    value={formData.job_description}
                    onChange={handleInputChange}
                    className="premium-input"
                    style={{ resize: 'none', flex: 1, minHeight: '80px', opacity: isHistoricalRerun ? 0.8 : 1, cursor: isHistoricalRerun ? 'not-allowed' : 'text' }}
                    placeholder="Paste JD context here to improve semantic matching..."
                    readOnly={isHistoricalRerun}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}
                    >
                      <XCircle size={20} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={16} color="#818cf8" /> Auto-Email AI Interviews
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Send interview invites to top shortlisted candidates automatically.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoSendEmails(!autoSendEmails)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: autoSendEmails ? '#4f46e5' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.3s'
                    }}
                  >
                    <motion.div
                      initial={false}
                      animate={{ x: autoSendEmails ? 20 : 2 }}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        position: 'absolute',
                        top: '2px'
                      }}
                    />
                  </button>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className="btn-premium btn-primary"
                  style={{ 
                    width: '100%',
                    height: '60px',
                    fontSize: '1.15rem',
                    fontWeight: '600',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                    marginTop: 'auto'
                  }}
                >
                  <Zap size={22} />
                  {isHistoricalRerun ? 'Merge With Old Shortlist' : 'Start Shortlisting'}
                </motion.button>
              </div>

            </form>
          </motion.div>
        )}

        {/* STEP 3: RESULTS & LOADING */}
        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {loading ? (
              <div style={{ position: 'relative', flex: 1, minHeight: '560px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', background: 'radial-gradient(1200px 420px at 20% -10%, rgba(99,102,241,0.2), transparent), rgba(12, 12, 18, 0.62)' }}>
                <div style={{ position: 'absolute', inset: 0, padding: '1.25rem', filter: 'blur(1.2px)', opacity: 0.92, transform: 'scale(1.003)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0.9rem' }}>
                    {(shortlistProgress?.completed_resumes?.length ? shortlistProgress.completed_resumes : Array.from({ length: 6 })).slice(-6).map((item, idx) => (
                      <div key={`${item?.filename || 'placeholder'}-${idx}`} style={{ borderRadius: '14px', border: `1px solid ${item?.ok === false ? 'rgba(248,113,113,0.32)' : 'rgba(129,140,248,0.28)'}`, background: item?.ok === false ? 'rgba(127, 29, 29, 0.25)' : 'rgba(30, 27, 75, 0.40)', padding: '0.95rem 1rem', minHeight: '82px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#c7d2fe', fontSize: '0.78rem' }}>{item?.ok === false ? 'Failed' : 'Parsed'}</span>
                          <span style={{ color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 600 }}>
                            {item?.ok === false ? '--' : (item?.fit_score_100 ? `${Number(item.fit_score_100).toFixed(2)}%` : '--')}
                          </span>
                        </div>
                        <p style={{ margin: '0.45rem 0 0 0', color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.25 }}>
                          {item?.filename || 'Waiting for resume parsing...'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(1px)',
                  background: 'linear-gradient(180deg, rgba(2,6,23,0.28) 0%, rgba(2,6,23,0.58) 100%)'
                }}>
                  <div style={{ width: 'min(1060px, 96%)', borderRadius: '24px', border: '1px solid rgba(129,140,248,0.40)', background: 'linear-gradient(145deg, rgba(10, 12, 26, 0.92), rgba(17, 24, 39, 0.9))', boxShadow: '0 32px 78px rgba(0,0,0,0.52)', padding: '1.85rem 1.9rem', display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '1.4rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.7rem' }}>
                        <div style={{ position: 'relative', width: '68px', height: '68px' }}>
                          <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(79, 70, 229, 0.2)', borderRadius: '50%' }} />
                          <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#818cf8', borderRightColor: '#818cf8', borderRadius: '50%', animation: 'spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite' }} />
                          <Zap size={24} color="#818cf8" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: 'pulse 2s infinite' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.32rem', color: '#e2e8f0', margin: 0, fontWeight: 650 }}>Shortlist In Progress</h3>
                          <p style={{ color: '#94a3b8', fontSize: '0.93rem', margin: '0.3rem 0 0 0' }}>
                            {loadingStages[loadingStageIdx]}
                          </p>
                        </div>
                      </div>
                      {notificationPermission !== 'unsupported' && (
                        <div style={{ marginBottom: '0.8rem', border: `1px solid ${notificationPermission === 'granted' ? 'rgba(16,185,129,0.34)' : notificationPermission === 'denied' ? 'rgba(248,113,113,0.34)' : 'rgba(129,140,248,0.3)'}`, background: notificationPermission === 'granted' ? 'rgba(5,46,22,0.38)' : notificationPermission === 'denied' ? 'rgba(69,10,10,0.34)' : 'rgba(49,46,129,0.24)', borderRadius: '11px', padding: '0.65rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ color: notificationPermission === 'granted' ? '#86efac' : notificationPermission === 'denied' ? '#fecaca' : '#c7d2fe', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            {notificationPermission === 'granted' ? <BellRing size={14} /> : notificationPermission === 'denied' ? <BellOff size={14} /> : <Info size={14} />}
                            {notificationPermission === 'granted'
                              ? 'Desktop alerts are enabled. You will be notified as soon as shortlist completes.'
                              : notificationPermission === 'denied'
                                ? 'Desktop alerts are blocked by browser. Enable notifications from site settings.'
                                : 'Get a desktop alert when all resumes finish processing.'}
                          </span>
                          {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                            <button
                              type="button"
                              onClick={requestNotificationPermission}
                              className="btn-premium"
                              style={{ padding: '0.38rem 0.72rem', fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                            >
                              {notificationPromptSeen ? 'Enable Alerts' : 'Allow Notifications'}
                            </button>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <span style={{ background: 'rgba(99,102,241,0.16)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '999px', padding: '0.34rem 0.65rem', fontSize: '0.78rem' }}>
                          Resumes: {shortlistProgress?.uploaded || files.length || 0}
                        </span>
                        <span style={{ background: 'rgba(16,185,129,0.13)', color: '#86efac', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '999px', padding: '0.34rem 0.65rem', fontSize: '0.78rem' }}>
                          Ranked: {shortlistProgress?.ranked_so_far || 0}
                        </span>
                        <span style={{ background: 'rgba(248,113,113,0.13)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.35)', borderRadius: '999px', padding: '0.34rem 0.65rem', fontSize: '0.78rem' }}>
                          Failed: {shortlistProgress?.failed_so_far || 0}
                        </span>
                        <span style={{ background: 'rgba(34,211,238,0.13)', color: '#67e8f9', border: '1px solid rgba(34,211,238,0.35)', borderRadius: '999px', padding: '0.34rem 0.65rem', fontSize: '0.78rem' }}>
                          Elapsed: {Math.floor(loadingElapsedSec / 60)}m {loadingElapsedSec % 60}s
                        </span>
                      </div>
                      <div style={{ width: '100%', marginTop: '0.2rem', height: '9px', borderRadius: '999px', background: 'rgba(255,255,255,0.09)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, ((shortlistProgress?.processed || 0) / (shortlistProgress?.uploaded || files.length || 1)) * 100))}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #6366f1, #22d3ee)',
                            transition: 'width 0.45s ease'
                          }}
                        />
                      </div>
                      <p style={{ margin: '0.48rem 0 0 0', color: '#a5b4fc', fontSize: '0.86rem' }}>
                        Processed {shortlistProgress?.processed || 0}/{shortlistProgress?.uploaded || files.length || 0}
                      </p>
                    </div>
                    <div style={{ borderLeft: '1px solid rgba(148,163,184,0.15)', paddingLeft: '1rem' }}>
                      <p style={{ margin: '0 0 0.55rem 0', color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>Pipeline Stages</p>
                      {loadingStages.map((stage, idx) => {
                        const active = idx === loadingStageIdx;
                        const done = idx < loadingStageIdx;
                        return (
                          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: done ? '#22c55e' : active ? '#818cf8' : 'rgba(148,163,184,0.4)', boxShadow: active ? '0 0 14px rgba(129,140,248,0.8)' : 'none' }} />
                            <span style={{ fontSize: '0.82rem', color: active ? '#dbeafe' : '#94a3b8' }}>{stage}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <style>{`
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                `}</style>
              </div>
            ) : results ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                   <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartOver}
                    className="btn-premium"
                    style={{ 
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.95rem'
                    }}
                  >
                    <RotateCcw size={18} />
                    Start Over
                  </motion.button>
                </div>

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
                      
                      {/* Top Candidates Section */}
                      {(() => {
                        const topCandidates = results.shortlisted.slice(0, formData.target_headcount);
                        const otherCandidates = results.shortlisted.slice(formData.target_headcount);
                        
                        return (
                          <>
                            {topCandidates.length > 0 && (
                              <div style={{ padding: '2rem 2rem 1rem 2rem', background: 'rgba(79, 70, 229, 0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <h4 style={{ margin: 0, color: '#facc15', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Star size={20} fill="#facc15" />
                                  Top {topCandidates.length} Candidates
                                </h4>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>These candidates best match your target headcount requirement.</p>
                              </div>
                            )}

                            {topCandidates.map((c, idx) => (
                        <React.Fragment key={idx}>
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + (idx * 0.05) }}
                            whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                            style={{ padding: '1.75rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '70px 2fr 1.5fr 1fr', gap: '2rem', alignItems: 'center' }}
                          >
                            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: idx === 0 ? '#facc15' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#b45309' : '#64748b' }}>
                              #{c.rank}
                            </div>
                            
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.filename}>
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
                                  transition={{ duration: 1, delay: 0.8 + (idx * 0.1), ease: "easeOut" }}
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
                                type="button"
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
                                    {c.ranking_decision_log?.role_profile && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                        <span style={{ color: '#94a3b8' }}>Role Profile</span>
                                        <span style={{ color: '#e2e8f0', fontWeight: '500', textTransform: 'capitalize' }}>{c.ranking_decision_log.role_profile}</span>
                                      </div>
                                    )}
                                    {c.ranking_decision_log?.candidate_metrics && Object.entries(c.ranking_decision_log.candidate_metrics).map(([key, value]) => {
                                        if (typeof value !== 'number' && typeof value !== 'string') return null;
                                        let formattedKey = key.replace('_score_100', '').replace('_100', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                        let displayValue = typeof value === 'number' ? value.toFixed(2) : String(value);
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
                      ))}

                      {/* Other Candidates Section */}
                      {otherCandidates.length > 0 && (
                        <>
                          <div style={{ padding: '2rem 2rem 1rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '2px dashed rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Users size={20} color="#818cf8" />
                              Other Qualified Candidates ({otherCandidates.length})
                            </h4>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>These candidates met the requirements but fell outside the target headcount.</p>
                          </div>

                          {otherCandidates.map((c, idx) => {
                            const realIdx = idx + parseInt(formData.target_headcount);
                            return (
                              <React.Fragment key={realIdx}>
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.5 + (realIdx * 0.05) }}
                                  whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                                  style={{ padding: '1.75rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '70px 2fr 1.5fr 1fr', gap: '2rem', alignItems: 'center', opacity: 0.8 }}
                                >
                                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#64748b' }}>
                                    #{c.rank}
                                  </div>
                                  
                                  <div style={{ minWidth: 0 }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.filename}>
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
                                        transition={{ duration: 1, delay: 0.8 + (realIdx * 0.1), ease: "easeOut" }}
                                        style={{ 
                                          height: '100%', 
                                          background: 'linear-gradient(90deg, #64748b, #94a3b8)'
                                        }} 
                                      />
                                    </div>
                                  </div>
                                  
                                  <div style={{ textAlign: 'right' }}>
                                    <button 
                                      type="button"
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
                                          {c.ranking_decision_log?.role_profile && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                                              <span style={{ color: '#94a3b8' }}>Role Profile</span>
                                              <span style={{ color: '#e2e8f0', fontWeight: '500', textTransform: 'capitalize' }}>{c.ranking_decision_log.role_profile}</span>
                                            </div>
                                          )}
                                          {c.ranking_decision_log?.candidate_metrics && Object.entries(c.ranking_decision_log.candidate_metrics).map(([key, value]) => {
                                              if (typeof value !== 'number' && typeof value !== 'string') return null;
                                              let formattedKey = key.replace('_score_100', '').replace('_100', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                              let displayValue = typeof value === 'number' ? value.toFixed(2) : String(value);
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
            ) : null}
          </motion.div>
        )}

        <AnimatePresence>
          {notifyToast && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              style={{
                position: 'fixed',
                right: '1.2rem',
                bottom: '1.2rem',
                zIndex: 80,
                width: 'min(380px, calc(100vw - 2rem))',
                borderRadius: '14px',
                border: `1px solid ${
                  notifyToast.type === 'success'
                    ? 'rgba(16,185,129,0.45)'
                    : notifyToast.type === 'error'
                      ? 'rgba(248,113,113,0.45)'
                      : notifyToast.type === 'warning'
                        ? 'rgba(251,191,36,0.45)'
                        : 'rgba(129,140,248,0.45)'
                }`,
                background: 'linear-gradient(145deg, rgba(7, 11, 26, 0.96), rgba(17, 24, 39, 0.94))',
                boxShadow: '0 26px 52px rgba(0,0,0,0.4)',
                padding: '0.85rem 0.95rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.7rem',
              }}
            >
              <div
                style={{
                  marginTop: '0.15rem',
                  width: '10px',
                  height: '10px',
                  borderRadius: '999px',
                  background:
                    notifyToast.type === 'success'
                      ? '#34d399'
                      : notifyToast.type === 'error'
                        ? '#f87171'
                        : notifyToast.type === 'warning'
                          ? '#fbbf24'
                          : '#818cf8',
                  boxShadow:
                    notifyToast.type === 'success'
                      ? '0 0 12px rgba(52,211,153,0.9)'
                      : notifyToast.type === 'error'
                        ? '0 0 12px rgba(248,113,113,0.9)'
                        : notifyToast.type === 'warning'
                          ? '0 0 12px rgba(251,191,36,0.9)'
                          : '0 0 12px rgba(129,140,248,0.9)',
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 650, fontSize: '0.92rem' }}>{notifyToast.title}</p>
                <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.83rem', lineHeight: 1.35 }}>{notifyToast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotifyToast(null)}
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </AnimatePresence>
    </div>
  );
}

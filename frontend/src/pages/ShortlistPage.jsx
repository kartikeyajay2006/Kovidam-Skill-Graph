import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  Building, 
  Briefcase, 
  Star, 
  Settings2, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Zap,
  Target,
  Award,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  FilePlus,
  Files,
  Users,
  Mail
} from 'lucide-react';
import TagInput from '../components/TagInput';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export default function ShortlistPage() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Config, 3: Results
  const [formData, setFormData] = useState({
    role: 'internship',
    company_name: 'Kovidam',
    position_title: 'Software Engineer',
    job_description: '',
    min_experience_years: 0,
    target_headcount: 3,
  });
  const [requiredSkills, setRequiredSkills] = useState(['python', 'react', 'javascript']);
  const [mustHaveSkills, setMustHaveSkills] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(null);
  const [autoSendEmails, setAutoSendEmails] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setStep(3); // Move to results step immediately to show loading

    const data = new FormData();
    for (const key in formData) {
      data.append(key, formData[key]);
    }
    data.append('required_skills_csv', requiredSkills.join(','));
    data.append('must_have_skills_csv', mustHaveSkills.join(','));
    data.append('send_shortlist_emails', autoSendEmails);
    
    files.forEach((file) => {
      data.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/hiring/shortlist`, {
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
          (json && (json.detail || json.message)) ||
          rawBody ||
          `Error processing request (${response.status})`;
        throw new Error(errorMessage);
      }
      if (!json) {
        throw new Error("Server returned empty response");
      }
      setResults(json);
    } catch (err) {
      setError(err.message);
      setStep(2); // Go back to config on error
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setFiles([]);
    setResults(null);
    setError(null);
    setStep(1);
    setSelectedCandidateIndex(null);
    setAutoSendEmails(false);
  };

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

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem 0.85rem 2.8rem',
    background: 'rgba(255,255,255,0.03)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontSize: '0.95rem'
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

  const iconStyle = {
    position: 'absolute',
    left: '1rem',
    top: '2.5rem',
    color: '#64748b',
    width: '18px',
    height: '18px'
  };

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      width: '100%',
      maxHeight: step === 3 ? 'none' : 'calc(100vh - 152px)',
      overflow: step === 3 ? 'visible' : 'hidden'
    }}>
      
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
                  
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '600', color: isDragging ? '#e0e7ff' : '#f8fafc' }}>
                      {files.length > 0 ? `${files.length} Resumes Added` : 'Drag & Drop Resumes'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#94a3b8' }}>
                      or click to browse local files (PDF only)
                    </p>
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
            style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', height: '100%' }}>
              
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
                  <select name="role" value={formData.role} onChange={handleInputChange} className="premium-input" style={{ paddingLeft: '2.8rem', appearance: 'none', cursor: 'pointer' }}>
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
                  }} className="premium-input" />
                </div>

                <div className="premium-input-group">
                  <label style={labelStyle}>Target Headcount</label>
                  <Users className="premium-input-icon" />
                  <input type="number" step="1" min="1" name="target_headcount" value={formData.target_headcount} onChange={(e) => {
                    if (parseInt(e.target.value) < 1) e.target.value = 1;
                    handleInputChange(e);
                  }} className="premium-input" />
                </div>

                <div className="premium-input-group">
                  <label style={labelStyle}>Company Name</label>
                  <Building className="premium-input-icon" />
                  <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange} required className="premium-input" placeholder="e.g. Kovidam" />
                </div>

                <div className="premium-input-group">
                  <label style={labelStyle}>Position Title</label>
                  <Briefcase className="premium-input-icon" />
                  <input type="text" name="position_title" value={formData.position_title} onChange={handleInputChange} required className="premium-input" placeholder="e.g. Software Engineer" />
                </div>

                <div style={{ flex: 1 }} /> {/* Spacer */}

                <div style={{ background: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.15)', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ color: '#818cf8', marginTop: '2px' }}><Star size={16} /></div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#e0e7ff' }}>Tip</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>More context helps AI find better matches.</p>
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
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Add the skills and requirements for this role.</p>
                  </div>
                  <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '100px', color: '#818cf8', fontWeight: '500', fontSize: '0.85rem' }}>
                    {files.length} Candidate{files.length !== 1 ? 's' : ''} Loaded
                  </div>
                </div>

                <div className="premium-input-group" style={{ zIndex: 20 }}>
                  <label style={labelStyle}>Required Skills</label>
                  <TagInput 
                    tags={requiredSkills} 
                    setTags={setRequiredSkills} 
                    placeholder="e.g. react, python, javascript"
                    icon={Star}
                  />
                </div>
                
                <div className="premium-input-group" style={{ zIndex: 10 }}>
                  <label style={labelStyle}>Must Have Skills</label>
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
                </div>

                <div className="premium-input-group" style={{ flex: 1 }}>
                  <label style={labelStyle}>Job Description <span style={{ textTransform: 'none', color: '#64748b', fontWeight: '400' }}>(Optional)</span></label>
                  <FileText className="premium-input-icon" style={{ top: '2.1rem' }} />
                  <textarea name="job_description" value={formData.job_description} onChange={handleInputChange} className="premium-input" style={{ resize: 'none', flex: 1, minHeight: '80px' }} placeholder="Paste JD context here to improve semantic matching..." />
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
                  Start Shortlisting
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '500px', background: 'rgba(12, 12, 18, 0.4)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '2.5rem' }}>
                  <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(79, 70, 229, 0.2)', borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: '#818cf8', borderRightColor: '#818cf8', borderRadius: '50%', animation: 'spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite' }} />
                  <div style={{ position: 'absolute', inset: '20px', border: '4px solid transparent', borderBottomColor: '#c7d2fe', borderLeftColor: '#c7d2fe', borderRadius: '50%', animation: 'spin 2s linear infinite reverse' }} />
                  <Zap size={32} color="#818cf8" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: 'pulse 2s infinite' }} />
                </div>
                <h3 style={{ fontSize: '1.5rem', color: '#e2e8f0', marginBottom: '0.75rem', fontWeight: '600' }}>Analyzing Candidates</h3>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Extracting skills, matching semantics, and evaluating profiles...</p>
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

      </AnimatePresence>
    </div>
  );
}

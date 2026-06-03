/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/api';

const ShortlistContext = createContext(null);

const LOADING_STAGES = [
  'Validating uploaded resumes...',
  'Extracting profile links, skills, and projects...',
  'Analyzing GitHub and coding platform signals...',
  'Matching role requirements and must-have skills...',
  'Ranking candidates and generating shortlist insights...',
];

const DEFAULT_FORM_DATA = {
  role: 'internship',
  company_name: 'Kovidam',
  position_title: 'Software Engineer',
  job_description: '',
  min_experience_years: 0,
  target_headcount: 3,
};

export function ShortlistProvider({ children }) {
  // Wizard step
  const [step, setStep] = useState(1);

  // Form fields
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [requiredSkills, setRequiredSkills] = useState(['python', 'react', 'javascript']);
  const [mustHaveSkills, setMustHaveSkills] = useState([]);

  // Files — File objects live here while user is on upload/config step
  const [files, setFiles] = useState([]);

  // Job state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [shortlistProgress, setShortlistProgress] = useState(null);
  const [historicalRerunContext, setHistoricalRerunContext] = useState(null);

  // UI
  const [loadingElapsedSec, setLoadingElapsedSec] = useState(0);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [autoSendEmails, setAutoSendEmails] = useState(false);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(null);

  // Notification state
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [notificationPromptSeen, setNotificationPromptSeen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('kovidam_notification_prompt_seen') === '1';
  });
  const [notifyToast, setNotifyToast] = useState(null);

  // Internal refs — survive navigation because they live in the context
  const completionNotifiedRef = useRef(false);
  const notifyToastTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const fileCountRef = useRef(0); // remember file count for progress display after File objects cleared

  // Loading timers — run as long as loading is true, even if ShortlistPage is unmounted
  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setLoadingElapsedSec(prev => prev + 1), 1000);
    const stageTimer = setInterval(
      () => setLoadingStageIdx(prev => (prev + 1) % LOADING_STAGES.length),
      3500
    );
    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, [loading]);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (notifyToastTimerRef.current) clearTimeout(notifyToastTimerRef.current);
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showNotifyToast = useCallback((type, title, message) => {
    if (notifyToastTimerRef.current) clearTimeout(notifyToastTimerRef.current);
    setNotifyToast({ type, title, message });
    notifyToastTimerRef.current = setTimeout(() => setNotifyToast(null), 4400);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      window.localStorage.setItem('kovidam_notification_prompt_seen', '1');
      setNotificationPromptSeen(true);
      if (permission === 'granted') {
        showNotifyToast('success', 'Notifications enabled', 'You will get an alert when shortlist processing completes.');
      } else if (permission === 'denied') {
        showNotifyToast('warning', 'Notifications blocked', 'Browser notifications are blocked. You can enable them from site settings.');
      } else {
        showNotifyToast('info', 'Notification request dismissed', 'You can enable notifications anytime from the progress panel.');
      }
    } catch {
      showNotifyToast('error', 'Notification setup failed', 'Could not request notification permission in this browser session.');
    }
  }, [showNotifyToast]);

  const notifyShortlistCompletion = useCallback((payload) => {
    if (completionNotifiedRef.current) return;
    const ranked = payload?.counts?.ranked ?? 0;
    const uploaded = payload?.counts?.uploaded ?? fileCountRef.current ?? 0;
    const failed = payload?.counts?.failed ?? 0;
    showNotifyToast(
      failed > 0 ? 'warning' : 'success',
      'Shortlist completed',
      `Processed ${uploaded} resumes. Ranked ${ranked}${failed > 0 ? `, failed ${failed}` : ''}.`
    );
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(`${formData.company_name || 'Kovidam'} shortlist completed`, {
          body: `Processed ${uploaded} resumes • Ranked ${ranked} • Failed ${failed}`,
          tag: 'kovidam-shortlist-complete',
          requireInteraction: failed > 0,
          renotify: true,
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* ignore */ }
    }
    completionNotifiedRef.current = true;
  }, [showNotifyToast, formData.company_name]);

  const notifyShortlistFailure = useCallback((message) => {
    showNotifyToast('error', 'Shortlist failed', message || 'Something went wrong while processing resumes.');
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(`${formData.company_name || 'Kovidam'} shortlist failed`, {
          body: message || 'Something went wrong while processing resumes.',
          tag: 'kovidam-shortlist-failed',
          requireInteraction: true,
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* ignore */ }
    }
  }, [showNotifyToast, formData.company_name]);

  const applyHistoricalRerunContext = useCallback((context) => {
    if (!context) return;
    const jobSummary = context.job_summary || {};
    const sourceTraceId = context.source_trace_id || context.trace_id || '';

    setFormData((prev) => ({
      ...prev,
      role: jobSummary.role || prev.role,
      company_name: jobSummary.company_name || prev.company_name,
      position_title: jobSummary.position_title || prev.position_title,
      job_description: jobSummary.job_description ?? prev.job_description,
      min_experience_years: jobSummary.min_experience_years ?? prev.min_experience_years,
    }));
    if (Array.isArray(jobSummary.required_skills) && jobSummary.required_skills.length > 0) {
      setRequiredSkills(jobSummary.required_skills);
    }
    if (Array.isArray(jobSummary.must_have_skills)) {
      setMustHaveSkills(jobSummary.must_have_skills);
    }

    setFiles([]);
    setResults(null);
    setError(null);
    setShortlistProgress(null);
    setLoading(false);
    setLoadingElapsedSec(0);
    setLoadingStageIdx(0);
    setSelectedCandidateIndex(null);
    setStep(1);

    setHistoricalRerunContext({
      sourceTraceId,
      sourceJobSummary: jobSummary,
      sourceShortlistedCount: Array.isArray(context.shortlisted) ? context.shortlisted.length : 0,
      sourceShortlistedNames: Array.isArray(context.shortlisted)
        ? context.shortlisted.map((item) => item?.filename).filter(Boolean)
        : [],
      sourceRankedNames: Array.isArray(context.ranked_candidates)
        ? context.ranked_candidates.map((item) => item?.filename).filter(Boolean)
        : [],
    });
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (submittedFiles) => {
    completionNotifiedRef.current = false;
    fileCountRef.current = submittedFiles.length;

    setLoading(true);
    setError(null);
    setResults(null);
    setShortlistProgress(null);
    setLoadingElapsedSec(0);
    setLoadingStageIdx(0);
    setStep(3);

    const data = new FormData();
    const clientTraceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    for (const key in formData) {
      data.append(key, formData[key]);
    }
    data.append('required_skills_csv', requiredSkills.join(','));
    data.append('must_have_skills_csv', mustHaveSkills.join(','));
    data.append('send_shortlist_emails', autoSendEmails);
    data.append('client_trace_id', clientTraceId);
    if (historicalRerunContext?.sourceTraceId) {
      data.append('merge_source_trace_id', historicalRerunContext.sourceTraceId);
    }
    submittedFiles.forEach(file => data.append('files', file));

    // Clear file objects once request is in-flight (they can't persist anyway)
    setFiles([]);

    // Progress polling — lives in the context ref, not the page
    const fetchProgress = async () => {
      try {
        const progressRes = await authFetch(`/hiring/shortlist/progress/${clientTraceId}`);
        if (!progressRes.ok) return;
        const progressJson = await progressRes.json();
        setShortlistProgress(progressJson);
      } catch { /* best-effort */ }
    };

    await fetchProgress();
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(fetchProgress, 1500);

    try {
      const response = await authFetch('/hiring/shortlist', { method: 'POST', body: data });
      const rawBody = await response.text();
      let json = null;
      if (rawBody && rawBody.trim()) {
        try { json = JSON.parse(rawBody); }
        catch { throw new Error(`Server returned invalid JSON (status ${response.status})`); }
      }
      if (!response.ok) {
        const errorMessage =
          (json && (json.detail || json.message)) || rawBody || `Error processing request (${response.status})`;
        throw new Error(errorMessage);
      }
      if (!json) throw new Error('Server returned empty response');
      setResults(json);
      notifyShortlistCompletion(json);
    } catch (err) {
      setError(err.message);
      notifyShortlistFailure(err.message);
      setStep(2);
    } finally {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
      setLoading(false);
    }
  }, [formData, requiredSkills, mustHaveSkills, autoSendEmails, notifyShortlistCompletion, notifyShortlistFailure, historicalRerunContext]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetShortlist = useCallback(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
    setFiles([]);
    setResults(null);
    setError(null);
    setStep(1);
    setLoading(false);
    setShortlistProgress(null);
    setLoadingElapsedSec(0);
    setLoadingStageIdx(0);
    setSelectedCandidateIndex(null);
    setAutoSendEmails(false);
    completionNotifiedRef.current = false;
    fileCountRef.current = 0;
    setHistoricalRerunContext(null);
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  const value = {
    // State
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
    fileCountRef,
    historicalRerunContext,

    // Constants
    loadingStages: LOADING_STAGES,

    // Actions
    handleSubmit,
    applyHistoricalRerunContext,
    resetShortlist,
    requestNotificationPermission,
    showNotifyToast,
  };

  return (
    <ShortlistContext.Provider value={value}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist() {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error('useShortlist must be used inside <ShortlistProvider>');
  return ctx;
}

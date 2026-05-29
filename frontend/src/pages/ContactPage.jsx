import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import {
  CalendarDays,
  Clock3,
  Mail,
  Phone,
  Building2,
  User,
  ShieldCheck,
  Sparkles,
  Send,
  MapPin,
  Rocket,
  Layout,
  Globe,
  MessageSquare,
} from 'lucide-react'
import Footer from '../components/Footer'
import './ContactPage.css'

const INITIAL_FORM = {
  fullName: '',
  workEmail: '',
  phoneNumber: '',
  company: '',
  preferredDate: '',
  preferredTime: '',
  timezone: 'IST',
  platform: 'Kovidam Skill Graph',
  message: '',
  consent: false,
}

export default function ContactPage() {
  const [searchParams] = useSearchParams()
  const contactIntent = searchParams.get('intent') || ''
  const isPasswordHelp = contactIntent === 'forgot-password'
  const [form, setForm] = useState(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [introState, setIntroState] = useState('flying-in')

  const skipIntro = () => setIntroState('done')
  const replayIntro = () => setIntroState('flying-in')

  useEffect(() => {
    if (introState === 'done') return

    let t1, t2, t3, t4

    if (introState === 'flying-in') {
      t1 = setTimeout(() => {
        setIntroState('dropping-threads')
      }, 2000)
    } else if (introState === 'dropping-threads') {
      t2 = setTimeout(() => {
        setIntroState('revealing')
      }, 1200)
    } else if (introState === 'revealing') {
      t3 = setTimeout(() => {
        setIntroState('flying-out')
      }, 1500)
    } else if (introState === 'flying-out') {
      t4 = setTimeout(() => {
        setIntroState('done')
      }, 1500)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [introState])

  const messageLength = form.message.length
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_ji7xw7p'
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || ''
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''

  const minDate = useMemo(() => {
    const dt = new Date()
    const yyyy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  useEffect(() => {
    if (!isPasswordHelp) return
    const email = searchParams.get('email') || ''
    setForm((prev) => ({
      ...prev,
      workEmail: email,
      message: 'I need help accessing my Kovidam account. Please help me recover or reset my login.',
    }))
  }, [isPasswordHelp, searchParams])

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = () => {
    if (!form.fullName.trim()) return 'Please enter your full name.'
    if (!form.workEmail.trim()) return 'Please enter your work email.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.workEmail)) return 'Please enter a valid email address.'
    if (isPasswordHelp) {
      if (!form.consent) return 'Please agree to be contacted regarding your account access request.'
      if (!templateId || !publicKey) return 'EmailJS is not configured. Add template and public key in frontend env.'
      return ''
    }
    if (!form.phoneNumber.trim()) return 'Please enter your phone number.'
    if (!/^[+0-9()\-\s]{7,20}$/.test(form.phoneNumber)) return 'Please enter a valid phone number.'
    if (!form.preferredDate) return 'Please choose your preferred date.'
    if (!form.preferredTime) return 'Please choose your preferred time.'
    if (!form.consent) return 'Please agree to be contacted regarding your inquiry.'
    if (!templateId || !publicKey) return 'EmailJS is not configured. Add template and public key in frontend env.'
    return ''
  }

  const buildTemplateParams = (actionType) => ({
    // Existing explicit keys
    title: actionType,
    action_type: actionType,
    full_name: form.fullName.trim(),
    work_email: form.workEmail.trim(),
    phone_number: form.phoneNumber.trim(),
    company: form.company.trim() || 'Not provided',
    preferred_date: form.preferredDate,
    preferred_time: form.preferredTime,
    timezone: form.timezone,
    message: form.message.trim() || 'No additional message.',
    source: 'Kovidam Contact Page',
    submitted_at: new Date().toISOString(),
    // Common EmailJS aliases for compatibility with typical templates
    from_name: form.fullName.trim(),
    from_email: form.workEmail.trim(),
    reply_to: form.workEmail.trim(),
    phone: form.phoneNumber.trim(),
    name: form.fullName.trim(),
    email: form.workEmail.trim(),
    date: form.preferredDate,
    time: form.preferredTime,
    platform: form.platform,
    inquiry_type: actionType,
    // Additional aliases commonly used in EmailJS templates
    user_name: form.fullName.trim(),
    user_email: form.workEmail.trim(),
    user_phone: form.phoneNumber.trim(),
    company_name: form.company.trim() || 'Not provided',
    preferred_date_raw: form.preferredDate,
    preferred_time_raw: form.preferredTime,
    preferred_datetime: `${form.preferredDate} ${form.preferredTime} ${form.timezone}`,
    to_email: 'kovidam26@gmail.com',
    to_name: 'Kovidam Team',
  })

  const submit = async (actionType) => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await emailjs.send(serviceId, templateId, buildTemplateParams(actionType), { publicKey })
      setSuccess(isPasswordHelp ? 'Account help request sent. We will contact you by email.' : 'Request sent successfully. We will confirm your slot by email.')
      setForm(INITIAL_FORM)
    } catch (err) {
      const status = err?.status
      const providerText = String(err?.text || '').toLowerCase()

      if (status === 400 && providerText.includes('template')) {
        setError('EmailJS template is invalid or missing variables. Please check template configuration.')
      } else if (status === 401 || status === 403) {
        setError('EmailJS authorization failed. Check public key and allowed domain in EmailJS settings.')
      } else if (status === 404 && providerText.includes('service')) {
        setError('EmailJS service ID not found. Please verify your service ID.')
      } else if (status === 404 && providerText.includes('template')) {
        setError('EmailJS template ID not found. Please verify your template ID.')
      } else if (providerText.includes('network') || providerText.includes('failed to fetch')) {
        setError('Network error while contacting EmailJS. Check internet and try again.')
      } else {
        setError(`Failed to send request. ${err?.text ? `EmailJS: ${err.text}` : 'Please try again in a moment.'}`)
      }
      // Keep this log for quick diagnosis in browser devtools.
      // eslint-disable-next-line no-console
      console.error('EmailJS send error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {introState !== 'done' && (
        <>
          <div className={`intro-airplane-wrapper ${introState}`}>
            <div className="airplane-3d">
              <svg viewBox="0 0 100 100" className="airplane-svg">
                <defs>
                  <linearGradient id="left-wing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#c3c0ff" />
                    <stop offset="50%" stopColor="#7a70ff" />
                    <stop offset="100%" stopColor="#4f40ff" />
                  </linearGradient>
                  <linearGradient id="right-wing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#a39eff" />
                    <stop offset="100%" stopColor="#6e60ff" />
                  </linearGradient>
                  <linearGradient id="left-body" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4139b8" />
                    <stop offset="100%" stopColor="#1c1675" />
                  </linearGradient>
                  <linearGradient id="right-body" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#534abf" />
                    <stop offset="100%" stopColor="#28208a" />
                  </linearGradient>
                </defs>
                <path d="M50,15 L15,70 L50,55 Z" fill="url(#left-wing)" />
                <path d="M50,15 L50,55 L38,62 Z" fill="url(#left-body)" />
                <path d="M50,15 L85,70 L50,55 Z" fill="url(#right-wing)" />
                <path d="M50,15 L50,55 L62,62 Z" fill="url(#right-body)" />
              </svg>
              <div className="airplane-trail" />
            </div>
          </div>
          <div className={`intro-thread thread-left ${introState}`} />
          <div className={`intro-thread thread-right ${introState}`} />
          <button className="skip-intro-btn" onClick={skipIntro}>
            Skip Intro
          </button>
        </>
      )}
      <section className="contact-page">
        <div className="contact-bg-glow" />
        <div className={`contact-wrapper ${introState !== 'done' ? 'intro-animating' : ''} intro-${introState}`}>
          <div className="contact-left">
            <h2>
              Schedule a <span>Demo</span>
              {introState === 'done' && (
                <button className="replay-intro-btn" onClick={replayIntro} title="Replay intro animation">
                  <Rocket size={16} />
                </button>
              )}
            </h2>
            <p>
              {isPasswordHelp
                ? 'Tell us which account needs help and our team will follow up with access support.'
                : 'Learn how Kovidam AI hiring intelligence helps you find the best engineering talent faster and with confidence.'}
            </p>

            <div className="contact-badges">
              <div><ShieldCheck size={16} /> Secure &amp; Compliant</div>
              <div><Sparkles size={16} /> AI-Powered Accuracy</div>
              <div><Rocket size={16} /> Faster Shortlisting</div>
            </div>

            <div className="contact-details">
              <div className="detail-item">
                <div className="icon-wrap"><Mail size={20} /></div>
                <div>
                  <h4>Contact</h4>
                  <p>kovidam26@gmail.com</p>
                </div>
              </div>
              <div className="detail-item">
                <div className="icon-wrap"><Phone size={20} /></div>
                <div>
                  <h4>Phone</h4>
                  <p>9720613333</p>
                </div>
              </div>
              <div className="detail-item">
                <div className="icon-wrap"><MapPin size={20} /></div>
                <div>
                  <h4>Location</h4>
                  <p>Bengaluru, India</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-card glass-panel">
            <div className="form-heading">
              <div className="head-icon"><CalendarDays size={24} /></div>
              <div>
                <h3>Book Your <span>Demo Slot</span></h3>
                <p>{isPasswordHelp ? 'Account access support request' : 'Fill in the details below and we will take care of the rest.'}</p>
              </div>
            </div>

            <div className="contact-grid">
              <label className="premium-input-group">
                <span>Full Name *</span>
                <User className="premium-input-icon" />
                <input className="premium-input" value={form.fullName} onChange={(e) => onChange('fullName', e.target.value)} placeholder="Enter your full name" />
              </label>

              <label className="premium-input-group">
                <span>Work Email *</span>
                <Mail className="premium-input-icon" />
                <input className="premium-input" value={form.workEmail} onChange={(e) => onChange('workEmail', e.target.value)} placeholder="name@company.com" />
              </label>

              <label className="premium-input-group">
                <span>Phone Number {isPasswordHelp ? '' : '*'}</span>
                <Phone className="premium-input-icon" />
                <input className="premium-input" value={form.phoneNumber} onChange={(e) => onChange('phoneNumber', e.target.value)} placeholder="+91 98765 43210" />
              </label>

              <label className="premium-input-group">
                <span>Company</span>
                <Building2 className="premium-input-icon" />
                <input className="premium-input" value={form.company} onChange={(e) => onChange('company', e.target.value)} placeholder="Your company name" />
              </label>

              <div className="date-time-wrap">
                <label className="premium-input-group">
                  <span>Preferred Date {isPasswordHelp ? '' : '*'}</span>
                  <CalendarDays className="premium-input-icon" size={18} />
                  <input 
                    type="date" 
                    min={minDate} 
                    className="premium-input date-input" 
                    value={form.preferredDate} 
                    onChange={(e) => onChange('preferredDate', e.target.value)} 
                    onClick={(e) => e.target.showPicker?.()}
                  />
                </label>
                <small>{isPasswordHelp ? 'Optional for account help' : 'We will confirm your slot by email'}</small>
              </div>

              <div className="date-time-wrap">
                <label className="premium-input-group">
                  <span>Preferred Time {isPasswordHelp ? '' : '*'}</span>
                  <Clock3 className="premium-input-icon" size={18} />
                  <input 
                    type="time" 
                    className="premium-input time-input" 
                    value={form.preferredTime} 
                    onChange={(e) => onChange('preferredTime', e.target.value)} 
                    onClick={(e) => e.target.showPicker?.()}
                  />
                </label>
                <small>{isPasswordHelp ? 'Optional for account help' : 'We will confirm your slot by email'}</small>
              </div>
            </div>

            <label className="premium-input-group">
              <span>Platform *</span>
              <Layout className="premium-input-icon" />
              <select className="premium-input select-input" value={form.platform} onChange={(e) => onChange('platform', e.target.value)}>
                <option value="Kovidam Skill Graph">Kovidam Skill Graph</option>
                <option value="Kovidam AI Interview">Kovidam AI Interview</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="premium-input-group">
              <span>Timezone</span>
              <Globe className="premium-input-icon" />
              <select className="premium-input select-input" value={form.timezone} onChange={(e) => onChange('timezone', e.target.value)}>
                <option value="IST">IST - India Standard Time (GMT +5:30)</option>
                <option value="GST">GST - Gulf Standard Time (GMT +4:00)</option>
              </select>
            </label>

            <label className="premium-input-group">
              <span>Message</span>
              <MessageSquare className="premium-input-icon" style={{ top: '2.8rem' }} />
              <textarea
                className="premium-input"
                rows={4}
                maxLength={500}
                value={form.message}
                onChange={(e) => onChange('message', e.target.value)}
                placeholder="Tell us about your hiring needs or any specific requirements..."
              />
              <small className="counter">{messageLength}/500</small>
            </label>

            <label className="consent-row">
              <input type="checkbox" checked={form.consent} onChange={(e) => onChange('consent', e.target.checked)} />
              <span>I agree to be contacted regarding my inquiry.</span>
            </label>

            {error && <div className="form-notice error">{error}</div>}
            {success && <div className="form-notice success">{success}</div>}


            <div className="contact-actions">
              <button className="btn-premium btn-primary" disabled={isSubmitting} onClick={() => void submit(isPasswordHelp ? 'Account Access Help' : 'Book Demo')}>
                <CalendarDays size={18} /> {isSubmitting ? 'Sending...' : (isPasswordHelp ? 'Request Account Help' : 'Book Demo')}
              </button>
              <button className="btn-premium btn-secondary" disabled={isSubmitting} onClick={() => void submit('Send Inquiry')}>
                <Send size={18} /> {isSubmitting ? 'Sending...' : 'Send Inquiry'}
              </button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}

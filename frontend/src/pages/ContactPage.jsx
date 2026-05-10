import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import './ContactPage.css'

const INITIAL_FORM = {
  fullName: '',
  workEmail: '',
  phoneNumber: '',
  company: '',
  preferredDate: '',
  preferredTime: '',
  timezone: 'IST',
  message: '',
  consent: false,
}

export default function ContactPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateForm = () => {
    if (!form.fullName.trim()) return 'Please enter your full name.'
    if (!form.workEmail.trim()) return 'Please enter your work email.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.workEmail)) return 'Please enter a valid email address.'
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
      setSuccess('Request sent successfully. We will confirm your slot by email.')
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
    <section className="contact-page">
      <div className="contact-bg-glow" />
      <div className="contact-wrapper">
        <div className="contact-left">
          <h2>Schedule a <span>Demo</span></h2>
          <p>
            Learn how Kovidam AI hiring intelligence helps you find the best engineering
            talent faster and with confidence.
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
              <h3>Book Your Demo Slot</h3>
              <p>Fill in the details below and we will take care of the rest.</p>
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
              <span>Phone Number *</span>
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
                <span>Preferred Date *</span>
                <input type="date" min={minDate} className="premium-input plain-input" value={form.preferredDate} onChange={(e) => onChange('preferredDate', e.target.value)} />
                <CalendarDays className="field-end-icon" size={16} />
              </label>
              <small>We will confirm your slot by email</small>
            </div>

            <div className="date-time-wrap">
              <label className="premium-input-group">
                <span>Preferred Time *</span>
                <input type="time" className="premium-input plain-input" value={form.preferredTime} onChange={(e) => onChange('preferredTime', e.target.value)} />
                <Clock3 className="field-end-icon" size={16} />
              </label>
              <small>We will confirm your slot by email</small>
            </div>
          </div>

          <label className="premium-input-group">
            <span>Timezone</span>
            <select className="premium-input plain-input select-input" value={form.timezone} onChange={(e) => onChange('timezone', e.target.value)}>
              <option value="IST">IST - India Standard Time (GMT +5:30)</option>
              <option value="GST">GST - Gulf Standard Time (GMT +4:00)</option>
            </select>
          </label>

          <label className="premium-input-group">
            <span>Message</span>
            <textarea
              className="premium-input plain-input"
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
          {!success && (
            <div className="form-notice" style={{ marginTop: 8, color: '#94a3b8' }}>
              Using EmailJS config: service=`{serviceId || 'missing'}`, template=`{templateId || 'missing'}`
            </div>
          )}

          <div className="contact-actions">
            <button className="btn-premium btn-primary" disabled={isSubmitting} onClick={() => void submit('Book Demo')}>
              <CalendarDays size={18} /> {isSubmitting ? 'Sending...' : 'Book Demo'}
            </button>
            <button className="btn-premium btn-secondary" disabled={isSubmitting} onClick={() => void submit('Send Inquiry')}>
              <Send size={18} /> {isSubmitting ? 'Sending...' : 'Send Inquiry'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

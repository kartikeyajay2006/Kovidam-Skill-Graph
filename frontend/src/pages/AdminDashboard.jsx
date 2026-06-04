import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileCheck2,
  Filter,
  Flame,
  Gauge,
  Building2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from '../utils/api'
import './AdminDashboard.css'

function formatDate(dateString) {
  if (!dateString) return 'Not available'
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

function timeAgo(dateString) {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Never'
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num))
}

function formatCount(value) {
  return Number(value || 0).toLocaleString()
}

function getActivityLevel(company) {
  const shortlistCount = Number(company.shortlist_count || 0)
  const candidateCount = Number(company.candidate_count || 0)
  const engagement = candidateCount > 0 ? shortlistCount / candidateCount : 0

  if (!company.last_activity_at) return { label: 'Dormant', tone: 'muted' }
  if (engagement >= 0.75 || shortlistCount >= 5) return { label: 'Very Active', tone: 'hot' }
  if (engagement >= 0.25 || shortlistCount >= 2) return { label: 'Active', tone: 'good' }
  return { label: 'Warm', tone: 'warm' }
}

function StatCard({ label, value, icon: Icon, subtext, accentClass }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`admin-stat-card ${accentClass || ''}`}
    >
      <div className="admin-stat-icon">
        <Icon size={22} />
      </div>
      <div className="admin-stat-copy">
        <span className="admin-stat-label">{label}</span>
        <strong className="admin-stat-value">{value}</strong>
        {subtext ? <span className="admin-stat-subtext">{subtext}</span> : null}
      </div>
    </motion.div>
  )
}

function CompanyCard({ company, selected, onSelect }) {
  const level = getActivityLevel(company)
  const shortlistCount = Number(company.shortlist_count || 0)
  const candidateCount = Number(company.candidate_count || 0)
  const shortlistedResumes = Number(company.total_shortlisted_resumes || 0)
  const activityRatio = candidateCount > 0 ? clamp((shortlistedResumes / candidateCount) * 100, 0, 100) : 0

  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      onClick={() => onSelect(company.user_id)}
      className={`admin-company-card ${selected ? 'is-selected' : ''}`}
    >
      <div className="admin-company-card__top">
        <div className="admin-company-card__titleblock">
          <div className="admin-company-badge">
            <Building2 size={16} />
          </div>
          <div>
            <div className="admin-company-name">{company.company_name || 'Unnamed workspace'}</div>
            <div className="admin-company-meta">
              {company.job_title || 'No job title'} · {company.company_size || 'Size not set'}
            </div>
          </div>
        </div>
        <span className={`admin-tone admin-tone--${level.tone}`}>{level.label}</span>
      </div>

      <div className="admin-company-card__mid">
        <div className="admin-company-owner">{company.full_name || 'Unknown owner'}</div>
        <div className="admin-company-email">{company.work_email || 'No email available'}</div>
      </div>

      <div className="admin-company-stats">
        <div>
          <span>Shortlists</span>
          <strong>{formatCount(shortlistCount)}</strong>
        </div>
        <div>
          <span>Resumes</span>
          <strong>{formatCount(shortlistedResumes)}</strong>
        </div>
        <div>
          <span>Candidates</span>
          <strong>{formatCount(candidateCount)}</strong>
        </div>
      </div>

      <div className="admin-company-bar">
        <div className="admin-company-bar__label">
          <span>Activity footprint</span>
          <span>{Math.round(activityRatio)}%</span>
        </div>
        <div className="admin-company-bar__track">
          <div className="admin-company-bar__fill" style={{ width: `${activityRatio}%` }} />
        </div>
      </div>

      <div className="admin-company-footer">
        <span>{company.latest_role || 'No recent role'}</span>
        <span>{timeAgo(company.last_activity_at)}</span>
      </div>
    </motion.button>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState('all')

  const loadOverview = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await authFetch('/admin/overview')
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const data = await response.json()
      setOverview(data)
      const firstCompany = data?.companies?.[0]
      if (!selectedUserId && firstCompany?.user_id) {
        setSelectedUserId(firstCompany.user_id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load admin overview.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summary = overview?.summary || {
    total_companies: 0,
    active_companies: 0,
    total_candidates: 0,
    total_shortlists: 0,
    total_shortlisted_resumes: 0,
  }

  const companiesSorted = useMemo(() => {
    return [...(overview?.companies || [])].sort((a, b) => {
      const aTime = new Date(a.last_activity_at || 0).getTime()
      const bTime = new Date(b.last_activity_at || 0).getTime()
      return bTime - aTime
    })
  }, [overview])

  const filteredCompanies = useMemo(() => {
    const term = query.trim().toLowerCase()

    let list = companiesSorted
    if (viewMode === 'active') {
      list = list.filter((company) => company.is_active)
    } else if (viewMode === 'inactive') {
      list = list.filter((company) => !company.is_active)
    } else if (viewMode === 'hot') {
      list = list.filter((company) => Number(company.shortlist_count || 0) >= 3)
    } else if (viewMode === 'recent') {
      list = list.slice(0, 8)
    }

    if (!term) return list

    return list.filter((company) => {
      return [
        company.company_name,
        company.full_name,
        company.work_email,
        company.job_title,
        company.company_size,
        company.hiring_volume,
        company.latest_role,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [companiesSorted, query, viewMode])

  const selectedCompany = filteredCompanies.find((company) => company.user_id === selectedUserId) || filteredCompanies[0] || null

  useEffect(() => {
    if (!selectedCompany?.user_id) return
    setSelectedUserId(selectedCompany.user_id)
  }, [selectedCompany?.user_id])

  const totalRecentShortlists = useMemo(() => {
    return (overview?.recent_shortlists || []).length
  }, [overview])

  const statCards = [
    {
      label: 'Companies signed up',
      value: formatCount(summary.total_companies),
      icon: Building2,
      subtext: 'All workspace profiles stored in the platform',
      accentClass: 'accent-indigo',
    },
    {
      label: 'Active companies',
      value: formatCount(summary.active_companies),
      icon: ShieldCheck,
      subtext: 'Workspaces with recent activity',
      accentClass: 'accent-green',
    },
    {
      label: 'Total candidates',
      value: formatCount(summary.total_candidates),
      icon: Users,
      subtext: 'Candidate rows indexed across tenants',
      accentClass: 'accent-orange',
    },
    {
      label: 'Shortlist runs',
      value: formatCount(summary.total_shortlists),
      icon: Briefcase,
      subtext: 'Completed shortlists across all companies',
      accentClass: 'accent-amber',
    },
    {
      label: 'Resumes shortlisted',
      value: formatCount(summary.total_shortlisted_resumes),
      icon: FileCheck2,
      subtext: 'Total ranked candidates returned',
      accentClass: 'accent-cyan',
    },
  ]

  const filterChips = [
    { key: 'all', label: `All ${formatCount(summary.total_companies)}` },
    { key: 'active', label: `Active ${formatCount(summary.active_companies)}` },
    { key: 'hot', label: 'High activity' },
    { key: 'recent', label: 'Recent' },
    { key: 'inactive', label: 'Dormant' },
  ]

  return (
    <div className="admin-dashboard-shell">
      <div className="admin-dashboard-aurora" />
      <div className="admin-dashboard-grid" />

      <motion.section
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-hero glass-panel"
      >
        <div className="admin-hero__copy">
          <div className="admin-hero__eyebrow">
            <Sparkles size={14} />
            Platform control center
          </div>
          <h1>Admin control room for every company on Kovidam</h1>
          <p>
            A high-density, read-only view of signed-up workspaces, shortlist activity, and hiring
            signal across the platform.
          </p>

          <div className="admin-hero__chips">
            <span className="admin-chip">
              <Clock3 size={14} />
              Last refresh: {loading ? 'syncing…' : 'live'}
            </span>
            <span className="admin-chip">
              <Activity size={14} />
              Recent shortlist runs: {formatCount(totalRecentShortlists)}
            </span>
            <span className="admin-chip">
              <Gauge size={14} />
              Read-only access
            </span>
          </div>
        </div>

        <div className="admin-hero__actions">
          <button onClick={() => navigate('/dashboard')} className="btn-premium admin-back-btn">
            <ArrowLeft size={16} />
            Back to hub
          </button>
          <button onClick={loadOverview} className="btn-premium btn-primary admin-refresh-btn">
            <RefreshCcw size={16} />
            Refresh data
          </button>
        </div>
      </motion.section>

      {error ? <div className="admin-alert glass-panel">{error}</div> : null}

      <section className="admin-stat-grid">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="admin-layout">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-panel glass-panel admin-panel--directory"
        >
          <div className="admin-panel__header">
            <div>
              <h2>Workspace index</h2>
              <p>Search and inspect company activity without leaving the page.</p>
            </div>

            <div className="admin-search-shell">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company, email, role..."
              />
            </div>
          </div>

          <div className="admin-filter-row">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setViewMode(chip.key)}
                className={`admin-filter-chip ${viewMode === chip.key ? 'is-active' : ''}`}
              >
                <Filter size={14} />
                {chip.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state__ring">
                <RefreshCcw size={22} />
              </div>
              <h3>Loading company data</h3>
              <p>We are pulling workspace and shortlist activity into the dashboard.</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state__ring">
                <Building2 size={22} />
              </div>
              <h3>No companies found</h3>
              <p>
                If you just created the admin account, sign in with a recruiter account and save a
                profile once so it can appear here.
              </p>
            </div>
          ) : (
            <div className="admin-company-list">
              {filteredCompanies.map((company, index) => (
                <CompanyCard
                  key={company.user_id}
                  company={company}
                  selected={company.user_id === selectedCompany?.user_id}
                  onSelect={setSelectedUserId}
                />
              ))}
            </div>
          )}
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-panel glass-panel admin-panel--detail"
        >
          {selectedCompany ? (
            <>
              <div className="admin-detail-hero">
                <div className="admin-detail-hero__icon">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h2>{selectedCompany.company_name || 'Workspace detail'}</h2>
                  <p>
                    {selectedCompany.job_title || 'No role set'} · {selectedCompany.company_size || 'Size not set'}
                  </p>
                </div>
              </div>

              <div className="admin-detail-badges">
                <span className={`admin-tone admin-tone--${getActivityLevel(selectedCompany).tone}`}>
                  {getActivityLevel(selectedCompany).label}
                </span>
                <span className="admin-pill">
                  <CalendarDays size={14} />
                  {timeAgo(selectedCompany.last_activity_at)}
                </span>
              </div>

              <div className="admin-detail-grid">
                <div className="admin-detail-card">
                  <span>Workspace owner</span>
                  <strong>{selectedCompany.full_name || 'Unknown'}</strong>
                </div>
                <div className="admin-detail-card">
                  <span>Work email</span>
                  <strong>{selectedCompany.work_email || 'Not provided'}</strong>
                </div>
                <div className="admin-detail-card">
                  <span>Hiring volume</span>
                  <strong>{selectedCompany.hiring_volume || 'Not provided'}</strong>
                </div>
                <div className="admin-detail-card">
                  <span>Latest role</span>
                  <strong>{selectedCompany.latest_role || 'No activity yet'}</strong>
                </div>
              </div>

              <div className="admin-metric-stack">
                <div className="admin-mini-metric">
                  <div>
                    <span>Candidates</span>
                    <strong>{formatCount(selectedCompany.candidate_count)}</strong>
                  </div>
                  <div className="admin-mini-metric__icon">
                    <Users size={16} />
                  </div>
                </div>
                <div className="admin-mini-metric">
                  <div>
                    <span>Shortlist runs</span>
                    <strong>{formatCount(selectedCompany.shortlist_count)}</strong>
                  </div>
                  <div className="admin-mini-metric__icon">
                    <Briefcase size={16} />
                  </div>
                </div>
                <div className="admin-mini-metric">
                  <div>
                    <span>Resumes shortlisted</span>
                    <strong>{formatCount(selectedCompany.total_shortlisted_resumes)}</strong>
                  </div>
                  <div className="admin-mini-metric__icon">
                    <FileCheck2 size={16} />
                  </div>
                </div>
              </div>

              <div className="admin-activity-meter">
                <div className="admin-activity-meter__header">
                  <span>Activity footprint</span>
                  <span>
                    {selectedCompany.candidate_count > 0
                      ? `${Math.round((Number(selectedCompany.total_shortlisted_resumes || 0) / Number(selectedCompany.candidate_count || 1)) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="admin-activity-meter__track">
                  <div
                    className="admin-activity-meter__fill"
                    style={{
                      width: `${selectedCompany.candidate_count > 0
                        ? clamp((Number(selectedCompany.total_shortlisted_resumes || 0) / Number(selectedCompany.candidate_count || 1)) * 100, 8, 100)
                        : 8
                      }%`,
                    }}
                  />
                </div>
                <p>
                  This is a read-only operational signal based on shortlisted candidates versus the
                  candidate pool.
                </p>
              </div>

              <div className="admin-detail-section">
                <div className="admin-detail-section__heading">
                  <h3>Recent shortlist activity</h3>
                  <ChevronRight size={16} />
                </div>
                <div className="admin-activity-list">
                  {(selectedCompany.recent_shortlists || []).length === 0 ? (
                    <div className="admin-activity-empty">
                      No shortlist records captured for this workspace yet.
                    </div>
                  ) : (
                    selectedCompany.recent_shortlists.map((shortlist) => (
                      <div key={shortlist.id} className="admin-activity-item">
                        <div className="admin-activity-item__dot" />
                        <div>
                          <strong>{shortlist.role || 'Unknown role'}</strong>
                          <span>{formatDate(shortlist.date)}</span>
                        </div>
                        <em>{formatCount(shortlist.matches)} shortlisted</em>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="admin-empty-state admin-empty-state--detail">
              <div className="admin-empty-state__ring">
                <ShieldCheck size={22} />
              </div>
              <h3>Select a workspace</h3>
              <p>Choose a company on the left to inspect its profile and shortlist history.</p>
            </div>
          )}
        </motion.aside>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-panel glass-panel admin-panel--timeline"
      >
        <div className="admin-panel__header">
          <div>
            <h2>Recent platform activity</h2>
            <p>Latest shortlist runs across the platform.</p>
          </div>
          <div className="admin-panel__header-badge">
            <Flame size={14} />
            Live feed
          </div>
        </div>

        <div className="admin-timeline">
          {(overview?.recent_shortlists || []).length === 0 ? (
            <div className="admin-empty-strip">
              Nothing has been shortlisted yet. Once companies start using Kovidam, the activity feed will appear here.
            </div>
          ) : (
            overview.recent_shortlists.map((item, index) => (
              <div className="admin-timeline-row" key={`${item.user_id}-${item.id}`}>
                <div className="admin-timeline-row__index">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="admin-timeline-row__content">
                  <strong>{item.company_name || 'Unnamed company'}</strong>
                  <span>{item.role || 'Unknown role'}</span>
                </div>
                <div className="admin-timeline-row__meta">
                  <span>{formatDate(item.date)}</span>
                  <span>{formatCount(item.matches)} shortlisted</span>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.section>
    </div>
  )
}

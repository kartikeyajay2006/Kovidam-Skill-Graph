import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Zap, 
  Search,
  ArrowRight,
  Activity
} from 'lucide-react';

export default function DashboardHub() {
  const navigate = useNavigate();

  const [metricsData, setMetricsData] = React.useState({
    total_candidates: 0,
    shortlists_completed: 0,
    pending_reviews: 0
  });
  const [recentShortlists, setRecentShortlists] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/hiring/dashboard-metrics')
      .then(res => res.json())
      .then(data => {
        if (data.metrics) {
          setMetricsData(data.metrics);
        }
        if (data.recent_shortlists) {
          setRecentShortlists(data.recent_shortlists);
        }
      })
      .catch(err => console.error("Error fetching dashboard metrics:", err))
      .finally(() => setLoading(false));
  }, []);

  // Use the fetched data
  const companyName = "Acme Corp"; // Can also be fetched later
  const metrics = [
    { id: 1, label: "Total Candidates Analyzed", value: metricsData.total_candidates.toLocaleString(), icon: Users, color: "#818cf8", bg: "rgba(129, 140, 248, 0.15)" },
    { id: 2, label: "Shortlists Completed", value: metricsData.shortlists_completed.toLocaleString(), icon: CheckCircle2, color: "#34d399", bg: "rgba(52, 211, 153, 0.15)" },
    { id: 3, label: "Pending Reviews", value: metricsData.pending_reviews.toLocaleString(), icon: Clock, color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)" }
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', borderRadius: '100px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
              System Operational
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#f8fafc', fontWeight: '700' }}>
            Welcome back, <span style={{ color: '#818cf8' }}>{companyName}</span>
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '1.1rem' }}>
            Here is what's happening with your hiring pipeline today.
          </p>
        </div>
      </motion.div>

      {/* Metrics Row */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}
      >
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <motion.div 
              key={m.id}
              whileHover={{ y: -5, background: 'rgba(255,255,255,0.05)' }}
              className="glass-panel"
              style={{ padding: '1.75rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'default' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                <Icon size={32} />
              </div>
              <div>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem', fontWeight: '500' }}>{m.label}</p>
                <h3 style={{ margin: '0.25rem 0 0 0', color: '#f8fafc', fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {m.value}
                  {idx === 0 && <TrendingUp size={20} color="#34d399" />}
                </h3>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Responsive main layout: recent activity takes more space, quick actions stack beautifully */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          {/* Recent Activity */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel"
            style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', gridColumn: 'span 2 / auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={22} color="#818cf8" />
                Recent Shortlists
              </h3>
              <button className="btn-premium" style={{ background: 'transparent', border: 'none', padding: '0.5rem 1rem', fontSize: '0.95rem' }} onClick={() => navigate('/dashboard/history')}>
                View All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentShortlists.map((role) => (
                <div key={role.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: '#e2e8f0', fontSize: '1.1rem' }}>{role.role}</h4>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {role.date && role.date !== "Recently" ? new Date(role.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : role.date || 'Recently'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px' }}>
                    <Users size={16} color="#94a3b8" />
                    <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{role.matches} Matches</span>
                  </div>

                  <div style={{ width: '100px' }}>
                    {role.status === 'completed' ? (
                      <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Completed</span>
                    ) : (
                      <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>In Process</span>
                    )}
                  </div>

                  <button className="btn-premium" style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }} onClick={() => navigate('/dashboard/history/' + role.id)}>
                    <ArrowRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel"
            style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.35rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Zap size={22} color="#facc15" />
              Quick Actions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <motion.button
                whileHover={{ scale: 1.02, background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard/shortlist')}
                style={{
                  width: '100%',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  background: 'rgba(79, 70, 229, 0.15)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Briefcase size={24} color="#818cf8" />
                  <ArrowRight size={20} color="rgba(255,255,255,0.5)" />
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: '600', marginTop: '0.5rem' }}>New Shortlist</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Upload resumes and evaluate candidates instantly.</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard/search')}
                style={{
                  width: '100%',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Search size={24} color="#94a3b8" />
                  <ArrowRight size={20} color="rgba(255,255,255,0.5)" />
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: '600', marginTop: '0.5rem' }}>Semantic Search</span>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Find specific talent from your entire pool.</span>
              </motion.button>
            </div>
          </motion.div>
        </div>

      </div>

    </div>
  );
}

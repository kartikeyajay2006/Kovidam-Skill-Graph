import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, ArrowRight, ArrowLeft } from 'lucide-react';

export default function AllShortlistsPage() {
  const navigate = useNavigate();
  const [shortlists, setShortlists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/hiring/shortlists')
      .then(res => res.json())
      .then(data => {
        setShortlists(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
      >
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-premium"
          style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <ArrowLeft size={18} color="#e2e8f0" />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity color="#818cf8" size={28} />
            All Shortlists
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem', marginTop: '4px' }}>
            A complete history of all candidate evaluation sessions.
          </p>
        </div>
      </motion.div>

      {/* List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-panel"
        style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem 0' }}>Loading history...</div>
        ) : shortlists.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem 0' }}>No shortlists found. Create your first shortlist from the dashboard!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {shortlists.map((role, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={role.id} 
                style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#e2e8f0', fontSize: '1.1rem' }}>{role.role}</h4>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{role.date}</span>
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

                <button 
                  className="btn-premium" 
                  style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }} 
                  onClick={() => navigate('/dashboard/history/' + role.id)}
                >
                  <ArrowRight size={18} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}

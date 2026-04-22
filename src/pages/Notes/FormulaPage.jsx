import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFormulas } from '../../services/db';
import { FunctionSquare, ChevronRight, Hash, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FormulaPage() {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getFormulas(user.id).then(({ data }) => {
        setFormulas(data || []);
        setLoading(false);
      });
    }
  }, [user]);

  // Group by topic
  const grouped = formulas.reduce((acc, f) => {
    if (!acc[f.topic_id]) acc[f.topic_id] = [];
    acc[f.topic_id].push(f);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Formula Cheat Sheet</h1>
        <p>Quick reference guide for all your saved equations and identities</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" /></div>
      ) : formulas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <FunctionSquare size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
          <h3>No formulas saved yet</h3>
          <p>Go to your Notes and create a "Formula" type entry to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
          {Object.entries(grouped).map(([topic, items]) => (
            <motion.div 
              key={topic} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="card" style={{ padding: 0, overflow: 'hidden' }}
            >
              <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Hash size={14} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{topic.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.map(f => (
                  <div key={f.id} style={{ borderLeft: '2px solid var(--violet)', paddingLeft: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {f.title}
                    </div>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--violet)', 
                      fontFamily: 'monospace', background: 'rgba(139, 92, 246, 0.05)',
                      padding: '8px', borderRadius: 4
                    }}>
                      {f.content}
                    </pre>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

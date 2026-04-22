import { Settings, Download, Trash2, Database, AlertOctagon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSessions, getTopicStats, getNotes, getStreak, getMockTests } from '../../services/db';
import { supabase } from '../../supabaseClient';

export default function AdminPage() {
  const { user } = useAuth();
  const { show } = useToast();

  const handleExport = async () => {
    show('Gathering your data...', 'info');
    const [sessions, stats, notes, streak, mocks] = await Promise.all([
      getSessions(user.id, 1000),
      getTopicStats(user.id),
      getNotes(user.id),
      getStreak(user.id),
      getMockTests(user.id)
    ]);

    const fullData = {
      user_email: user.email,
      export_date: new Date().toISOString(),
      data: {
        sessions: sessions.data,
        topic_stats: stats.data,
        notes: notes.data,
        streak: streak.data,
        mock_tests: mocks.data
      }
    };

    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAT_Tracker_Export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    show('Data exported successfully!', 'success');
  };

  const resetStats = async () => {
    if (!window.confirm('CRITICAL: This will reset all your topic accuracy and study history statistics. This cannot be undone. Proceed?')) return;
    
    // In a real app we'd call a RPC or delete rows.
    // For now, let's just delete session and topic_stats rows for this user.
    show('Resetting data...', 'info');
    
    const { error: err1 } = await supabase.from('sessions').delete().eq('user_id', user.id);
    const { error: err2 } = await supabase.from('topic_stats').delete().eq('user_id', user.id);
    
    if (!err1 && !err2) {
      show('Stats reset. Refreshing page...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      show('Error resetting data', 'error');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Admin & Data Controls</h1>
        <p>Manage your raw data and application preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} color="var(--accent)" /> Data Management
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
            Take your data with you. Export all your study sessions, notes, and mock test scores in a structured JSON format.
          </p>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={16} /> Export Backup (JSON)
          </button>
        </div>

        <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red)' }}>
            <AlertOctagon size={20} color="var(--red)" /> Danger Zone
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
            Restarting your preparation? This will wipe your progress statistics while keeping your account and profile intact.
          </p>
          <button className="btn btn-secondary" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={resetStats}>
            <Trash2 size={16} /> Reset Preparation Progress
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Syllabus Settings</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          You are currently using the **Standard CAT 2026 Syllabus**. Custom topics and section weightage adjustments are coming soon.
        </p>
      </div>
    </div>
  );
}

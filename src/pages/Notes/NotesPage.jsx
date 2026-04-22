import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getNotes, upsertNote, deleteNote } from '../../services/db';
import { ALL_TOPICS } from '../../data/syllabus';
import { 
  StickyNote, Plus, Search, Trash2, Save, 
  ExternalLink, ChevronRight, FileText, FunctionSquare,
  Book
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotesPage() {
  const { user } = useAuth();
  const { show } = useToast();
  
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeNote, setActiveNote] = useState(null);
  const [filter, setFilter] = useState('all'); // all | note | formula

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await getNotes(user.id);
    setNotes(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (note) => {
    const { data, error } = await upsertNote({ ...note, user_id: user.id });
    if (!error) {
      show('Note saved!', 'success');
      load();
      setActiveNote(data);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    const { error } = await deleteNote(id);
    if (!error) {
      show('Note deleted');
      load();
      setActiveNote(null);
    }
  };

  const createNew = (type = 'note') => {
    const fresh = {
      title: 'New Note',
      content: '',
      type: type,
      topic_id: ALL_TOPICS[0].id
    };
    setActiveNote(fresh);
  };

  const filtered = notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || n.type === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="fade-in h-full">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>Notes Hub</h1>
            <p style={{ color: 'var(--text-muted)' }}>Capture formulas and topic insights</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => createNew('formula')} style={{ background: 'var(--mint-dim)', color: 'var(--green)', border: 'none', borderRadius: 10 }}>
              <Plus size={16} /> New Formula
            </button>
            <button className="btn btn-primary" onClick={() => createNew('note')} style={{ background: 'var(--sky)', border: 'none', borderRadius: 10 }}>
              <Plus size={16} /> New Note
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, height: 'calc(100vh - 200px)' }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search..." 
                style={{ paddingLeft: 36, fontSize: 13, background: 'var(--surface-2)', border: 'none', height: 36 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 8 }}>
              {['all', 'note', 'formula'].map(t => (
                <button 
                  key={t}
                  className={`btn-tag ${filter === t ? 'active' : ''}`}
                  onClick={() => setFilter(t)}
                  style={{ 
                    flex: 1, padding: '6px', fontSize: 11, borderRadius: 6,
                    background: filter === t ? 'var(--surface)' : 'transparent',
                    color: filter === t ? 'var(--text)' : 'var(--text-dim)',
                    border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                    fontWeight: filter === t ? 600 : 500,
                    boxShadow: filter === t ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ flex: 1, overflowY: 'auto', padding: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center' }}><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                <StickyNote size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                <p style={{ fontSize: 12 }}>No entries</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.map(n => (
                  <button 
                    key={n.id}
                    className={`nav-item ${activeNote?.id === n.id ? 'active' : ''}`}
                    onClick={() => setActiveNote(n)}
                    style={{ 
                      textAlign: 'left', width: '100%', padding: '12px',
                      background: activeNote?.id === n.id ? 'var(--accent-dim)' : 'transparent',
                      border: 'none', borderRadius: 10, color: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 12
                    }}
                  >
                    <div style={{ color: n.type === 'formula' ? 'var(--accent)' : 'var(--mint)' }}>
                      {n.type === 'formula' ? <FunctionSquare size={16} /> : <FileText size={16} />}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{n.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{n.topic_id || 'General'}</div>
                    </div>
                    {activeNote?.id === n.id && <ChevronRight size={14} color="var(--text-dim)" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <AnimatePresence mode="wait">
          {activeNote ? (
            <motion.div 
              key={activeNote.id || 'new'}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 32, border: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ 
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', 
                    background: activeNote.type === 'formula' ? 'var(--accent-dim)' : 'var(--mint-dim)',
                    color: activeNote.type === 'formula' ? 'var(--sky)' : 'var(--green)',
                    padding: '4px 10px', borderRadius: 8
                  }}>
                    {activeNote.type === 'formula' ? 'Equation' : 'Summary'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {activeNote.updated_at ? `Saved ${new Date(activeNote.updated_at).toLocaleDateString()}` : 'Unsourced'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {activeNote.id && (
                    <button className="btn btn-ghost btn-icon" style={{ color: 'var(--red)', background: 'var(--red-dim)' }} onClick={() => handleDelete(activeNote.id)}>
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={() => handleSave(activeNote)} style={{ background: 'var(--sky)', border: 'none', padding: '0 20px', height: 36, fontSize: 13 }}>
                    <Save size={16} /> Save
                  </button>
                </div>
              </div>

              <input 
                type="text" 
                className="form-input" 
                value={activeNote.title} 
                onChange={e => setActiveNote(n => ({...n, title: e.target.value}))}
                placeholder="Title..."
                style={{ fontSize: 24, fontWeight: 700, padding: 0, border: 'none', borderRadius: 0, background: 'none' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 300px) 1fr', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11 }}>Context / Topic</label>
                  <select 
                    className="form-select" 
                    value={activeNote.topic_id} 
                    onChange={e => setActiveNote(n => ({...n, topic_id: e.target.value}))}
                    style={{ background: 'var(--surface-2)', border: 'none', height: 40 }}
                  >
                    {ALL_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Content</label>
                <textarea 
                  className="form-textarea" 
                  value={activeNote.content}
                  onChange={e => setActiveNote(n => ({...n, content: e.target.value}))}
                  placeholder="Notes, derivations, shortcuts..."
                  style={{ flex: 1, resize: 'none', padding: 24, fontSize: 15, background: 'var(--surface-2)', border: 'none', borderRadius: 12, lineHeight: 1.6 }}
                />
              </div>
            </motion.div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', border: '1px dashed var(--border)', background: 'transparent' }}>
              <Book size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
              <p style={{ fontSize: 14 }}>Select or create a study note</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

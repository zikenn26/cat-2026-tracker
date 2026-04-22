import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  getMyMaterials, getSharedMaterials, uploadMaterialFile, 
  addMaterialUrl, deleteMaterial, toggleMaterialShare, 
  importMaterial, getMaterialPublicUrl 
} from '../../services/db';
import { ALL_TOPICS } from '../../data/syllabus';
import { 
  FileText, Link as LinkIcon, Plus, Globe, Lock, 
  Download, Share2, Trash2, Search, ExternalLink,
  Users, FolderOpen, Import, X, FileUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MaterialsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  
  const [tab, setTab] = useState('my'); // my | library
  const [mine, setMine] = useState([]);
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bucketError, setBucketError] = useState(false);
  
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', url: '', type: 'pdf', topic_id: '', file: null });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [m, s] = await Promise.all([
      getMyMaterials(user.id),
      getSharedMaterials(user.id)
    ]);
    setMine(m.data);
    setShared(s.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleUpload = async () => {
    if (!uploadForm.title) return show('Title required', 'error');
    setBucketError(false);
    
    let res;
    if (uploadForm.type === 'pdf') {
      if (!uploadForm.file) return show('Please select a PDF', 'error');
      show('Uploading PDF...', 'info');
      res = await uploadMaterialFile(user.id, uploadForm.file, uploadForm.title, uploadForm.topic_id);
    } else {
      if (!uploadForm.url) return show('URL required', 'error');
      res = await addMaterialUrl(user.id, uploadForm.title, uploadForm.url, uploadForm.topic_id);
    }

    if (!res.error) {
      show('Material saved!', 'success');
      setShowUpload(false);
      setUploadForm({ title: '', url: '', type: 'pdf', topic_id: '', file: null });
      loadData();
    } else {
      if (res.error.message?.includes('bucket not found') || res.error.status === 404) {
        setBucketError(true);
        show('Storage Bucket missing. See help notice.', 'error');
      } else {
        show(res.error.message, 'error');
      }
    }
  };

  const handleImport = async (item) => {
    show('Importing...', 'info');
    const { error } = await importMaterial(user.id, item);
    if (!error) {
      show('Added to your collection!', 'success');
      loadData();
    } else {
      show(error.message, 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this material?')) return;
    const { error } = await deleteMaterial(item.id, item.file_path);
    if (!error) {
      show('Deleted');
      loadData();
    }
  };

  const toggleShare = async (item) => {
    const newStatus = !item.is_shared;
    const { error } = await toggleMaterialShare(item.id, newStatus);
    if (!error) {
      show(newStatus ? 'Content shared with friends!' : 'Content is now private', 'success');
      loadData();
    }
  };

  const filteredMine = mine.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
  const filteredShared = shared.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700 }}>Library Shelves</h1>
            <p style={{ color: 'var(--text-muted)' }}>Reference materials and shared resources</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)} style={{ borderRadius: 12, padding: '12px 24px' }}>
            <Plus size={16} /> Add Material
          </button>
        </div>
      </div>

      {bucketError && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent)', marginBottom: 24, padding: '20px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ background: 'var(--accent)', padding: 10, borderRadius: '50%', color: '#fff' }}>
              <FolderOpen size={20} />
            </div>
            <div>
              <h4 style={{ color: 'var(--text)', fontSize: 15, marginBottom: 4 }}>Storage Bucket Setup Needed</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                PDF uploads require a bucket named <strong>study-materials</strong> in your Supabase Storage.
                Please ensure it exists and has the correct policies. See <code>storage_final_fix.sql</code>.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ flex: 1, padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <Search size={18} color="var(--text-dim)" />
          <input 
            type="text" 
            placeholder="Search your library..." 
            className="form-input" 
            style={{ border: 'none', background: 'transparent', padding: 10, fontSize: 14 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="btn-group" style={{ background: 'var(--surface-2)', padding: 6, borderRadius: 14, border: '1px solid var(--border)' }}>
          <button 
            className={`btn btn-sm ${tab === 'my' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('my')}
            style={tab === 'my' ? { background: 'var(--sky)', color: '#fff', border: 'none' } : { borderRadius: 10 }}
          >
            My Collection
          </button>
          <button 
            className={`btn btn-sm ${tab === 'library' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('library')}
            style={tab === 'library' ? { background: 'var(--mint)', color: '#fff', border: 'none' } : { borderRadius: 10 }}
          >
            <Users size={14} /> Shared Library
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
      ) : (
        <div className="grid-3">
          {(tab === 'my' ? filteredMine : filteredShared).map(item => (
            <MaterialCard 
              key={item.id} 
              item={item} 
              isOwn={tab === 'my'} 
              onDelete={handleDelete}
              onToggleShare={toggleShare}
              onImport={handleImport}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && (tab === 'my' ? filteredMine : filteredShared).length === 0 && (
        <div className="empty-state" style={{ padding: 80, textAlign: 'center' }}>
          <FolderOpen size={48} style={{ color: 'var(--text-dim)', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 16, color: 'var(--text-muted)' }}>No items yet</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{tab === 'my' ? "Start by adding a PDF or a helpful link." : "Items shared with you will appear here."}</p>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <div className="modal-overlay" onClick={() => setShowUpload(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, border: ' none', background: 'var(--surface)', padding: 32, borderRadius: 20, boxShadow: 'var(--shadow-lg)' }}
            >
              <div className="modal-header" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Add Resource</h3>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowUpload(false)}><X size={18} /></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Resource Type</label>
                  <div className="btn-group" style={{ background: 'var(--surface-2)', padding: 4, borderRadius: 12 }}>
                    <button className={`btn btn-sm ${uploadForm.type === 'pdf' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, border: 'none', background: uploadForm.type === 'pdf' ? 'var(--sky)' : 'transparent', color: uploadForm.type === 'pdf' ? '#fff' : 'var(--text-muted)' }} onClick={() => setUploadForm({...uploadForm, type: 'pdf'})}>
                      <FileText size={14} /> PDF File
                    </button>
                    <button className={`btn btn-sm ${uploadForm.type === 'url' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, border: 'none', background: uploadForm.type === 'url' ? 'var(--mint)' : 'transparent', color: uploadForm.type === 'url' ? '#fff' : 'var(--text-muted)' }} onClick={() => setUploadForm({...uploadForm, type: 'url'})}>
                      <ExternalLink size={14} /> Link
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Number System Notes" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} style={{ background: 'var(--surface-2)', border: 'none', height: 44 }} />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Related Topic (Optional)</label>
                  <select className="form-select" value={uploadForm.topic_id} onChange={e => setUploadForm({...uploadForm, topic_id: e.target.value})} style={{ background: 'var(--surface-2)', border: 'none', height: 44 }}>
                    <option value="">General Prep</option>
                    {ALL_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {uploadForm.type === 'pdf' ? (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>File</label>
                    <div style={{ 
                      border: '2px dashed var(--border)', borderRadius: 12, padding: 32, 
                      textAlign: 'center', cursor: 'pointer', position: 'relative',
                      background: uploadForm.file ? 'var(--accent-dim)' : 'var(--surface-2)',
                      transition: 'var(--transition)'
                    }}>
                      <input 
                        type="file" accept=".pdf" 
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        onChange={e => setUploadForm({...uploadForm, file: e.target.files[0]})} 
                      />
                      <FileUp size={24} color="var(--accent)" style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {uploadForm.file ? uploadForm.file.name : 'Choose PDF'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Max 10MB</div>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Web Address</label>
                    <input type="url" className="form-input" placeholder="https://..." value={uploadForm.url} onChange={e => setUploadForm({...uploadForm, url: e.target.value})} style={{ background: 'var(--surface-2)', border: 'none', height: 44 }} />
                  </div>
                )}

                <button className="btn btn-primary" style={{ width: '100%', marginTop: 10, height: 48, borderRadius: 12, background: uploadForm.type === 'pdf' ? 'var(--sky)' : 'var(--mint)', border: 'none', color: '#fff', fontWeight: 600 }} onClick={handleUpload}>
                  {uploadForm.type === 'pdf' ? 'Save File' : 'Save Link'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MaterialCard({ item, isOwn, onDelete, onToggleShare, onImport }) {
  const fileUrl = item.type === 'pdf' ? getMaterialPublicUrl(item.file_path) : item.url;
  
  return (
    <motion.div layout className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ padding: 20, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            {item.type === 'pdf' ? <FileText size={20} color="var(--sky)" /> : <LinkIcon size={20} color="var(--mint)" />}
          </div>
          {isOwn && (
            <button className={`btn btn-icon btn-sm ${item.is_shared ? 'active' : ''}`} onClick={() => onToggleShare(item)} style={{ background: 'transparent', border: 'none', color: item.is_shared ? 'var(--green)' : 'var(--text-dim)' }}>
              {item.is_shared ? <Globe size={16} /> : <Lock size={16} />}
            </button>
          )}
        </div>
        
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, lineHeight: 1.3, height: 40, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.title}
        </h3>
        {item.topic_id && (
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {item.topic_id.replace(/_/g, ' ')}
          </div>
        )}
        
        {!isOwn && item.owner && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
            <Users size={12} /> {item.owner.name}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', gap: 8 }}>
        <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ flex: 1, height: 32, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {item.type === 'pdf' ? <Download size={14} /> : <ExternalLink size={14} />}
          {item.type === 'pdf' ? 'Open' : 'Link'}
        </a>
        {isOwn ? (
          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)', width: 32, height: 32, padding: 0, justifyContent: 'center' }} onClick={() => onDelete(item)}>
            <Trash2 size={16} />
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => onImport(item)} style={{ height: 32, fontSize: 12, background: 'var(--accent)', border: 'none' }}>
            <Import size={14} /> Add
          </button>
        )}
      </div>
    </motion.div>
  );
}

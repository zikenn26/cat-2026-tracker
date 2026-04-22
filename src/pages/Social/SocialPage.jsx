import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getGroups, createGroup, getFriendships, sendFriendRequest,
  respondToFriendRequest, searchUsers, getGroupMessages,
  sendGroupMessage, getGroupActivity, getGlobalLeaderboard
} from '../../services/db';
import { supabase } from '../../supabaseClient';
import { 
  Users, UserPlus, MessageSquare, Trophy, Plus, 
  Search, Check, X, Send, BarChart2, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Chat Component ── */
function ChatWindow({ group, userId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef();

  const loadMessages = useCallback(async () => {
    const { data } = await getGroupMessages(group.id);
    setMessages(data);
    setLoading(false);
  }, [group.id]);

  useEffect(() => {
    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`group_chat_${group.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'group_messages',
        filter: `group_id=eq.${group.id}`
      }, (payload) => {
        // Since payload doesn't have the user object (name), 
        // we might need to refetch or manually handle. 
        // For simplicity and correctness with names, refetch:
        loadMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [group.id, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text;
    setText('');
    await sendGroupMessage(group.id, userId, content);
  };

  return (
    <div className="card chat-container" style={{ height: '500px', display: 'flex', flexDirection: 'column', padding: 0 }}>
      <div className="chat-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={18} color="var(--accent)" />
        </div>
        <div>
          <h4 style={{ margin: 0 }}>{group.name}</h4>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Group Chat</span>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40 }}>
            <MessageSquare size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
            <p>No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{
              alignSelf: m.user_id === userId ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, marginLeft: m.user_id === userId ? 0 : 4, textAlign: m.user_id === userId ? 'right' : 'left' }}>
                {m.user?.name || 'User'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{
                padding: '8px 12px',
                borderRadius: m.user_id === userId ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                background: m.user_id === userId ? 'var(--accent)' : 'var(--surface-3)',
                color: m.user_id === userId ? '#fff' : 'var(--text)',
                fontSize: 13,
                boxShadow: 'var(--shadow)',
              }}>
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={send} style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Type a message..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
          style={{ flex: 1, background: 'var(--surface-2)' }}
        />
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

/* ── Group Activity Tab ── */
function GroupActivity({ group }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await getGroupActivity(group.id);
      setActivity(data || []);
      setLoading(false);
    };
    load();
  }, [group.id]);

  return (
    <div className="card" style={{ height: '500px', overflowY: 'auto' }}>
      <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart2 size={16} color="var(--cyan)" /> Member Stats (Today)
      </h4>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
      ) : activity.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No study activity recorded in this group today yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activity.map((s) => (
            <div key={s.id} className="stat-card" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{s.user?.name}</span>
                <span className="badge badge-accent">{s.duration_min} mins</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {s.subject} • {s.topic_id}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--green)' }}>✓ {s.correct}</span>
                <span style={{ color: 'var(--red)' }}>✗ {s.incorrect}</span>
                <span style={{ marginLeft: 'auto' }}>Accuracy: {s.attempted ? ((s.correct/s.attempted)*100).toFixed(0) : 0}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Social Page ── */
export default function SocialPage() {
  const { user, profile } = useAuth();
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  const [friendships, setFriendships] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const loadSocial = useCallback(async () => {
    if (!user) return;
    const [gRes, fRes] = await Promise.all([
      getGroups(user.id),
      getFriendships(user.id)
    ]);
    setGroups(gRes.data);
    setFriendships(fRes.data);
    if (gRes.data.length > 0 && !selectedGroup) {
      setSelectedGroup(gRes.data[0]);
    }
  }, [user, selectedGroup]);

  useEffect(() => { loadSocial(); }, [loadSocial]);

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) { setSearchResults([]); return; }
    const { data } = await searchUsers(val);
    // Filter out self
    setSearchResults(data.filter(u => u.id !== user.id));
  };

  const handleSendFriendRequest = async (friendId) => {
    const { error } = await sendFriendRequest(user.id, friendId);
    if (!error) {
      show('Friend request sent!', 'success');
      loadSocial();
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const { data, error } = await createGroup(newGroupName, newGroupDesc, user.id);
    if (!error) {
      show('Study group created!', 'success');
      setIsCreatingGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      loadSocial();
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Social Hub</h1>
        <p style={{ color: 'var(--text-muted)' }}>Collaborate and grow with fellow aspirants</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
        {[
          { id: 'groups', label: 'Groups', icon: Users },
          { id: 'friends', label: 'Partners', icon: UserPlus },
          { id: 'leaderboard', label: 'Rankings', icon: Trophy }
        ].map(t => (
          <button 
            key={t.id}
            className={`btn-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            style={{ 
              background: 'none', border: 'none', padding: '12px 4px', 
              color: activeTab === t.id ? 'var(--sky)' : 'var(--text-dim)',
              borderBottom: activeTab === t.id ? '2px solid var(--sky)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              fontWeight: activeTab === t.id ? 600 : 400,
              fontSize: 14,
              transition: 'var(--transition)'
            }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'groups' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="groups">
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', gap: 24 }}>
              {/* Group Sidebar */}
              <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Communities</h4>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsCreatingGroup(true)} style={{ background: 'var(--surface-2)' }}>
                    <Plus size={16} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {groups.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>No groups yet.</p>
                  ) : (
                    groups.map(g => (
                      <button 
                        key={g.id}
                        onClick={() => setSelectedGroup(g)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 10,
                          background: selectedGroup?.id === g.id ? 'var(--sky-dim)' : 'transparent',
                          border: 'none', color: selectedGroup?.id === g.id ? 'var(--sky)' : 'var(--text)',
                          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                          transition: 'var(--transition)', fontWeight: selectedGroup?.id === g.id ? 600 : 500, fontSize: 13
                        }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: selectedGroup?.id === g.id ? 'var(--sky)' : 'var(--border-2)' }} />
                        <span>{g.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat & Activity */}
              {selectedGroup ? (
                <>
                  <ChatWindow group={selectedGroup} userId={user.id} />
                  <GroupActivity group={selectedGroup} />
                </>
              ) : (
                <div className="card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', border: '1px dashed var(--border)', background: 'transparent' }}>
                  <Users size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
                  <p style={{ fontSize: 14 }}>Select a community to begin</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'friends' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="friends">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Find Friends */}
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Find Study Partners</h3>
                <div className="form-group" style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-dim)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search by name..." 
                    style={{ paddingLeft: 42, background: 'var(--surface-2)', border: 'none', height: 44, borderRadius: 12 }}
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {searchResults.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Shield size={16} color="var(--text-dim)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>CAT Aspirant</div>
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSendFriendRequest(u.id)} style={{ background: 'var(--sky)', border: 'none', height: 32, borderRadius: 8 }}>
                        <UserPlus size={14} /> Add
                      </button>
                    </div>
                  ))}
                  {searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 12 }}>No matching partners found</p>
                  )}
                </div>
              </div>

              {/* Friendships */}
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Your Network</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {friendships.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No partners added yet.</p>
                  ) : (
                    friendships.map(f => {
                      const isSender = f.user_id === user.id;
                      const friend = isSender ? f.receiver : f.sender;
                      return (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12, border: f.status === 'pending' ? '1px dashed var(--yellow)' : '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sky-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Users size={14} color="var(--sky)" />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{friend?.name}</div>
                              {f.status === 'pending' && <div style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 600 }}>{isSender ? 'Awaiting Confirmation' : 'New Request'}</div>}
                            </div>
                          </div>
                          
                          {!isSender && f.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--green)', background: 'var(--green-dim)', border: 'none' }} onClick={() => respondToFriendRequest(f.id, 'accepted')}>
                                <Check size={16} />
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)', background: 'var(--red-dim)', border: 'none' }} onClick={() => respondToFriendRequest(f.id, 'blocked')}>
                                <X size={16} />
                              </button>
                            </div>
                          )}
                          {f.status === 'accepted' && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'var(--green-dim)', padding: '4px 8px', borderRadius: 6 }}>Partner</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="leaderboard">
            <div className="card" style={{ padding: 32 }}>
              <h3 style={{ marginBottom: 24, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Trophy size={20} color="var(--yellow)" /> Aspirant Leaderboard
              </h3>
              <LeaderboardTable />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      {isCreatingGroup && (
        <div className="modal-overlay" onClick={() => setIsCreatingGroup(false)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 32, borderRadius: 20 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Community</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsCreatingGroup(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Group Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. VARC Focused 2026" 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  style={{ background: 'var(--surface-2)', border: 'none', height: 44 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Goal / Mantra</label>
                <textarea 
                  className="form-textarea" 
                  rows={3} 
                  placeholder="What is our focus?"
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 12, padding: 16 }}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', height: 48, borderRadius: 12, background: 'var(--sky)', border: 'none', fontWeight: 600, marginTop: 10 }} onClick={handleCreateGroup}>
                Launch Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

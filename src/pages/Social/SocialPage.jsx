import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getGroups, createGroup, getFriendships, sendFriendRequest,
  respondToFriendRequest, searchUsers, sendGroupMessage,
  getGroupActivity, getGlobalLeaderboard, getGroupMaterials,
  shareMaterialToGroup, getMyMaterials, getMaterialPublicUrl,
  addGroupMember, leaveGroup, deleteGroup, markGroupRead,
  getUnreadCounts
} from '../../services/db';
import { supabase } from '../../supabaseClient';
import {
  Users, UserPlus, MessageSquare, Trophy, Plus,
  Search, Check, X, Send, BarChart2, Shield,
  FileText, Link as LinkIcon, Pin, FolderOpen,
  LogOut, Trash2, MoreVertical, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────
   CHAT WINDOW
   Uses Supabase Broadcast for instant delivery + postgres_changes
   as a fallback, ensuring zero missed messages.
───────────────────────────────────────────────────────── */
function ChatWindow({ group, userId, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [names, setNames] = useState({});     // uid → name cache
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef();
  const channelRef = useRef(null);

  /* Fetch missing name for a uid */
  const resolveName = useCallback(async (uid) => {
    if (names[uid]) return names[uid];
    const { data } = await supabase.from('profiles').select('name').eq('id', uid).single();
    const name = data?.name || 'User';
    setNames(prev => ({ ...prev, [uid]: name }));
    return name;
  }, [names]);

  /* Append an incoming message, resolving the sender's name */
  const appendMsg = useCallback(async (raw) => {
    const name = await resolveName(raw.user_id);
    const enriched = { ...raw, user: { id: raw.user_id, name } };
    setMessages(prev => {
      if (prev.some(m => m.id === enriched.id)) return prev;
      return [...prev, enriched];
    });
    if (onNewMessage) onNewMessage(group.id, raw.user_id);
  }, [resolveName, group.id, onNewMessage]);

  /* Initial load */
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessages([]);

    supabase
      .from('group_messages')
      .select('*, user:user_id(id, name)')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        const rows = data || [];
        setMessages(rows);
        const cache = {};
        rows.forEach(m => { if (m.user?.id) cache[m.user.id] = m.user.name; });
        setNames(cache);
        setLoading(false);
        // Mark as read when opening
        markGroupRead(group.id, userId);
      });

    return () => { active = false; };
  }, [group.id, userId]);

  /* Realtime subscription — uses BOTH broadcast and postgres_changes */
  useEffect(() => {
    // Remove old channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`room:${group.id}`, { config: { broadcast: { self: false } } })
      // Broadcast — instant delivery between live clients
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        appendMsg(payload);
      })
      // postgres_changes — catches messages from offline sessions / other tabs
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${group.id}`
      }, ({ new: raw }) => {
        // Only append from postgres if not from self (self gets optimistic)
        if (raw.user_id !== userId) {
          appendMsg(raw);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [group.id, userId, appendMsg]);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Send */
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text.trim();
    setText('');

    // 1. Optimistic — show instantly
    const ts = new Date().toISOString();
    const optimisticId = `opt-${ts}`;
    const myName = names[userId] || 'You';
    const optimistic = { id: optimisticId, group_id: group.id, user_id: userId, content, created_at: ts, user: { id: userId, name: myName } };
    setMessages(prev => [...prev, optimistic]);

    // 2. Persist to DB
    const { data: saved } = await sendGroupMessage(group.id, userId, content);
    if (saved) {
      // Replace optimistic with real DB row
      setMessages(prev => prev.map(m => m.id === optimisticId ? { ...saved, user: { id: userId, name: myName } } : m));
      // 3. Broadcast to others in the room instantly
      channelRef.current?.send({
        type: 'broadcast',
        event: 'message',
        payload: { ...saved, user_id: saved.user_id }
      });
    }
  };

  return (
    <div className="card" style={{ height: 520, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: 16 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={18} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{group.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Live Chat
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>
            <MessageSquare size={36} style={{ opacity: 0.15, marginBottom: 10 }} />
            <p style={{ fontSize: 13 }}>Be the first to say hi! 👋</p>
          </div>
        ) : (
          messages.map(m => {
            const isMine = m.user_id === userId;
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, marginLeft: isMine ? 0 : 4, marginRight: isMine ? 4 : 0 }}>
                  {isMine ? 'You' : (m.user?.name || names[m.user_id] || 'User')} · {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{
                  maxWidth: '78%',
                  padding: '9px 14px',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMine ? 'var(--accent)' : 'var(--surface-3)',
                  color: isMine ? '#fff' : 'var(--text)',
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  opacity: m.id?.startsWith('opt-') ? 0.75 : 1,
                }}>
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--surface-2)' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Message..."
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: '0 18px', height: 42 }}
        />
        <button type="submit" className="btn btn-primary" disabled={!text.trim()} style={{ borderRadius: '50%', width: 42, height: 42, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   GROUP RESOURCES
───────────────────────────────────────────────────────── */
function GroupResources({ group, userId }) {
  const [materials, setMaterials] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  const load = useCallback(async () => {
    const [{ data: gMat }, { data: pMat }] = await Promise.all([
      getGroupMaterials(group.id),
      getMyMaterials(userId)
    ]);
    setMaterials(gMat || []);
    setMyDocs(pMat || []);
    setLoading(false);
  }, [group.id, userId]);

  useEffect(() => { load(); }, [load]);

  const handleShare = async (matId) => {
    const { error } = await shareMaterialToGroup(matId, group.id);
    if (!error) { show('Resource pinned!', 'success'); setShowShare(false); load(); }
    else show(error.message, 'error');
  };

  return (
    <div className="card" style={{ height: 520, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: 16 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="var(--sky)" /> Shared Resources
        </h4>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(true)} style={{ color: 'var(--sky)', fontSize: 11, fontWeight: 700 }}>
          <Pin size={12} /> Pin Mine
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          : materials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
              <FolderOpen size={48} style={{ opacity: 0.1, marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>No resources yet. Pin your study materials here!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {materials.map(m => (
                <div key={m.id} style={{ padding: 14, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    {m.type === 'pdf' ? <FileText size={14} color="var(--sky)" /> : <LinkIcon size={14} color="var(--mint)" />}
                    <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 10 }}>by {m.owner?.name}</div>
                  <a href={m.type === 'pdf' ? getMaterialPublicUrl(m.file_path) : m.url} target="_blank" rel="noreferrer"
                    className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    Open
                  </a>
                </div>
              ))}
            </div>
          )}
      </div>
      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24, borderRadius: 16 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Pin a Resource</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {myDocs.filter(d => d.group_id !== group.id).map(d => (
                <button key={d.id} className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 10 }}
                  onClick={() => handleShare(d.id)}>
                  {d.type === 'pdf' ? <FileText size={14} /> : <LinkIcon size={14} />}
                  <span style={{ marginLeft: 10 }}>{d.title}</span>
                </button>
              ))}
              {myDocs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>No materials in your library yet.</p>}
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setShowShare(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   GROUP ACTIVITY
───────────────────────────────────────────────────────── */
function GroupActivity({ group }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGroupActivity(group.id).then(({ data }) => { setActivity(data || []); setLoading(false); });
  }, [group.id]);

  return (
    <div className="card" style={{ height: 520, overflowY: 'auto', borderRadius: 16 }}>
      <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart2 size={16} color="var(--cyan)" /> Member Activity (Today)
      </h4>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        : activity.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>No study activity today yet.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activity.map(s => (
              <div key={s.id} className="stat-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{s.user?.name}</span>
                  <span className="badge badge-accent">{s.duration_min} mins</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.subject}</div>
                <div style={{ marginTop: 8, fontSize: 11, display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--green)' }}>✓ {s.correct}</span>
                  <span style={{ color: 'var(--red)' }}>✗ {s.incorrect}</span>
                  <span style={{ marginLeft: 'auto' }}>Accuracy: {s.attempted ? ((s.correct / s.attempted) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LEADERBOARD (extracted component)
───────────────────────────────────────────────────────── */
function LeaderboardTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getGlobalLeaderboard().then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);
  if (loading) return <div className="spinner" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: i < 3 ? 'var(--accent-dim)' : 'var(--surface-2)', borderRadius: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-dim)', minWidth: 28 }}>#{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{r.user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.total_hours || 0}h · {r.total_questions || 0} Qs</div>
          </div>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>🔥 {r.current_streak}d</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN SOCIAL PAGE
───────────────────────────────────────────────────────── */
export default function SocialPage() {
  const { user, profile } = useAuth();
  const { show } = useToast();

  // Page tabs
  const [activeTab, setActiveTab] = useState('groups');
  const [groupTab, setGroupTab] = useState('chat');

  // Groups data
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [unread, setUnread] = useState({}); // groupId → count

  // Friends data
  const [friendships, setFriendships] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Modals
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isInvitingToGroup, setIsInvitingToGroup] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  /* ── Load social data ── */
  const loadSocial = useCallback(async () => {
    if (!user) return;
    const [gRes, fRes] = await Promise.all([
      getGroups(user.id),
      getFriendships(user.id)
    ]);
    const gs = gRes.data || [];
    setGroups(gs);
    setFriendships(fRes.data || []);
    if (gs.length > 0 && !selectedGroup) setSelectedGroup(gs[0]);
    // Fetch unread counts
    const counts = await getUnreadCounts(user.id);
    setUnread(counts);
  }, [user, selectedGroup]);

  /* ── Initial load + realtime subscriptions ── */
  useEffect(() => {
    loadSocial();
    if (!user) return;

    // Friend request notifications
    const friendChannel = supabase
      .channel(`friends:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `friend_id=eq.${user.id}` },
        (payload) => { loadSocial(); show('📬 New friend request!', 'success'); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships', filter: `user_id=eq.${user.id}` },
        (payload) => { loadSocial(); if (payload.new.status === 'accepted') show('🎉 Friend request accepted!', 'success'); })
      .subscribe();

    // Group membership changes (invited / removed)
    const memberChannel = supabase
      .channel(`members:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_members', filter: `user_id=eq.${user.id}` },
        () => { loadSocial(); show('You were added to a group!', 'success'); })
      .subscribe();

    return () => {
      supabase.removeChannel(friendChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [loadSocial, user, show]);

  /* ── Unread count update when a new message arrives in another group ── */
  const handleNewMessage = useCallback((groupId, senderId) => {
    if (senderId === user?.id) return; // own message, ignore
    if (selectedGroup?.id !== groupId) {
      // Not the active group — increment unread
      setUnread(prev => ({ ...prev, [groupId]: (prev[groupId] || 0) + 1 }));
    }
  }, [selectedGroup?.id, user?.id]);

  /* ── Select group + mark as read ── */
  const selectGroup = (g) => {
    setSelectedGroup(g);
    setGroupTab('chat');
    setShowGroupMenu(false);
    // Clear unread count
    setUnread(prev => ({ ...prev, [g.id]: 0 }));
    markGroupRead(g.id, user.id);
  };

  /* ── Friend request handlers ── */
  const handleRespondToFriendRequest = async (id, status, friendId, friendName) => {
    const { error } = await respondToFriendRequest(id, status);
    if (error) { show(error.message, 'error'); return; }
    if (status === 'accepted' && friendId) {
      show('Partner added! Creating shared space...', 'success');
      const gName = `${profile?.name || 'You'} & ${friendName || 'Partner'}`;
      const { data: newG } = await createGroup(gName, 'Direct study space', user.id);
      if (newG) await addGroupMember(newG.id, friendId, 'member');
    } else {
      show('Request declined.');
    }
    loadSocial();
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) { setSearchResults([]); return; }
    const { data } = await searchUsers(val);
    setSearchResults((data || []).filter(u => u.id !== user.id));
  };

  const handleSendFriendRequest = async (friendId) => {
    const { error } = await sendFriendRequest(user.id, friendId);
    if (!error) {
      show('Friend request sent! ✉️', 'success');
      setSearchResults([]);
      setSearchQuery('');
    } else {
      show(error.message, 'error');
    }
  };

  /* ── Group handlers ── */
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const { data, error } = await createGroup(newGroupName, newGroupDesc, user.id);
    if (error) { show(error.message, 'error'); return; }
    show('Group created!', 'success');
    setIsCreatingGroup(false);
    setNewGroupName('');
    setNewGroupDesc('');
    loadSocial();
    if (data) setSelectedGroup(data);
  };

  const handleInviteToGroup = async (friendId) => {
    if (!selectedGroup) return;
    const { error } = await addGroupMember(selectedGroup.id, friendId, 'member');
    if (!error) { show('Partner invited!', 'success'); setIsInvitingToGroup(false); }
    else if (error.code === '23505') show('Already a member!', 'error');
    else show(error.message, 'error');
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    const { error } = await leaveGroup(selectedGroup.id, user.id);
    if (error) { show(error.message, 'error'); return; }
    show('Left group.');
    setSelectedGroup(null);
    setShowGroupMenu(false);
    loadSocial();
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    if (!window.confirm(`Delete "${selectedGroup.name}"? This cannot be undone.`)) return;
    const { error } = await deleteGroup(selectedGroup.id);
    if (error) { show(error.message, 'error'); return; }
    show('Group deleted.');
    setSelectedGroup(null);
    setShowGroupMenu(false);
    loadSocial();
  };

  const isAdmin = selectedGroup && groups.find(g => g.id === selectedGroup.id)?.created_by === user?.id;
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
          Social Hub
          {totalUnread > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 10px', lineHeight: 1.6 }}>
              {totalUnread} new
            </span>
          )}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Collaborate and grow with fellow aspirants</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
        {[
          { id: 'groups', label: 'Study Groups', icon: Users },
          { id: 'friends', label: 'Study Partners', icon: UserPlus },
          { id: 'leaderboard', label: 'Ranking', icon: Trophy }
        ].map(t => (
          <button key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              paddingBottom: 14, paddingInline: 20, borderBottom: activeTab === t.id ? '2px solid var(--sky)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--sky)' : 'var(--text-dim)',
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, position: 'relative'
            }}>
            <t.icon size={15} /> {t.label}
            {t.id === 'friends' && friendships.filter(f => f.status === 'pending' && f.friend_id === user?.id).length > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <motion.div key="groups" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) 1fr', gap: 24 }}>

              {/* Sidebar */}
              <div>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>My Groups</h3>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsCreatingGroup(true)} style={{ background: 'var(--sky-dim)', color: 'var(--sky)' }}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {groups.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>No groups yet. Create one!</p>
                    ) : groups.map(g => {
                      const cnt = unread[g.id] || 0;
                      const isActive = selectedGroup?.id === g.id;
                      return (
                        <button key={g.id} onClick={() => selectGroup(g)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: isActive ? 'var(--sky-dim)' : 'transparent',
                          color: isActive ? 'var(--sky)' : 'var(--text)',
                          transition: 'background 0.15s', width: '100%', textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: isActive ? 'var(--sky)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Users size={14} color={isActive ? '#fff' : 'var(--text-dim)'} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                          </div>
                          {cnt > 0 && !isActive && (
                            <span style={{ fontSize: 10, fontWeight: 800, background: '#ef4444', color: '#fff', borderRadius: 12, padding: '2px 8px', flexShrink: 0 }}>{cnt}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Main area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {selectedGroup ? (
                  <>
                    {/* Group toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 5, borderRadius: 14, border: '1px solid var(--border)', gap: 6, flex: 1 }}>
                        {[
                          { id: 'chat', label: 'Chat', icon: MessageSquare },
                          { id: 'stats', label: 'Activity', icon: BarChart2 },
                          { id: 'resources', label: 'Resources', icon: FileText }
                        ].map(st => (
                          <button key={st.id}
                            className={`btn btn-sm ${groupTab === st.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setGroupTab(st.id)}
                            style={{ flex: 1, borderRadius: 10, fontSize: 12, height: 38 }}>
                            <st.icon size={13} /> {st.label}
                          </button>
                        ))}
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setIsInvitingToGroup(true)}
                        style={{ height: 48, padding: '0 14px', color: 'var(--cyan)', border: '1px solid var(--border)', borderRadius: 12 }}>
                        <UserPlus size={14} />
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowGroupMenu(p => !p)}
                          style={{ height: 48, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 12 }}>
                          <MoreVertical size={14} />
                        </button>
                        {showGroupMenu && (
                          <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 8, minWidth: 160, zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text-muted)' }} onClick={handleLeaveGroup}>
                              <LogOut size={14} /> Leave Group
                            </button>
                            {isAdmin && (
                              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 10, fontSize: 13, color: 'var(--red)' }} onClick={handleDeleteGroup}>
                                <Trash2 size={14} /> Delete Group
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {groupTab === 'chat' && <ChatWindow key={selectedGroup.id} group={selectedGroup} userId={user.id} onNewMessage={handleNewMessage} />}
                    {groupTab === 'stats' && <GroupActivity group={selectedGroup} />}
                    {groupTab === 'resources' && <GroupResources group={selectedGroup} userId={user.id} />}
                  </>
                ) : (
                  <div className="card" style={{ flex: 1, minHeight: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', border: '1px dashed var(--border)', background: 'transparent' }}>
                    <Users size={52} style={{ opacity: 0.08, marginBottom: 16 }} />
                    <p style={{ fontSize: 14 }}>Select or create a study group</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── FRIENDS TAB ── */}
        {activeTab === 'friends' && (
          <motion.div key="friends" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Search */}
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Find Study Partners</h3>
                <div className="form-group" style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-dim)' }} />
                  <input type="text" className="form-input" placeholder="Search by name..."
                    style={{ paddingLeft: 42, background: 'var(--surface-2)', border: 'none', height: 44, borderRadius: 12 }}
                    value={searchQuery} onChange={e => handleSearch(e.target.value)} />
                </div>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {searchResults.map(u => {
                    const alreadyFriends = friendships.some(f => f.user_id === u.id || f.friend_id === u.id);
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={14} color="var(--accent)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>CAT Aspirant</div>
                          </div>
                        </div>
                        {alreadyFriends ? (
                          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>Connected</span>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => handleSendFriendRequest(u.id)}
                            style={{ background: 'var(--sky)', border: 'none', height: 32, borderRadius: 8 }}>
                            <UserPlus size={13} /> Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)', fontSize: 12 }}>No users found</p>
                  )}
                </div>
              </div>

              {/* Network */}
              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Your Network</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {friendships.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No connections yet. Search for aspirants above!</p>
                  ) : friendships.map(f => {
                    const isSender = f.user_id === user.id;
                    const friend = isSender ? f.receiver : f.sender;
                    return (
                      <div key={f.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12,
                        border: f.status === 'pending' ? '1px dashed var(--yellow)' : '1px solid var(--border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--sky-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={14} color="var(--sky)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{friend?.name}</div>
                            {f.status === 'pending' && (
                              <div style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 700 }}>
                                {isSender ? 'Request Sent' : '⚡ Pending'}
                              </div>
                            )}
                          </div>
                        </div>
                        {!isSender && f.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--green)', background: 'var(--green-dim)', border: 'none' }}
                              onClick={() => handleRespondToFriendRequest(f.id, 'accepted', friend?.id, friend?.name)}>
                              <Check size={15} />
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)', background: 'var(--red-dim)', border: 'none' }}
                              onClick={() => handleRespondToFriendRequest(f.id, 'rejected')}>
                              <X size={15} />
                            </button>
                          </div>
                        )}
                        {f.status === 'accepted' && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 10px', borderRadius: 20 }}>Partner ✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <motion.div key="leaderboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
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
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Study Group</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsCreatingGroup(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 24 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Group Name</label>
                <input type="text" className="form-input" placeholder="e.g. VARC Warriors 2026"
                  value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  style={{ background: 'var(--surface-2)', border: 'none', height: 44 }} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12 }}>Goal / Focus</label>
                <textarea className="form-textarea" rows={3} placeholder="What are we studying together?"
                  value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)}
                  style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 12, padding: 14 }} />
              </div>
              <button className="btn btn-primary" style={{ height: 48, borderRadius: 12 }} onClick={handleCreateGroup}>
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInvitingToGroup && selectedGroup && (
        <div className="modal-overlay" onClick={() => setIsInvitingToGroup(false)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24, borderRadius: 16 }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Invite to {selectedGroup.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {friendships.filter(f => f.status === 'accepted').length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>No accepted partners yet.</p>
              ) : friendships.filter(f => f.status === 'accepted').map(f => {
                const friend = f.user_id === user.id ? f.receiver : f.sender;
                return (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--surface-2)', borderRadius: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{friend?.name}</span>
                    <button className="btn btn-sm btn-primary" onClick={() => handleInviteToGroup(friend.id)} style={{ height: 32, fontSize: 11 }}>
                      Invite
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setIsInvitingToGroup(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

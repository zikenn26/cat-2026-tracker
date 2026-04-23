import { supabase } from '../supabaseClient';
import { ALL_TOPICS } from '../data/syllabus';

/* ────────────────────────────────────────
   AUTH
──────────────────────────────────────── */
export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getUser = () => supabase.auth.getUser();

/* ────────────────────────────────────────
   PROFILES
──────────────────────────────────────── */
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // returns null (not 406) when no profile exists yet
  return { data, error };
};

export const upsertProfile = async (profile) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single();
  return { data, error };
};

/* ────────────────────────────────────────
   TOPIC STATS — get or initialize
──────────────────────────────────────── */
export const getTopicStats = async (userId) => {
  const { data, error } = await supabase
    .from('topic_stats')
    .select('*')
    .eq('user_id', userId);
  return { data: data || [], error };
};

export const ensureTopicStatsExist = async (userId) => {
  const { data: existing } = await getTopicStats(userId);
  const existingIds = (existing || []).map(r => r.topic_id);
  const missing = ALL_TOPICS.filter(t => !existingIds.includes(t.id));
  if (missing.length === 0) return;
  const rows = missing.map(t => ({
    user_id: userId,
    topic_id: t.id,
    total_attempted: 0,
    total_correct: 0,
    accuracy_pct: 0,
    avg_time_sec: 0,
    last_practiced: null,
    status: 'unstarted',
    revision_dates: [],
  }));
  await supabase.from('topic_stats').insert(rows);
};

export const updateTopicStat = async (userId, topicId, patch) => {
  if (!topicId) return { data: null, error: null }; // Skip if no topic
  const { data, error } = await supabase
    .from('topic_stats')
    .update(patch)
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .select()
    .single();
  return { data, error };
};

/* ────────────────────────────────────────
   SESSIONS
──────────────────────────────────────── */
export const getSessions = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
};

export const getSessionsThisWeek = async (userId) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', weekAgo.toISOString().split('T')[0]);
  return { data: data || [], error };
};

export const getSessionsToday = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today);
  return { data: data || [], error };
};

export const insertSession = async (session) => {
  const { data, error } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single();
  return { data, error };
};

/* ────────────────────────────────────────
   STREAKS
──────────────────────────────────────── */
export const getStreak = async (userId) => {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); // returns null (not 406) when streak row doesn't exist yet
  return { data, error };
};

export const upsertStreak = async (streak) => {
  const { data, error } = await supabase
    .from('streaks')
    .upsert(streak)
    .select()
    .single();
  return { data, error };
};

/* ────────────────────────────────────────
   DAILY PLANS
──────────────────────────────────────── */
export const getTodayPlans = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
};

export const insertPlan = async (plan) => {
  const { data, error } = await supabase
    .from('daily_plans')
    .insert(plan)
    .select()
    .single();
  return { data, error };
};

export const updatePlan = async (id, patch) => {
  const { data, error } = await supabase
    .from('daily_plans')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

export const deletePlan = async (id) => {
  return supabase.from('daily_plans').delete().eq('id', id);
};

/* ────────────────────────────────────────
   MOCK TESTS
──────────────────────────────────────── */
export const getMockTests = async (userId) => {
  const { data, error } = await supabase
    .from('mock_tests')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  return { data: data || [], error };
};

export const insertMockTest = async (mock) => {
  const { data, error } = await supabase
    .from('mock_tests')
    .insert(mock)
    .select()
    .single();
  return { data, error };
};

/* ────────────────────────────────────────
   ERROR LOG
──────────────────────────────────────── */
export const getErrors = async (userId) => {
  const { data, error } = await supabase
    .from('error_log')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  return { data: data || [], error };
};

export const insertError = async (err) => {
  const { data, error } = await supabase
    .from('error_log')
    .insert(err)
    .select()
    .single();
  return { data, error };
};

export const updateError = async (id, patch) => {
  const { data, error } = await supabase
    .from('error_log')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

/* ────────────────────────────────────────
   SOCIAL — FRIENDS & GROUPS
   ──────────────────────────────────────── */

// Search for other users by name (or part of name)
export const searchUsers = async (query) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(10);
  return { data: data || [], error };
};

// Get all friend relationships for a user
export const getFriendships = async (userId) => {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      *,
      sender:user_id(id, name),
      receiver:friend_id(id, name)
    `)
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  return { data: data || [], error };
};

export const sendFriendRequest = async (userId, friendId) => {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
    .select()
    .single();
  return { data, error };
};

export const respondToFriendRequest = async (requestId, status) => {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status })
    .eq('id', requestId)
    .select()
    .single();
  return { data, error };
};

// Study Groups
export const getGroups = async (userId) => {
  const { data, error } = await supabase
    .from('group_members')
    .select('study_groups(*)')
    .eq('user_id', userId);
  return { data: (data || []).map(r => r.study_groups), error };
};

export const createGroup = async (name, description, userId) => {
  // 1. Create the group
  const { data: group, error: groupErr } = await supabase
    .from('study_groups')
    .insert({ name, description, created_by: userId })
    .select()
    .single();
  
  if (groupErr) return { data: null, error: groupErr };

  // 2. Add creator as admin member
  await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'admin' });

  return { data: group, error: null };
};

export const addGroupMember = async (groupId, userId, role = 'member') => {
  const { data, error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role })
    .select()
    .single();
  return { data, error };
};

export const leaveGroup = async (groupId, userId) => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  return { error };
};

export const deleteGroup = async (groupId) => {
  const { error } = await supabase
    .from('study_groups')
    .delete()
    .eq('id', groupId);
  return { error };
};

export const markGroupRead = async (groupId, userId) => {
  await supabase
    .from('group_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('user_id', userId);
};

export const getUnreadCounts = async (userId) => {
  // Get all groups user belongs to with their last_read_at
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, last_read_at')
    .eq('user_id', userId);

  if (!memberships?.length) return {};

  const counts = {};
  await Promise.all(
    memberships.map(async (m) => {
      const { count } = await supabase
        .from('group_messages')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', m.group_id)
        .neq('user_id', userId)
        .gt('created_at', m.last_read_at || '1970-01-01');
      counts[m.group_id] = count || 0;
    })
  );
  return counts;
};

export const getGroupMessages = async (groupId) => {
  const { data, error } = await supabase
    .from('group_messages')
    .select(`
      *,
      user:user_id(id, name)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
};

export const sendGroupMessage = async (groupId, userId, content) => {
  const { data, error } = await supabase
    .from('group_messages')
    .insert({ group_id: groupId, user_id: userId, content })
    .select()
    .single();
  return { data, error };
};

export const getGroupMembers = async (groupId) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      user:profiles(id, name)
    `)
    .eq('group_id', groupId);
  return { data: data || [], error };
};

// Advanced: Fetch activity for group members (e.g. today's sessions)
export const getGroupActivity = async (groupId) => {
  // 1. Get members
  const { data: members } = await getGroupMembers(groupId);
  const userIds = (members || []).map(m => m.user_id);
  
  if (userIds.length === 0) return { data: [], error: null };

  const today = new Date().toISOString().split('T')[0];

  // 2. Get today's sessions for all members
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*, user:profiles(name)')
    .in('user_id', userIds)
    .eq('date', today);
  
  return { data: sessions || [], error };
};

// Global Leaderboard
export const getGlobalLeaderboard = async () => {
  const { data, error } = await supabase
    .from('streaks')
    .select(`
      current_streak,
      total_questions,
      total_hours,
      user:user_id(id, name)
    `)
    .order('current_streak', { ascending: false })
    .limit(20);
  return { data: data || [], error };
};

/* ────────────────────────────────────────
   NOTES & FORMULAS
   ──────────────────────────────────────── */
export const getNotes = async (userId) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  return { data: data || [], error };
};

export const getFormulas = async (userId) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'formula')
    .order('topic_id', { ascending: true });
  return { data: data || [], error };
};

export const upsertNote = async (note) => {
  const { data, error } = await supabase
    .from('notes')
    .upsert({ ...note, updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
};

export const deleteNote = async (id) => {
  return supabase.from('notes').delete().eq('id', id);
};

/* ────────────────────────────────────────
   STUDY MATERIALS & STORAGE
   ──────────────────────────────────────── */

// 1. Upload File (PDF)
export const uploadMaterialFile = async (userId, file, title, topicId = null) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Math.random()}.${fileExt}`;
  const filePath = `materials/${fileName}`;

  // A. Upload to Storage
  const { error: uploadErr } = await supabase.storage
    .from('study-materials')
    .upload(filePath, file);

  if (uploadErr) return { data: null, error: uploadErr };

  // B. Save to DB
  const { data, error } = await supabase
    .from('study_materials')
    .insert({
      user_id: userId,
      title: title || file.name,
      type: 'pdf',
      file_path: filePath,
      topic_id: topicId,
      original_owner_id: userId,
      is_shared: false
    })
    .select()
    .single();

  return { data, error };
};

// 2. Add URL
export const addMaterialUrl = async (userId, title, url, topicId = null) => {
  const { data, error } = await supabase
    .from('study_materials')
    .insert({
      user_id: userId,
      title,
      url,
      type: 'url',
      topic_id: topicId,
      original_owner_id: userId,
      is_shared: false
    })
    .select()
    .single();
  return { data, error };
};

// 3. Fetch User Materials
export const getMyMaterials = async (userId) => {
  const { data, error } = await supabase
    .from('study_materials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

// 4. Fetch Shared Materials (from Friends/Groups)
export const getSharedMaterials = async (userId) => {
  const { data, error } = await supabase
    .from('study_materials')
    .select(`
      *,
      owner:user_id(id, name)
    `)
    .neq('user_id', userId)
    .eq('is_shared', true); // RLS handles the friend/group check
  return { data: data || [], error };
};

// 5. Toggle Share Status
export const toggleMaterialShare = async (materialId, isShared) => {
  const { data, error } = await supabase
    .from('study_materials')
    .update({ is_shared: isShared })
    .eq('id', materialId);
  return { data, error };
};

// 6. Import Material (Reference Logic)
export const importMaterial = async (userId, material) => {
  const { data, error } = await supabase
    .from('study_materials')
    .insert({
      user_id: userId,
      title: `${material.title} (Imported)`,
      type: material.type,
      file_path: material.file_path,
      url: material.url,
      topic_id: material.topic_id,
      original_owner_id: material.user_id,
      is_shared: false
    })
    .select()
    .single();
  return { data, error };
};

// 7. Get File URL
export const getMaterialPublicUrl = (path) => {
  const { data } = supabase.storage.from('study-materials').getPublicUrl(path);
  return data.publicUrl;
};

// 8. Delete Material
export const deleteMaterial = async (materialId, filePath = null) => {
  if (filePath) {
    await supabase.storage.from('study-materials').remove([filePath]);
  }
  return supabase.from('study_materials').delete().eq('id', materialId);
};
// 9. Fetch Group Materials
export const getGroupMaterials = async (groupId) => {
  const { data, error } = await supabase
    .from('study_materials')
    .select(`
      *,
      owner:user_id(id, name)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

// 10. Share Material to Group (Update existing record)
export const shareMaterialToGroup = async (materialId, groupId) => {
  const { data, error } = await supabase
    .from('study_materials')
    .update({ group_id: groupId })
    .eq('id', materialId);
  return { data, error };
};




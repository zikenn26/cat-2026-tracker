import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getProfile, ensureTopicStatsExist } from '../services/db';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session — catch "lock stolen" race condition gracefully
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Auth lock conflict on startup:', error.message);
          setLoading(false);
          return;
        }
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) await loadProfile(session.user.id);
        else { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data } = await getProfile(userId);
      setProfile(data);
      if (data) await ensureTopicStatsExist(userId);
    } catch (e) {
      console.warn('loadProfile error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await getProfile(user.id);
    setProfile(data);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

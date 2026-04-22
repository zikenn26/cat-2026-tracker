import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { signOut } from '../services/db';
import {
  LayoutDashboard, Timer, BarChart2, FileText, Users,
  ClipboardList, AlertTriangle, RefreshCcw, StickyNote,
  Trophy, Settings, LogOut, User, Sun, Moon, FunctionSquare,
  FolderOpen
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard',     to: '/',           icon: LayoutDashboard },
  { label: 'Study Session', to: '/session',    icon: Timer },
  { label: 'Study Group',   to: '/social',     icon: Users },
  { label: 'Analytics',     to: '/analytics',  icon: BarChart2 },
  { label: 'Mock Tests',    to: '/mocks',      icon: FileText },
  { label: 'Error Log',     to: '/errors',     icon: AlertTriangle },
  { label: 'Planner',       to: '/planner',    icon: ClipboardList },
  { label: 'Revision',      to: '/revision',   icon: RefreshCcw },
  { label: 'Notes',         to: '/notes',      icon: StickyNote },
  { label: 'Formula Sheet', to: '/formulas',   icon: FunctionSquare },
  { label: 'Study Materials', to: '/materials', icon: FolderOpen },
  { label: 'Achievements',  to: '/gamification', icon: Trophy },
];

export default function Sidebar() {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className="sidebar" style={{ 
      background: 'var(--surface)', 
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      width: 'var(--sidebar-w)'
    }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: '32px 24px', borderBottom: '1px solid var(--border-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>🌱</div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>CAT 2026</h2>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Focus Mode
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ padding: '24px 16px', flex: 1, overflowY: 'auto' }}>
        {NAV.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10,
              fontSize: 13, fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              marginBottom: 4, transition: 'var(--transition)',
            })}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom" style={{ padding: '20px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <button
          onClick={toggleTheme}
          className="nav-item"
          style={{
            width: '100%', border: 'none', cursor: 'pointer', marginBottom: 8,
            background: 'var(--surface)', padding: '10px 16px', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)'
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span style={{ fontSize: 13 }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10 }}>
          <User size={16} />
          <span style={{ fontSize: 13 }}>{profile?.name || 'My Profile'}</span>
        </NavLink>
        
        <button
          className="nav-item"
          style={{ width: '100%', border: 'none', cursor: 'pointer', marginTop: 8, color: 'var(--red)', background: 'transparent', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          <span style={{ fontSize: 13 }}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

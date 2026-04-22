import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import AuthPage       from './pages/Auth/AuthPage';
import OnboardingPage from './pages/Onboarding/OnboardingPage';
import DashboardPage  from './pages/Dashboard/DashboardPage';
import SessionPage    from './pages/Session/SessionPage';
import SocialPage    from './pages/Social/SocialPage';
import AnalyticsPage  from './pages/Analytics/AnalyticsPage';
import MockTestsPage  from './pages/MockTests/MockTestsPage';
import ErrorLogPage   from './pages/ErrorLog/ErrorLogPage';
import PlannerPage    from './pages/Planner/PlannerPage';
import RevisionPage   from './pages/Revision/RevisionPage';
import NotesPage      from './pages/Notes/NotesPage';
import FormulaPage    from './pages/Notes/FormulaPage';
import MaterialsPage  from './pages/Materials/MaterialsPage';
import GamificationPage from './pages/Gamification/GamificationPage';
import AdminPage      from './pages/Admin/AdminPage';
import ProfilePage    from './pages/Profile/ProfilePage';
import './styles/global.css';

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading CAT 2026 Tracker...</p>
      </div>
    );
  }

  // Not logged in → Auth
  if (!user) return <AuthPage />;

  // Logged in but no profile → Onboarding
  if (!profile) return <OnboardingPage />;

  // Full app
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"              element={<DashboardPage />} />
          <Route path="/session"       element={<SessionPage />} />
          <Route path="/social"        element={<SocialPage />} />
          <Route path="/analytics"     element={<AnalyticsPage />} />
          <Route path="/mocks"         element={<MockTestsPage />} />
          <Route path="/errors"        element={<ErrorLogPage />} />
          <Route path="/planner"       element={<PlannerPage />} />
          <Route path="/revision"      element={<RevisionPage />} />
          <Route path="/notes"         element={<NotesPage />} />
          <Route path="/formulas"      element={<FormulaPage />} />
          <Route path="/materials"     element={<MaterialsPage />} />
          <Route path="/gamification"  element={<GamificationPage />} />
          <Route path="/admin"         element={<AdminPage />} />
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

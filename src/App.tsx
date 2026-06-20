import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { MiDia } from '@/pages/MiDia';
import { Clients } from '@/pages/Clients';
import { Prospects } from '@/pages/Prospects';
import { Policies } from '@/pages/Policies';
import { Tasks } from '@/pages/Tasks';
import { Claims } from '@/pages/Claims';
import { Trash } from '@/pages/Trash';
import { Settings } from '@/pages/Settings';
import { Loading } from '@/components/common/Loading';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      <div className="min-h-0 overflow-y-auto">
        <Dashboard />
      </div>
      <div className="min-h-0 overflow-y-auto bg-slate-50 rounded-2xl border border-slate-200">
        <MiDia />
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/prospects" element={<Prospects />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/claims" element={<Claims />} />
        <Route path="/trash" element={<Trash />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
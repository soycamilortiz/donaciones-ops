import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import GuestOnly from './components/GuestOnly';
import OrgGate from './components/OrgGate';
import RequireAuth from './components/RequireAuth';
import AcopiosPage from './pages/AcopiosPage';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import RolesPage from './pages/RolesPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<GuestOnly />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<OrgGate />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<AppShell />}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/usuarios" element={<UsersPage />} />
            <Route path="/app/roles" element={<RolesPage />} />
            <Route path="/app/acopios" element={<AcopiosPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

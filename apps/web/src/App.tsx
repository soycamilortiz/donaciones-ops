import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import GuestOnly from './components/GuestOnly';
import OrgGate from './components/OrgGate';
import PendingShell from './components/PendingShell';
import RequireAuth from './components/RequireAuth';
import AcopiosPage from './pages/AcopiosPage';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import RolesPage from './pages/RolesPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import StartChoice from './pages/StartChoice';
import UsersPage from './pages/UsersPage';
import WaitingRoom from './pages/WaitingRoom';

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
          <Route element={<PendingShell />}>
            <Route path="/empezar" element={<StartChoice />} />
            <Route path="/empezar/organizacion" element={<Onboarding />} />
            <Route path="/pendiente" element={<WaitingRoom />} />
          </Route>
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

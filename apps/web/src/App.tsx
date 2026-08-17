import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import GuestOnly from './components/GuestOnly';
import OrgGate from './components/OrgGate';
import PendingShell from './components/PendingShell';
import RequireAuth from './components/RequireAuth';
import AcopiosPage from './pages/AcopiosPage';
import Dashboard from './pages/Dashboard';
import DonacionesPage from './pages/DonacionesPage';
import InventoryPage from './pages/InventoryPage';
import Landing from './pages/Landing';
import NuevaDonacionPage from './pages/NuevaDonacionPage';
import Onboarding from './pages/Onboarding';
import RevisionDonacionesPage from './pages/RevisionDonacionesPage';
import RolesPage from './pages/RolesPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import StartChoice from './pages/StartChoice';
import UsersPage from './pages/UsersPage';
import CompleteGoogleProfilePage from './pages/CompleteGoogleProfilePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import WaitingRoom from './pages/WaitingRoom';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<GuestOnly />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/verificar-correo" element={<VerifyEmailPage />} />
        <Route path="/completar-cuenta-google" element={<CompleteGoogleProfilePage />} />
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
            <Route path="/app/inventario" element={<InventoryPage />} />
            <Route path="/app/donaciones" element={<DonacionesPage />} />
            <Route path="/app/donaciones/nueva" element={<NuevaDonacionPage />} />
            <Route path="/app/donaciones/revision" element={<RevisionDonacionesPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

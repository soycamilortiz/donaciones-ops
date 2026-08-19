import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import GuestOnly from './components/GuestOnly';
import OrgGate from './components/OrgGate';
import PendingShell from './components/PendingShell';
import RequireAuth from './components/RequireAuth';
import { ROUTES } from './lib/constants';
import AcopiosPage from './pages/AcopiosPage';
import CompleteGoogleProfilePage from './pages/CompleteGoogleProfilePage';
import CargaPage from './pages/CargaPage';
import EntregaDetailPage from './pages/EntregaDetailPage';
import EntregasPage from './pages/EntregasPage';
import RutasPage from './pages/RutasPage';
import TransporteDetailPage from './pages/TransporteDetailPage';
import TransportePage from './pages/TransportePage';
import DespachosPage from './pages/DespachosPage';
import ConsolidacionPage from './pages/ConsolidacionPage';
import ControlKitsPage from './pages/ControlKitsPage';
import Dashboard from './pages/Dashboard';
import DemandaDetailPage from './pages/DemandaDetailPage';
import DemandasPage from './pages/DemandasPage';
import InventoryPage from './pages/InventoryPage';
import KitsPage from './pages/KitsPage';
import Landing from './pages/Landing';
import MovimientosPage from './pages/MovimientosPage';
import NuevaDonacionPage from './pages/NuevaDonacionPage';
import NuevaRecepcionPage from './pages/NuevaRecepcionPage';
import Onboarding from './pages/Onboarding';
import PalletArmadoPage from './pages/PalletArmadoPage';
import PalletizacionPage from './pages/PalletizacionPage';
import PickingKitsPage from './pages/PickingKitsPage';
import PutawayPage from './pages/PutawayPage';
import RecepcionDetailPage from './pages/RecepcionDetailPage';
import RecepcionesPage from './pages/RecepcionesPage';
import RolesPage from './pages/RolesPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import StartChoice from './pages/StartChoice';
import UbicacionesPage from './pages/UbicacionesPage';
import UsersPage from './pages/UsersPage';
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
            <Route path="/app/ubicaciones" element={<UbicacionesPage />} />
            <Route path="/app/inventario" element={<InventoryPage />} />
            <Route
              path="/app/inventario/ubicaciones"
              element={<Navigate to={ROUTES.ubicaciones} replace />}
            />
            <Route path="/app/inventario/ubicar" element={<PutawayPage />} />
            <Route path="/app/inventario/mover" element={<MovimientosPage />} />
            <Route path="/app/kits" element={<KitsPage />} />
            <Route path="/app/demandas" element={<DemandasPage />} />
            <Route path="/app/demandas/:id/picking" element={<PickingKitsPage />} />
            <Route path="/app/demandas/:id/control" element={<ControlKitsPage />} />
            <Route path="/app/demandas/:id/consolidacion" element={<ConsolidacionPage />} />
            <Route path="/app/demandas/:id/palletizacion/:palletId" element={<PalletArmadoPage />} />
            <Route path="/app/demandas/:id/palletizacion" element={<PalletizacionPage />} />
            <Route path="/app/despachos" element={<DespachosPage />} />
            <Route path="/app/transporte" element={<TransportePage />} />
            <Route path="/app/transporte/:viajeId" element={<TransporteDetailPage />} />
            <Route path="/app/rutas" element={<RutasPage />} />
            <Route path="/app/entregas" element={<EntregasPage />} />
            <Route path="/app/entregas/:viajeId" element={<EntregaDetailPage />} />
            <Route path="/app/demandas/:id/carga" element={<CargaPage />} />
            <Route path="/app/demandas/:id" element={<DemandaDetailPage />} />
            <Route path="/app/recepciones" element={<RecepcionesPage />} />
            <Route path="/app/recepciones/nueva" element={<NuevaRecepcionPage />} />
            <Route path="/app/recepciones/:id/foto" element={<NuevaDonacionPage />} />
            <Route path="/app/recepciones/:id" element={<RecepcionDetailPage />} />
            <Route
              path="/app/donaciones/*"
              element={<Navigate to={ROUTES.recepciones} replace />}
            />
            <Route path="/app/donaciones" element={<Navigate to={ROUTES.recepciones} replace />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

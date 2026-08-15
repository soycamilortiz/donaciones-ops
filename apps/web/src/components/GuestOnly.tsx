import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../lib/AuthProvider';

export default function GuestOnly() {
  const { isAuthenticated } = useSession();

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

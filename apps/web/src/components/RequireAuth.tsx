import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../lib/AuthProvider';

export default function RequireAuth() {
  const { isAuthenticated } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
}

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { adminAllowlistConfigured, isAdminUser } from "@/lib/auth";

/**
 * Keeps the admin screens off the open web.
 *
 * Until now `/admin` had no guard of any kind, so the whole portal — including
 * customer orders — answered to anyone who typed the address.
 */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Checking your access…
      </div>
    );
  }

  // No allowlist means the deploy is unfinished. Saying so beats a bare
  // redirect that looks like a broken password.
  if (!adminAllowlistConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl">Admin access is not configured</h1>
          <p className="text-sm text-muted-foreground">
            Set <code className="font-mono text-xs">VITE_ADMIN_EMAILS</code> in{" "}
            <code className="font-mono text-xs">.env</code> to the address that runs the
            shop, and <code className="font-mono text-xs">ADMIN_EMAILS</code> in the Edge
            Function secrets to the same value, then rebuild.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default AdminRoute;

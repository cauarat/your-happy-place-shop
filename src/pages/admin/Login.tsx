import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInAdmin } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/admin/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    // One message for a wrong password and for an account that is not an
    // admin. Telling them apart would confirm which addresses exist.
    const result = await signInAdmin(email.trim(), password);
    setBusy(false);
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 glass rounded-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl mb-2">Villaoro Admin</h1>
          <p className="text-muted-foreground text-sm">Secure Portal Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">Email</label>
            <input
              type="email"
              autoComplete="username"
              className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-primary transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-primary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-primary-foreground py-3 rounded-full uppercase text-xs tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

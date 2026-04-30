import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "@/lib/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "admin@villaoro.com" && loginAdmin(password)) {
      navigate("/admin/dashboard");
    } else {
      setError("Invalid credentials");
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
              className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-primary transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@villaoro.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">Password</label>
            <input 
              type="password" 
              className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-primary transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          
          <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-full uppercase text-xs tracking-wider hover:opacity-90 transition-opacity">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

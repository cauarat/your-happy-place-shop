import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col w-full h-full min-h-screen bg-white overflow-hidden text-black"
    >
      <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-md p-8 pb-10 mx-auto">
        
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="w-full text-center"
          >
            <h1 className="text-[2.5rem] md:text-[3rem] font-black leading-none tracking-tighter text-black mb-8">
              Villaoro
            </h1>
            <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
              Sign In
            </h2>
            <p className="text-[13px] text-zinc-400 font-light mb-10">
              Welcome back to your curated space.
            </p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full text-center text-xl md:text-2xl font-serif text-black placeholder:text-zinc-300 outline-none bg-transparent caret-amber-500 pb-2 border-b border-zinc-200 focus:border-black transition-colors"
              />
              
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full text-center text-xl md:text-2xl font-serif text-black placeholder:text-zinc-300 outline-none bg-transparent caret-amber-500 pb-2 border-b border-zinc-200 focus:border-black transition-colors mt-4"
              />

              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => toast('Password reset link sent (simulated)')} className="text-xs text-zinc-400 hover:text-black transition-colors">
                  Forgot Password?
                </button>
              </div>

              <button 
                type="submit"
                disabled={loading || !email || !password}
                className={`mt-6 group relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
                  email && password && !loading
                    ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10' 
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="font-medium tracking-wide text-sm">Sign In</span>}
              </button>
            </form>
            
            <div className="mt-8 text-sm text-zinc-500">
              Don't have an account? <Link to="/onboarding" state={{ step: 3 }} className="text-black font-medium hover:underline">Request Access</Link>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="w-full mt-auto flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Link 
            to="/onboarding"
            className="p-3 rounded-full hover:bg-zinc-50 text-zinc-400 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Login;

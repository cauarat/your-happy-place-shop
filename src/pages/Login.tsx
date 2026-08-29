import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import VoiceToggle from '@/components/VoiceToggle';
import { toast } from 'sonner';
import { DURATION, EASE_SOFT } from '@/lib/motion';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err ?? ''));

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState('');
  // Bumped on every failure so the card re-runs its shake even when the same
  // message comes back twice in a row.
  const [errorNonce, setErrorNonce] = useState(0);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { t } = useLanguage();
  const { speakCue } = useVoiceAssistant();

  // Greets whoever lands here, the way the onboarding does. Someone reaching
  // this page has been here before — they are signing back in, not being
  // introduced — so it is the page's own welcome that is read, nothing more.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    speakCue('login');
  }, [speakCue]);

  const canSubmit = isValidEmail(email) && password.length > 0 && !loading;
  // Where to land after a successful sign in — a protected route can send the
  // user here with `state.from` and get them back where they were headed.
  const redirectTo = location.state?.from ?? '/';

  // Already signed in (session restored, or another tab logged in): this page
  // has nothing to ask for.
  useEffect(() => {
    if (session) navigate(redirectTo, { replace: true });
  }, [session, navigate, redirectTo]);

  const showError = (message: string) => {
    setError(message);
    setErrorNonce((n) => n + 1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      toast.success(t('login_success'));
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const raw = messageOf(err);
      // Supabase returns English, untranslated strings — map the two the user
      // will actually hit onto the site's own languages.
      if (/invalid login credentials/i.test(raw)) {
        showError(t('login_error_credentials'));
      } else if (/email not confirmed/i.test(raw)) {
        showError(t('login_error_unconfirmed'));
      } else {
        showError(raw || t('login_error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!isValidEmail(email)) {
      showError(t('login_reset_needs_email'));
      return;
    }

    setSendingReset(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) throw resetError;
      toast.success(t('login_reset_sent'));
    } catch (err: unknown) {
      showError(messageOf(err) || t('login_error_generic'));
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: DURATION.screen, ease: EASE_SOFT }}
      className="relative flex flex-col w-full h-full min-h-screen bg-[#FDFDFD] overflow-hidden text-black select-none"
    >
      {/* The mute. This page does not render the site header either, and a
          voice with no way to silence it is worse than no voice. */}
      <div className="absolute top-5 right-5 z-40 md:top-6 md:right-6">
        <VoiceToggle />
      </div>

      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto px-6 pt-12">
        {/* App icon — the same tile the onboarding hero resolves into, so the
            hand-off from "I'm already a member" reads as one continuous screen */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: DURATION.content, ease: EASE_SOFT }}
          className="mb-6"
        >
          <div
            className="relative w-[80px] h-[80px] rounded-[22px] overflow-hidden bg-white"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 2px rgba(255,255,255,0.9)',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <img src="/apple-touch-icon.png" alt="Villaoro" className="w-full h-full object-cover" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: DURATION.content, ease: EASE_SOFT }}
          className="text-[24px] font-semibold text-zinc-900 tracking-tight text-center mb-2.5"
        >
          {t('login_title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: DURATION.content, ease: EASE_SOFT }}
          className="text-[15px] text-zinc-500 font-light text-center leading-relaxed mb-8 max-w-[300px]"
        >
          {t('login_subtitle')}
        </motion.p>

        <form onSubmit={handleLogin} className="w-full flex flex-col">
          {/* Grouped inset field card (iOS 27 style): one surface, hairline
              divider between rows, instead of two floating underlines */}
          <motion.div
            key={errorNonce}
            initial={{ opacity: 0, y: 20 }}
            animate={
              errorNonce > 0
                ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 5, 0] }
                : { opacity: 1, y: 0 }
            }
            transition={
              errorNonce > 0
                ? { x: { duration: 0.4, ease: 'easeInOut' }, duration: DURATION.content }
                : { delay: 0.5, duration: DURATION.content, ease: EASE_SOFT }
            }
            className="w-full bg-white rounded-3xl px-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-zinc-100"
          >
            <div className="flex items-center gap-3 py-1">
              <Mail className="w-[18px] h-[18px] text-zinc-400 shrink-0" strokeWidth={1.75} />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    passwordRef.current?.focus();
                  }
                }}
                placeholder={t('onboarding_email_placeholder')}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                enterKeyHint="next"
                /* 16px keeps iOS Safari from zooming the viewport on focus */
                className="flex-1 min-w-0 h-[52px] bg-transparent outline-none text-[16px] text-zinc-900 placeholder:text-zinc-400 placeholder:font-light caret-black"
              />
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-zinc-100 to-transparent" />

            <div className="flex items-center gap-3 py-1">
              <Lock className="w-[18px] h-[18px] text-zinc-400 shrink-0" strokeWidth={1.75} />
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={t('onboarding_password_placeholder')}
                autoComplete="current-password"
                enterKeyHint="go"
                className="flex-1 min-w-0 h-[52px] bg-transparent outline-none text-[16px] text-zinc-900 placeholder:text-zinc-400 placeholder:font-light caret-black"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 p-2 -mr-2 rounded-full text-zinc-400 hover:text-zinc-700 transition-colors"
                aria-label={showPassword ? t('login_hide_password') : t('login_show_password')}
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.75} />
                ) : (
                  <Eye className="w-[18px] h-[18px]" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </motion.div>

          {/* Inline error, reserved below the card so nothing jumps */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key={error + errorNonce}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: DURATION.control, ease: EASE_SOFT }}
                className="text-[13px] text-red-500 text-center mt-3 px-2 leading-relaxed"
                role="alert"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: DURATION.content, ease: EASE_SOFT }}
            className="flex justify-end mt-3 mb-1"
          >
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={sendingReset}
              className="text-[13px] text-zinc-400 hover:text-zinc-900 transition-colors disabled:opacity-50 px-2 py-1"
            >
              {sendingReset ? t('login_reset_sending') : t('login_forgot_password')}
            </button>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: DURATION.content, ease: EASE_SOFT }}
            type="submit"
            disabled={!canSubmit}
            className={`mt-5 w-full h-[56px] flex items-center justify-center rounded-[20px] font-medium tracking-wide text-[16px] transition-all duration-300 ${
              canSubmit
                ? 'bg-zinc-900 text-white hover:bg-black hover:shadow-xl hover:shadow-black/20 active:scale-[0.98]'
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login_cta')}
          </motion.button>
        </form>
      </div>

      {/* Bottom rail: sign-up hand-off + back, clear of the iOS home indicator */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: DURATION.content, ease: EASE_SOFT }}
        className="w-full max-w-md mx-auto px-6 pt-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-3"
      >
        <p className="text-[14px] text-zinc-500 font-light">
          {t('login_no_account')}{' '}
          <Link
            to="/onboarding"
            state={{ step: 4 }}
            className="text-zinc-900 font-medium hover:underline underline-offset-4"
          >
            {t('onboarding_request_access')}
          </Link>
        </p>

        <Link
          to="/onboarding"
          className="p-3 rounded-full hover:bg-zinc-100/80 text-zinc-400 transition-colors"
          aria-label={t('login_back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default Login;

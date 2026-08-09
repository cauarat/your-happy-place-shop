import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowLeft, Check, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { designers as staticDesigners } from '../data/products';
import { supabase } from '../lib/supabase';
import { getDesigners } from '../lib/store';
import { Component as LanguageSelectorDropdown, LanguageOption } from '@/components/ui/language-selector-dropdown';
import { ScrollMorphHero } from '@/components/ui/scroll-morph-hero';
import { Footprints, Shirt, Glasses } from 'lucide-react';
import { BagIcon, CapIcon, PantsIcon, JacketIcon, HoodieIcon, SweaterIcon, PufferJacketIcon } from '@/components/Icons';

// iOS-style segmented control: a shared layoutId pill glides between options,
// spring-driven, so switching languages feels native rather than a plain fade.
const LanguageSegmentedControl = ({
  languages,
  value,
  onChange,
}: {
  languages: LanguageOption[];
  value: string;
  onChange: (lang: LanguageOption) => void;
}) => (
  <div className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100/90 backdrop-blur-sm p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
    {languages.map((lang) => {
      const active = value === lang.code;
      return (
        <button
          key={lang.code}
          onClick={() => onChange(lang)}
          className="relative rounded-full px-4 py-2 text-sm font-medium transition-colors"
        >
          {active && (
            <motion.span
              layoutId="lang-segment-pill"
              className="absolute inset-0 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            />
          )}
          <span
            className={`relative z-10 flex items-center gap-1.5 ${active ? 'text-black' : 'text-zinc-500'}`}
          >
            <span>{lang.flag}</span>
            <span>{lang.code}</span>
          </span>
        </button>
      );
    })}
  </div>
);

const onboardingHeroIcons = [
  { id: 1, icon: HoodieIcon, className: 'top-[8%] left-[8%]' },
  { id: 2, icon: JacketIcon, className: 'top-[15%] right-[10%]' },
  { id: 3, icon: BagIcon, className: 'bottom-[12%] left-[12%]' },
  { id: 4, icon: PantsIcon, className: 'bottom-[10%] right-[10%]' },
  { id: 5, icon: CapIcon, className: 'top-[5%] left-[42%]' },
  { id: 6, icon: Footprints, className: 'top-[45%] left-[6%]' },
  { id: 7, icon: Glasses, className: 'top-[42%] right-[7%]' },
  { id: 8, icon: SweaterIcon, className: 'bottom-[6%] left-[42%]' },
  { id: 9, icon: Shirt, className: 'top-[70%] left-[20%]' },
  { id: 10, icon: PufferJacketIcon, className: 'top-[68%] right-[22%]' },
];

const Onboarding = () => {
  const location = useLocation();
  const [step, setStep] = useState(location.state?.step ?? 0);
  const { firstName, setFirstName } = useOnboarding();
  const [gender, setGender] = useState('');
  const [category, setCategory] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingText, setLoadingText] = useState('');
  const [authError, setAuthError] = useState('');
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (step === 9) setLoadingText(t('onboarding_analyzing'));
  }, [step, t]);

  // Handle Step 8 transitions & Real Supabase Auth
  useEffect(() => {
    if (step === 9) {
      const performSignUp = async () => {
        setLoadingText(t('onboarding_analyzing'));
        
        try {
          // 1. Simulate the luxury curation delay (1s)
          await new Promise(resolve => setTimeout(resolve, 1000));
          setLoadingText(t('onboarding_curating'));
          
          // 2. Perform real Supabase Auth Sign Up
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                first_name: firstName,
                gender,
                category,
                selected_brands: selectedBrands
              }
            }
          });

          if (error) throw error;
          
          if (!data.session) {
            // Email confirmation is required
            setAuthError('Account created! Please check your email to verify your account before logging in.');
            setStep(11); // Special step for email confirmation
          } else {
            // 3. Move to success screen
            setStep(10);
          }
        } catch (error: any) {
          console.error('Signup error:', error);
          setAuthError(error.message || 'Failed to create account');
          setStep(8); // Go back to email/password step to show error
        }
      };

      performSignUp();
    }
  }, [step, email, password, firstName, gender, category, selectedBrands, t]);

  // Handle Step 9 redirect (Success)
  useEffect(() => {
    if (step === 10) {
      const tId = setTimeout(() => {
        // We no longer use localStorage for this, Supabase handles session
        localStorage.setItem('villaoro_onboarding_done', 'true');
        navigate('/');
      }, 2500);

      return () => clearTimeout(tId);
    }
  }, [step, navigate]);

  // Handle Step 10 redirect (Email verification required)
  useEffect(() => {
    if (step === 11) {
      const tId = setTimeout(() => {
        navigate('/login');
      }, 4000);

      return () => clearTimeout(tId);
    }
  }, [step, navigate]);

  // Time-of-day greetings for the roulette
  const getGreetings = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return [
        { text: 'Good morning!', code: 'EN' },
        { text: 'Bom dia!', code: 'PT' },
        { text: '¡Buenos días!', code: 'ES' },
      ];
    } else if (hour >= 12 && hour < 18) {
      return [
        { text: 'Good afternoon!', code: 'EN' },
        { text: 'Boa tarde!', code: 'PT' },
        { text: '¡Buenas tardes!', code: 'ES' },
      ];
    } else {
      return [
        { text: 'Good evening!', code: 'EN' },
        { text: 'Boa noite!', code: 'PT' },
        { text: '¡Buenas noches!', code: 'ES' },
      ];
    }
  };

  // Roulette index state for Step 1
  const [greetingIndex, setGreetingIndex] = useState(0);
  // Starts on the auto-detected language so both language pickers below show
  // a real selection immediately, instead of an empty "choose one" state.
  const [localLang, setLocalLang] = useState(language);

  useEffect(() => {
    if (step !== 0) return;
    const interval = setInterval(() => {
      setGreetingIndex(prev => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, [step]);

  // Screen 0: one continuous scroll-driven experience — catalog icons scatter
  // into a circle with a welcome message, then as the user keeps scrolling
  // (in either direction, fully reversible) they spread into their final
  // layout while the logo/greeting/language-picker fade in in the same spot.
  // There's no hand-off between two separate screens; it's a single surface.
  const renderStep0 = () => {
    const greetings = getGreetings();
    const appLanguages: LanguageOption[] = [
      { code: 'EN', label: 'English', flag: '🇺🇸' },
      { code: 'PT', label: 'Português', flag: '🇧🇷' },
      { code: 'ES', label: 'Español', flag: '🇪🇸' },
    ];

    // Shared by both language pickers (the segmented control on the resting
    // circle and the dropdown in the revealed content) so either one updates
    // the site's language immediately and keeps the other in sync.
    const handleSelectLanguage = (lang: LanguageOption) => {
      setLocalLang(lang.code as any);
      setLanguage(lang.code as any);
    };

    const greetingRoulette = (
      <AnimatePresence mode="wait">
        <motion.span
          key={greetingIndex}
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -28, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {greetings[greetingIndex].text}
        </motion.span>
      </AnimatePresence>
    );

    return (
      <motion.div
        key="step0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full h-full min-h-screen bg-white text-black select-none"
      >
        <ScrollMorphHero
          icons={onboardingHeroIcons}
          scrollHint={t('scroll_to_explore')}
          introTitle={greetingRoulette}
          introSubtitle={
            <LanguageSegmentedControl
              languages={appLanguages}
              value={localLang}
              onChange={handleSelectLanguage}
            />
          }
          revealTitle={
            <img
              src="/apple-touch-icon.png"
              alt="Villaoro"
              className="w-[72px] h-[72px] md:w-[80px] md:h-[80px] rounded-[18px] mx-auto"
            />
          }
          revealSubtitle={t('onboarding_lang_desc')}
        >
          <div className="flex flex-col items-center gap-8">
            <LanguageSelectorDropdown
              languages={appLanguages}
              value={localLang}
              onChange={handleSelectLanguage}
            />
            <button
              onClick={() => setStep(2)}
              className="flex items-center justify-center h-[52px] bg-foreground text-background px-8 rounded-full hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-black/10"
            >
              <span className="font-semibold tracking-wide text-[15px] mr-2">
                {t('onboarding_continue')}
              </span>
              <ArrowRight className="w-[18px] h-[18px]" />
            </button>
          </div>
        </ScrollMorphHero>
      </motion.div>
    );
  };

  // Screen 2: Add to Home Screen Tutorial
  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col w-full h-full min-h-screen bg-[#FDFDFD] overflow-hidden text-black select-none"
    >
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto px-6">

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 mt-4"
        >
          <div
            className="relative w-[80px] h-[80px] rounded-[22px] flex items-center justify-center bg-white"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 2px rgba(255,255,255,0.9)',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div className="absolute inset-0 rounded-[22px] bg-gradient-to-tr from-zinc-50 to-white opacity-80" />
            <span className="relative text-[38px] leading-none drop-shadow-sm">📲</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-[24px] font-semibold text-zinc-900 tracking-tight text-center mb-2.5"
        >
          {t('install_app_title')}
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-[15px] text-zinc-500 font-light text-center leading-relaxed mb-8 max-w-[300px]"
        >
          {t('install_app_subtitle')}
        </motion.p>

        {/* Steps Card (iOS 27 style) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-white rounded-3xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-zinc-100 flex flex-col gap-0 relative"
        >
          {/* Step 1 */}
          <div className="flex items-center gap-4 py-3 group">
            <div className="flex-1">
              <p className="text-[13px] md:text-[14.5px] font-semibold text-zinc-800 mb-0.5 tracking-tight">{t('install_step1_title')}</p>
              <p className="text-[11.5px] md:text-[13px] text-zinc-500 leading-relaxed pr-2">{t('install_step1_desc')}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2 mt-1 bg-zinc-50/80 px-2.5 py-1.5 rounded-xl border border-zinc-100">
              {/* Apple Share */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <div className="w-px h-4 bg-zinc-200" />
              {/* Chrome Menu */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-zinc-100 to-transparent my-1" />

          {/* Step 2 */}
          <div className="flex items-center gap-4 py-3 group">
            <div className="flex-1">
              <p className="text-[13px] md:text-[14.5px] font-semibold text-zinc-800 mb-0.5 tracking-tight">{t('install_step2_title')}</p>
              <p className="text-[11.5px] md:text-[13px] text-zinc-500 leading-relaxed pr-2">{t('install_step2_desc')}</p>
            </div>
            <div className="shrink-0 mt-1 bg-zinc-50/80 p-2 rounded-xl border border-zinc-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-zinc-100 to-transparent my-1" />

          {/* Step 3 */}
          <div className="flex items-center gap-3 md:gap-4 py-3 group">
            <div className="flex-1">
              <p className="text-[13px] md:text-[14.5px] font-semibold text-zinc-800 mb-0.5 tracking-tight">{t('install_step3_title')}</p>
              <p className="text-[11.5px] md:text-[13px] text-zinc-500 leading-relaxed pr-2">{t('install_step3_desc')}</p>
            </div>
            <div className="shrink-0 flex items-center gap-3 mt-1">
              <div className="flex flex-col items-center">
                <img src="/apple-touch-icon.png" alt="Villaoro" className="w-10 h-10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/5" />
              </div>
              <div className="bg-green-50 p-2 rounded-xl border border-green-100/50 text-green-500">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>



      </div>

      {/* Bottom button */}
      <motion.div
        className="w-full px-6 pb-10 pt-4 max-w-md mx-auto relative z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          onClick={() => setStep(3)}
          className="w-full py-4 px-6 rounded-[20px] bg-zinc-900 text-white font-medium tracking-wide text-[16px] transition-all duration-300 hover:bg-black hover:shadow-xl hover:shadow-black/20 active:scale-[0.98]"
        >
          {t('install_app_continue')}
        </button>
      </motion.div>
    </motion.div>
  );

  // Screen 3: The Invitation (Quick Tour / Login)
  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 1.05 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center justify-center w-full h-full min-h-screen bg-white overflow-hidden"
    >
      <div className="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-md p-8 pb-12 pt-20">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-[2.5rem] md:text-[3rem] font-black leading-none tracking-tighter text-black mb-4">
              Villaoro
            </h1>
          </motion.div>
        </div>

        <motion.div 
          className="w-full mt-auto flex flex-col gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
        >
          <button 
            onClick={() => setStep(4)}
            className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-50 text-black py-4 px-6 rounded-full transition-all duration-300 overflow-hidden border border-zinc-200 shadow-sm"
          >
            <span className="font-medium tracking-wide text-base">{t('onboarding_take_quick_tour')}</span>
          </button>
          
          <button 
            onClick={() => navigate('/login')}
            className="group relative w-full flex items-center justify-center gap-3 bg-black hover:bg-zinc-900 text-white py-4 px-6 rounded-full transition-all duration-300 shadow-sm"
          >
            <span className="font-medium tracking-wide text-base">{t('onboarding_already_member')}</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );

  // Screen 4: First Name Input (Cosmos Style)
  const renderStep4 = () => (
    <motion.div
      key="step4"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col w-full h-full min-h-screen bg-white overflow-hidden text-black"
    >
      <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-md p-8 pb-10 mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center w-full mt-[-10vh]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="w-full text-center"
          >
            <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
              {t('onboarding_first_name_title')}
            </h2>
            <p className="text-[13px] text-zinc-400 font-light mb-12">
              {t('onboarding_first_name_desc')}
            </p>

            <input
              type="text"
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('onboarding_first_name_placeholder')}
              className="w-full text-center text-4xl md:text-5xl font-serif text-black placeholder:text-zinc-200 outline-none bg-transparent caret-amber-500"
            />
          </motion.div>
        </div>

        {/* Bottom CTA Area + Back Button */}
        <motion.div 
          className="w-full mt-auto flex flex-col gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <button 
            onClick={() => {
              if (firstName.trim().length > 1) {
                setStep(5);
              }
            }}
            disabled={firstName.trim().length < 2}
            className={`group relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
              firstName.trim().length >= 2 
                ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10' 
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <span className="font-medium tracking-wide text-sm">{t('onboarding_continue')}</span>
          </button>
          
          <div className="flex justify-center">
            <button 
              onClick={() => setStep(3)}
              className="p-3 rounded-full hover:bg-zinc-50 text-zinc-400 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderStep5 = () => {
    const options = [
      { id: 'masculino', label: t('onboarding_male'), icon: '👱‍♂️' },
      { id: 'feminino', label: t('onboarding_female'), icon: '👩' }
    ];

    return (
      <motion.div
        key="step5"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col w-full h-full min-h-screen bg-white overflow-hidden text-black"
      >
        <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-md p-8 pb-10 mx-auto">
          
          <div className="flex-1 w-full flex flex-col items-center justify-center mt-[-5vh]">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="w-full text-center mb-10"
            >
              <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
                {t('onboarding_style_title')}
              </h2>
              <p className="text-[13px] text-zinc-400 font-light">
                {t('onboarding_style_desc').replace('{name}', firstName.trim())}
              </p>
            </motion.div>

            <div className="flex flex-col gap-3 w-full max-w-[280px]">
              {options.map((opt, index) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + (index * 0.1), duration: 0.5 }}
                  onClick={() => {
                    setGender(opt.id);
                    setTimeout(() => setStep(6), 200); 
                  }}
                  className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 ${
                    gender === opt.id 
                      ? 'border-black bg-black text-white shadow-md' 
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-serif text-lg">{opt.label}</span>
                  </div>
                  {gender === opt.id && <Check className="w-4 h-4" />}
                </motion.button>
              ))}
            </div>
          </div>

          <motion.div 
            className="w-full mt-auto flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button 
              onClick={() => setStep(4)}
              className="p-3 rounded-full hover:bg-zinc-50 text-zinc-400 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Screen 6: Category Intent (Cosmos Style - Zero Click Advance)
  const renderStep6 = () => {
    const categories = [
      { id: 'Footwear', icon: '👟' },
      { id: 'Clothing', icon: '👕' },
      { id: 'Bags', icon: '👜' },
      { id: 'Jewelry', icon: '💍' },
      { id: 'Accessories', icon: '🕶️' }
    ];

    return (
      <motion.div
        key="step6"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col w-full h-full min-h-screen bg-white overflow-hidden text-black"
      >
        <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-md p-8 pb-10 mx-auto">
          
          <div className="flex-1 w-full flex flex-col items-center justify-center mt-[-5vh]">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="w-full text-center mb-10"
            >
              <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
                {t('onboarding_hunt_title')}
              </h2>
              <p className="text-[13px] text-zinc-400 font-light">
                {t('onboarding_hunt_desc').replace('{name}', firstName.trim())}
              </p>
            </motion.div>

            <div className="flex flex-col gap-3 w-full max-w-[280px]">
              {categories.map((cat, index) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + (index * 0.1), duration: 0.5 }}
                  onClick={() => {
                    setCategory(cat.id);
                    setTimeout(() => setStep(7), 200); 
                  }}
                  className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 ${
                    category === cat.id 
                      ? 'border-black bg-black text-white shadow-md' 
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-serif text-lg">{t(cat.id.toLowerCase())}</span>
                  </div>
                  {category === cat.id && <Check className="w-4 h-4" />}
                </motion.button>
              ))}
            </div>
          </div>

          <motion.div 
            className="w-full mt-auto flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button 
              onClick={() => setStep(5)}
              className="p-3 rounded-full hover:bg-zinc-50 text-zinc-400 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Screen 7: Brand Affinity (Cosmos Style - Multi Select)
  const renderStep7 = () => {
    const allBrands = Array.from(new Set([...staticDesigners, ...getDesigners()])).sort();

    const toggleBrand = (brand: string) => {
      if (selectedBrands.includes(brand)) {
        setSelectedBrands(selectedBrands.filter(b => b !== brand));
      } else {
        if (selectedBrands.length < 3) {
          setSelectedBrands([...selectedBrands, brand]);
        }
      }
    };

    return (
      <motion.div
        key="step7"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col w-full h-full min-h-screen bg-white overflow-hidden text-black"
      >
        <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-md p-6 mx-auto">
          
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="w-full text-center mb-6 mt-[2vh]"
          >
            <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
              {t('onboarding_brand_title')}
            </h2>
            <p className="text-[13px] text-zinc-400 font-light">
              {t('onboarding_brand_desc')}
            </p>
          </motion.div>

          <div className="flex-1 w-full overflow-y-auto pb-24 scrollbar-hide">
            <div className="flex flex-wrap justify-center gap-2 w-full px-2">
              {allBrands.map((brand, index) => {
                const isSelected = selectedBrands.includes(brand);
                return (
                  <motion.button
                    key={brand}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + (index * 0.02), duration: 0.3 }}
                    onClick={() => toggleBrand(brand)}
                    className={`px-4 py-2 rounded-full border text-sm transition-all duration-300 ${
                      isSelected 
                        ? 'border-black bg-black text-white shadow-md' 
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    {brand}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <motion.div 
            className="absolute bottom-6 left-6 right-6 flex flex-col gap-4 bg-white pt-4 pb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button 
              onClick={() => setStep(8)}
              disabled={selectedBrands.length === 0}
              className={`group relative w-full flex items-center justify-between gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
                selectedBrands.length > 0 
                  ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10' 
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <span className="font-medium tracking-wide text-sm">{t('onboarding_continue')}</span>
              <span className="text-xs font-mono opacity-60">{selectedBrands.length} / 3</span>
            </button>
            
            <div className="flex justify-center">
              <button 
                onClick={() => setStep(6)}
                className="p-3 rounded-full hover:bg-zinc-50 text-zinc-400 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Screen 8: Contact / Email (Cosmos Style)
  const renderStep8 = () => {
    const isValidEmail = (email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    return (
      <motion.div
        key="step8"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, filter: "blur(10px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col w-full h-full min-h-screen bg-white overflow-hidden text-black"
      >
        <div className="relative z-10 flex flex-col items-center flex-1 w-full max-w-md p-8 pb-10 mx-auto">
          
          <div className="flex-1 flex flex-col items-center justify-center w-full mt-[-10vh]">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="w-full text-center"
            >
              <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
                {t('onboarding_email_title')}
              </h2>
              <p className="text-[13px] text-zinc-400 font-light mb-12">
                {t('onboarding_email_desc')}
              </p>

              <div className="w-full flex flex-col gap-4 mt-6 mb-2">
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
                  placeholder={t('onboarding_email_placeholder')}
                  className="w-full text-center text-xl md:text-2xl font-serif text-black placeholder:text-zinc-300 outline-none bg-transparent caret-amber-500 pb-2 border-b border-zinc-200 focus:border-black transition-colors"
                />
                
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                  placeholder={t('onboarding_password_placeholder')}
                  className="w-full text-center text-xl md:text-2xl font-serif text-black placeholder:text-zinc-300 outline-none bg-transparent caret-amber-500 pb-2 border-b border-zinc-200 focus:border-black transition-colors mt-4"
                />
              </div>
              
              {authError && (
                <p className="text-red-500 text-sm mt-4">{authError}</p>
              )}
            </motion.div>
          </div>

          <motion.div 
            className="w-full mt-auto flex flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <button 
              onClick={() => {
                if (isValidEmail(email) && password.length >= 6) {
                  setStep(9);
                }
              }}
              disabled={!isValidEmail(email) || password.length < 6}
              className={`group relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
                isValidEmail(email) && password.length >= 6
                  ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10' 
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <span className="font-medium tracking-wide text-sm">{t('onboarding_request_access')}</span>
            </button>
            
            <div className="flex justify-center">
              <button 
                onClick={() => setStep(7)}
                className="p-3 rounded-full hover:bg-zinc-50 text-zinc-400 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

        </div>
      </motion.div>
    );
  };

  // Screen 9: The Analysis / Waiting List Simulation (Headspace Style)
  const renderStep9 = () => {

    return (
      <motion.div
        key="step9"
        initial={{ backgroundColor: "#000000", opacity: 0 }}
        animate={{ backgroundColor: "#ffffff", opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ 
          backgroundColor: { duration: 3, ease: "easeInOut" },
          opacity: { duration: 0.8 }
        }}
        className="relative flex flex-col items-center justify-center w-full h-full min-h-screen overflow-hidden"
      >
        <motion.div
          initial={{ color: "#ffffff" }}
          animate={{ color: "#000000" }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="text-center"
        >
          {/* Subtle loading spinner that changes color */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-[2px] border-current border-t-transparent rounded-full mx-auto mb-6 opacity-60"
          />
          
          <h2 className="text-[14px] font-medium tracking-wide" aria-live="polite">
            {loadingText}
          </h2>
        </motion.div>
      </motion.div>
    );
  };

  // Screen 10: Access Approved (Zero-Click redirect to Catalog)
  const renderStep10 = () => {

    return (
      <motion.div
        key="step10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex flex-col items-center justify-center w-full h-full min-h-screen bg-white overflow-hidden text-black"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
            className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6"
          >
            <Check className="w-8 h-8" strokeWidth={3} />
          </motion.div>
          
          <h2 className="text-2xl font-serif text-zinc-900 mb-2">
            {t('onboarding_approved')}
          </h2>
          <p className="text-[14px] text-zinc-500 font-light">
            {t('onboarding_welcome_club')} {firstName}.
          </p>
        </motion.div>
      </motion.div>
    );
  };

  // Screen 11: Email Verification Required
  const renderStep11 = () => {
    return (
      <motion.div
        key="step11"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex flex-col items-center justify-center w-full h-full min-h-screen bg-white overflow-hidden text-black"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-col items-center text-center p-8 max-w-md mx-auto"
        >
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </div>
          
          <h2 className="text-2xl font-serif text-zinc-900 mb-4">
            {t('onboarding_verify_title')}
          </h2>
          <p className="text-[14px] text-zinc-500 font-light leading-relaxed">
            {t('onboarding_verify_desc1')} <strong className="text-zinc-800">{email}</strong>. 
            <br/><br/>
            {t('onboarding_verify_desc2')}
          </p>
          <div className="mt-8">
            <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-zinc-400 mt-4">{t('onboarding_redirecting')}</p>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {step === 0 && renderStep0()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      {step === 6 && renderStep6()}
      {step === 7 && renderStep7()}
      {step === 8 && renderStep8()}
      {step === 9 && renderStep9()}
      {step === 10 && renderStep10()}
      {step === 11 && renderStep11()}
    </AnimatePresence>
  );
};

export default Onboarding;

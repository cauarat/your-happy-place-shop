import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { designers } from '../data/products';
import { supabase } from '../lib/supabase';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState('');
  const [category, setCategory] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingText, setLoadingText] = useState('Analyzing profile...');
  const [authError, setAuthError] = useState('');
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  // Handle Step 8 transitions & Real Supabase Auth
  useEffect(() => {
    if (step === 8) {
      const performSignUp = async () => {
        setLoadingText('Analyzing profile...');
        
        try {
          // 1. Simulate the luxury curation delay (1s)
          await new Promise(resolve => setTimeout(resolve, 1000));
          setLoadingText('Curating exclusive catalog...');
          
          // 2. Perform real Supabase Auth Sign Up
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
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
            setStep(10); // Special step for email confirmation
          } else {
            // 3. Move to success screen
            setStep(9);
          }
        } catch (error: any) {
          console.error('Signup error:', error);
          setAuthError(error.message || 'Failed to create account');
          setStep(7); // Go back to email/password step to show error
        }
      };

      performSignUp();
    }
  }, [step, email, password, firstName, gender, category, selectedBrands]);

  // Handle Step 9 redirect (Success)
  useEffect(() => {
    if (step === 9) {
      const t = setTimeout(() => {
        // We no longer use localStorage for this, Supabase handles session
        localStorage.setItem('villaoro_onboarding_done', 'true');
        navigate('/');
      }, 2500);

      return () => clearTimeout(t);
    }
  }, [step, navigate]);

  // Handle Step 10 redirect (Email verification required)
  useEffect(() => {
    if (step === 10) {
      const t = setTimeout(() => {
        navigate('/login');
      }, 4000);

      return () => clearTimeout(t);
    }
  }, [step, navigate]);


  // Screen 1: The Invitation
  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 1.05 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center justify-center w-full h-full min-h-screen bg-black overflow-hidden"
    >
      {/* Background Headspace style */}
      <div className="absolute inset-0 z-0 bg-[#121212]">
        <div className="absolute top-[-10%] left-[50%] translate-x-[-50%] w-[80vw] h-[80vw] rounded-full bg-white/5 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-md p-8 pb-12 pt-20">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-3xl md:text-4xl font-normal tracking-[0.1em] text-white/90 mb-4 font-serif">
              Villa Oro
            </h1>
            <p className="text-sm md:text-base text-zinc-500 font-light tracking-wide max-w-[280px] mx-auto leading-relaxed">
              Curadoria de luxo.<br />Acesso restrito.
            </p>
          </motion.div>
        </div>

        <motion.div 
          className="w-full mt-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
        >
          <button 
            onClick={() => setStep(2)}
            className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-black py-4 px-6 rounded-full transition-all duration-300 overflow-hidden"
          >
            <span className="font-medium tracking-wide text-sm">Request Access</span>
          </button>
          
          <button 
            onClick={() => navigate('/login')}
            className="group relative w-full flex items-center justify-center gap-3 bg-transparent text-white/60 hover:text-white py-4 px-6 rounded-full transition-all duration-300 mt-2"
          >
            <span className="font-medium tracking-wide text-sm border-b border-white/20 pb-0.5">Already a member? Sign In</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );

  // Screen 2: First Name Input (Cosmos Style)
  const renderStep2 = () => (
    <motion.div
      key="step2"
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
              Enter your first name
            </h2>
            <p className="text-[13px] text-zinc-400 font-light mb-12">
              This will be used to personalize your curation.
            </p>

            <input
              type="text"
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
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
                setStep(3);
              }
            }}
            disabled={firstName.trim().length < 2}
            className={`group relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
              firstName.trim().length >= 2 
                ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10' 
                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <span className="font-medium tracking-wide text-sm">Continue</span>
          </button>
          
          <div className="flex justify-center">
            <button 
              onClick={() => setStep(1)}
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

  // Screen 3: Language (Cosmos Style - Zero Click Advance)
  const renderStep3 = () => {
    const languages = [
      { code: 'EN', name: 'English', native: 'English' },
      { code: 'PT', name: 'Portuguese', native: 'Português' },
      { code: 'ES', name: 'Spanish', native: 'Español' }
    ];

    return (
      <motion.div
        key="step3"
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
                Preferred language
              </h2>
              <p className="text-[13px] text-zinc-400 font-light">
                How should we communicate with you, {firstName}?
              </p>
            </motion.div>

            <div className="flex flex-col gap-3 w-full max-w-[280px]">
              {languages.map((lang, index) => (
                <motion.button
                  key={lang.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + (index * 0.1), duration: 0.5 }}
                  onClick={() => {
                    setLanguage(lang.code as any);
                    setTimeout(() => setStep(4), 200); 
                  }}
                  className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 ${
                    language === lang.code 
                      ? 'border-black bg-black text-white shadow-md' 
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <span className="font-serif text-lg">{lang.native}</span>
                  {language === lang.code && <Check className="w-4 h-4" />}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Bottom Back Button */}
          <motion.div 
            className="w-full mt-auto flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button 
              onClick={() => setStep(2)}
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

  // Screen 4: Style Profile / Gender (Cosmos Style - Zero Click Advance)
  const renderStep4 = () => {
    const options = [
      { id: 'masculino', label: 'Masculino' },
      { id: 'feminino', label: 'Feminino' },
      { id: 'ambos', label: 'Ambos' }
    ];

    return (
      <motion.div
        key="step4"
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
                Style Profile
              </h2>
              <p className="text-[13px] text-zinc-400 font-light">
                How do you prefer your fit?
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
                    setTimeout(() => setStep(5), 200); 
                  }}
                  className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 ${
                    gender === opt.id 
                      ? 'border-black bg-black text-white shadow-md' 
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:shadow-sm'
                  }`}
                >
                  <span className="font-serif text-lg">{opt.label}</span>
                  {gender === opt.id && <Check className="w-4 h-4" />}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Bottom Back Button */}
          <motion.div 
            className="w-full mt-auto flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button 
              onClick={() => setStep(3)}
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

  // Screen 5: Category Intent (Cosmos Style - Zero Click Advance)
  const renderStep5 = () => {
    const categories = [
      { id: 'Footwear', icon: '👟' },
      { id: 'Clothing', icon: '👕' },
      { id: 'Bags', icon: '👜' },
      { id: 'Jewelry', icon: '💍' },
      { id: 'Accessories', icon: '🕶️' }
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
                The Hunt
              </h2>
              <p className="text-[13px] text-zinc-400 font-light">
                What are you looking for today? Select one.
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
                    setTimeout(() => setStep(6), 200); 
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

  // Screen 6: Brand Affinity (Cosmos Style - Multi Select)
  const renderStep6 = () => {
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
        key="step6"
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
              Brand Affinity
            </h2>
            <p className="text-[13px] text-zinc-400 font-light">
              Which houses align with your taste? (Choose up to 3)
            </p>
          </motion.div>

          <div className="flex-1 w-full overflow-y-auto pb-24 scrollbar-hide">
            <div className="flex flex-wrap justify-center gap-2 w-full px-2">
              {designers.map((brand, index) => {
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
              onClick={() => setStep(7)}
              disabled={selectedBrands.length === 0}
              className={`group relative w-full flex items-center justify-between gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
                selectedBrands.length > 0 
                  ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10' 
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <span className="font-medium tracking-wide text-sm">Continue</span>
              <span className="text-xs font-mono opacity-60">{selectedBrands.length} / 3</span>
            </button>
            
            <div className="flex justify-center">
              <button 
                onClick={() => setStep(5)}
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

  // Screen 7: Contact / Email (Cosmos Style)
  const renderStep7 = () => {
    const isValidEmail = (email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    return (
      <motion.div
        key="step7"
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
                Enter your email address
              </h2>
              <p className="text-[13px] text-zinc-400 font-light mb-12">
                To secure your profile and request access.
              </p>

              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
                placeholder="Email address"
                className="w-full text-center text-2xl md:text-3xl font-serif text-black placeholder:text-zinc-200 outline-none bg-transparent caret-amber-500 pb-2 border-b border-transparent focus:border-zinc-200 transition-colors"
              />
              
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                placeholder="Password"
                className="w-full text-center text-2xl md:text-3xl font-serif text-black placeholder:text-zinc-200 outline-none bg-transparent caret-amber-500 pb-2 border-b border-transparent focus:border-zinc-200 transition-colors mt-6"
              />
              
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
                  setStep(8);
                }
              }}
              disabled={!isValidEmail(email) || password.length < 6}
              className={`group relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
                isValidEmail(email) && password.length >= 6
                  ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10' 
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <span className="font-medium tracking-wide text-sm">Request Access</span>
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

  // Screen 8: The Analysis / Waiting List Simulation (Headspace Style)
  const renderStep8 = () => {

    return (
      <motion.div
        key="step8"
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

  // Screen 9: Access Approved (Zero-Click redirect to Catalog)
  const renderStep9 = () => {

    return (
      <motion.div
        key="step9"
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
            Access Approved
          </h2>
          <p className="text-[14px] text-zinc-500 font-light">
            Welcome to the club, {firstName}.
          </p>
        </motion.div>
      </motion.div>
    );
  };

  // Screen 10: Email Verification Required
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
          className="flex flex-col items-center text-center p-8 max-w-md mx-auto"
        >
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </div>
          
          <h2 className="text-2xl font-serif text-zinc-900 mb-4">
            Verify Your Email
          </h2>
          <p className="text-[14px] text-zinc-500 font-light leading-relaxed">
            We've sent a verification link to <strong className="text-zinc-800">{email}</strong>. 
            <br/><br/>
            Please check your inbox (and spam folder) to verify your account before logging in.
          </p>
          <div className="mt-8">
            <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-zinc-400 mt-4">Redirecting to login...</p>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      {step === 6 && renderStep6()}
      {step === 7 && renderStep7()}
      {step === 8 && renderStep8()}
      {step === 9 && renderStep9()}
      {step === 10 && renderStep10()}
    </AnimatePresence>
  );
};

export default Onboarding;

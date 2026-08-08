import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, X, Heart, UserPlus, Check, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { CosmoColorIcon } from "./Icons";
import { PromptBox } from "./ui/prompt-box";
import { GradientShimmer } from "./ui/gradient-shimmer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import { useMusicPlayer } from "@/contexts/MusicContext";
import { VinylButton } from "@/components/BackgroundMusic";
import LanguageSwitcher from "./LanguageSwitcher";
import { useCart } from "@/contexts/CartContext";
import { getDesignSettings, getProducts, getDesigners, getCategories } from "@/lib/store";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
const Header = () => {
  const { t, language } = useLanguage();
  const { itemCount } = useCart();
  const { session, user, signOut } = useAuth();
  const { searchQuery, setSearchQuery, selectedColor, setSelectedColor, selectedDesigner, setSelectedDesigner } = useSearch();
  const { isPlaying, isVisible, togglePlay } = useMusicPlayer();
  const [isFocused, setIsFocused] = useState(false);
  const [enableNews, setEnableNews] = useState(true);
  const [suggestion, setSuggestion] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const brandFilterRef = useRef<HTMLDivElement>(null);
  const colorFilterRef = useRef<HTMLDivElement>(null);
  const [isBrandFilterOpen, setIsBrandFilterOpen] = useState(false);
  const [isColorFilterOpen, setIsColorFilterOpen] = useState(false);
  const [designers, setDesigners] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setEnableNews(getDesignSettings().enableNewsPage !== false);
    setDesigners(getDesigners());
  }, []);

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (isBrandFilterOpen && brandFilterRef.current && !brandFilterRef.current.contains(e.target as Node)) {
        setIsBrandFilterOpen(false);
      }
      if (isColorFilterOpen && colorFilterRef.current && !colorFilterRef.current.contains(e.target as Node)) {
        setIsColorFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isBrandFilterOpen, isColorFilterOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestion("");
      return;
    }

    const q = searchQuery.toLowerCase();

    // Group 1: High Priority (Designers & Categories)
    const highPriority: string[] = [];
    getDesigners().forEach(d => highPriority.push(d));
    getCategories().forEach(c => {
      const translated = t(c.toLowerCase());
      highPriority.push(translated !== c.toLowerCase() ? translated : c);
    });

    // Group 2: Medium Priority (Full Product Names)
    const mediumPriority: string[] = [];
    getProducts().forEach(p => {
      mediumPriority.push(p.name);
      const translatedName = t(p.name);
      if (translatedName !== p.name) mediumPriority.push(translatedName);
    });

    // Group 3: Low Priority (Individual words from product names)
    const lowPriority: string[] = [];
    mediumPriority.forEach(name => {
      name.split(' ').forEach(w => {
        // Only consider words longer than 2 chars
        if (w.length > 2) {
          lowPriority.push(w);
        }
      });
    });

    const findMatch = (list: string[], query: string) => {
      const matches = list.filter(item => item.toLowerCase().startsWith(query) && item.length > query.length);
      if (matches.length > 0) {
        // Sort by length to give the most concise completion
        matches.sort((a, b) => a.length - b.length);
        return matches[0];
      }
      return null;
    };

    // Attempt full query match
    let match = findMatch(highPriority, q) || findMatch(mediumPriority, q) || findMatch(lowPriority, q);

    // If no match for the full query, but it has multiple words, try completing the last word
    if (!match && q.includes(' ')) {
      const words = q.split(' ');
      const lastWord = words[words.length - 1];
      if (lastWord.length > 0) {
        const lastWordMatch = findMatch(highPriority, lastWord) || findMatch(mediumPriority, lastWord) || findMatch(lowPriority, lastWord);
        if (lastWordMatch) {
          // Append the completion to the full query
          const completion = lastWordMatch.slice(lastWord.length);
          match = searchQuery + completion;
        }
      }
    }

    setSuggestion(match || "");
  }, [searchQuery, t]);

  const colors = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#ffffff" },
    { name: "Red", hex: "#ef4444" },
    { name: "Green", hex: "#22c55e" },
    { name: "Yellow", hex: "#eab308" },
    { name: "Blue", hex: "#3b82f6" },
    { name: "Brown", hex: "#a16207" },
    { name: "Orange", hex: "#f97316" },
    { name: "Pink", hex: "#ec4899" },
    { name: "Purple", hex: "#a855f7" },
    { name: "Gray", hex: "#6b7280" },
  ];


  return (
    <header 
      className="sticky top-0 z-50 pt-[env(safe-area-inset-top)]"
      style={{
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      }}
    >
      <div className="flex items-center justify-between px-2.5 sm:px-4 lg:px-8 h-14 sm:h-16 w-full gap-2 sm:gap-4">


        {/* Right Nav */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 lg:gap-5 shrink-0 ml-auto">
          <Link to="/cart" className="relative hover:opacity-70 transition-opacity flex items-center p-0.5">
            <Heart size={20} strokeWidth={1.5} className="sm:w-[22px] sm:h-[22px]" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FF3B30] text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-sm border border-white/20">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Menu (Language & Login) for all screen sizes */}
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <button className="hover:opacity-75 transition-opacity p-1" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[24px] sm:h-[24px]">
                    <line x1="8" y1="8" x2="20" y2="8" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="16" x2="16" y2="16" />
                  </svg>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80%] max-w-[300px] p-6 bg-white z-[100]">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex flex-col gap-6 mt-8">
                  <div className="flex flex-col gap-4 w-full">
                    <div className="flex items-center gap-4 justify-between border-b border-border pb-4">
                      <span className="text-sm font-medium">Background Music</span>
                      <VinylButton isPlaying={isPlaying} isVisible={isVisible} onToggle={togglePlay} />
                    </div>
                    <Link to="/community" className="flex items-center gap-3 text-sm font-medium hover:text-[#555] transition-colors border-b border-border pb-4">
                      <svg width="20" height="14" viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <circle cx="10" cy="8" r="3.8" strokeWidth="2.2" />
                        <path d="M3.5 23c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeWidth="2.2" />
                        <circle cx="24" cy="6" r="3.8" strokeWidth="2.2" />
                        <path d="M17.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeWidth="2.2" />
                        <circle cx="38" cy="8" r="3.8" strokeWidth="2.2" />
                        <path d="M31.5 23c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeWidth="2.2" />
                      </svg>
                      Community Looks
                    </Link>
                    <LanguageSwitcher />
                  </div>
                  <div className="space-y-4 border-t border-border pt-6">
                    {session ? (
                      <div className="flex flex-col gap-4">
                        <div className="text-sm font-medium text-black">
                          Hello, {user?.user_metadata?.first_name || user?.email}
                        </div>
                        <button 
                          onClick={async () => await signOut()}
                          className="flex items-center gap-2 text-left text-xs uppercase tracking-widest font-bold hover:text-red-600 transition-colors text-red-500"
                        >
                          <UserPlus size={18} strokeWidth={2} />
                          Log Out
                        </button>
                      </div>
                    ) : (
                      <Link to="/login" className="flex items-center gap-2 text-left text-xs uppercase tracking-widest font-bold hover:text-[#555] transition-colors">
                        <UserPlus size={18} strokeWidth={2} />
                        {t('login')}
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Search Bar Row — Liquid Glass */}
      <div
        data-tour="search-bar"
        className="px-2.5 sm:px-4 lg:px-8 w-full pb-3 flex flex-col items-center gap-4"
      >
        <div className="flex flex-col items-center gap-2">
          <GradientShimmer
            gradient="sunrise"
            easing="smooth"
            duration={2}
            spread={3}
            angle={105}
            pauseBetween={2000}
            className="text-lg sm:text-2xl font-medium tracking-tight text-black text-center"
          >
            {t('hey_what_can_i_help_you_find').replace('{name}', user?.user_metadata?.first_name || 'Cauã')}
          </GradientShimmer>
        </div>
        <div className="flex-1 w-full relative z-[5]">
          <PromptBox
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              if (location.pathname !== "/") {
                navigate("/");
              }
            }}
            onSubmit={() => {
              if (location.pathname !== "/") {
                navigate("/");
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab" && suggestion) {
                e.preventDefault();
                setSearchQuery(searchQuery + suggestion.slice(searchQuery.length));
              }
            }}
            suggestion={suggestion}
            placeholder={t('search') + " " + t('search_placeholder')}
          leftActions={
              <>
                {/* Brand Filter Button — iOS style */}
        <div className="relative" ref={brandFilterRef}>
          <button
            onClick={() => setIsBrandFilterOpen(!isBrandFilterOpen)}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full transition-all duration-300 outline-none"
            style={selectedDesigner ? {
              background: 'rgba(0,0,0,0.85)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            } : {
              background: 'rgba(118, 118, 128, 0.12)',
              color: 'rgba(60, 60, 67, 0.6)',
            }}
            title="Filter by brand"
          >
            <SlidersHorizontal size={14} />
          </button>

          {/* iOS 27 Liquid Glass popup (Brand) */}
          {isBrandFilterOpen && (
            <div
              className="absolute top-full left-0 mt-2 w-60 rounded-[22px] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.75) 50%, rgba(240,240,245,0.85) 100%)',
                backdropFilter: 'blur(60px) saturate(180%)',
                WebkitBackdropFilter: 'blur(60px) saturate(180%)',
                boxShadow: `
                  0 8px 48px rgba(0,0,0,0.10),
                  0 2px 16px rgba(0,0,0,0.06),
                  inset 0 1px 0 rgba(255,255,255,0.7),
                  inset 0 -1px 0 rgba(255,255,255,0.15)
                `,
                border: '0.5px solid rgba(255,255,255,0.55)',
              }}
            >
              {/* Specular highlight overlay */}
              <div
                className="absolute inset-0 rounded-[22px] pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.05) 100%)',
                }}
              />
              {/* Header */}
              <div className="relative px-4 pt-4 pb-2.5" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-black/85">Filter</span>
                  {selectedDesigner && (
                    <span className="text-[11px] text-black/40 truncate ml-2 max-w-[120px]">{selectedDesigner}</span>
                  )}
                </div>
              </div>

              {/* Options List */}
              <div className="relative py-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
                {/* All Brands */}
                <button
                  onClick={() => { setSelectedDesigner(null); setIsBrandFilterOpen(false); if (location.pathname !== '/') navigate('/'); }}
                  className="relative flex items-center gap-2.5 px-3 py-2 rounded-full shrink-0 w-[calc(100%-16px)] mx-2 my-0.5 hover:bg-black/5"
                >
                  {!selectedDesigner && (
                    <motion.div
                      layoutId="active-brand-bg"
                      className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                      transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                    />
                  )}
                  <motion.span 
                    className="relative z-10 flex items-center gap-2.5 w-full"
                    animate={{ color: !selectedDesigner ? '#ffffff' : '#4a4a4d' }}
                    transition={{ duration: 0.15, ease: "linear" }}
                  >
                    <span className="w-5 h-5 flex items-center justify-center shrink-0">
                      {!selectedDesigner && <Check size={15} strokeWidth={2.5} />}
                    </span>
                    <span className="text-[13px] font-medium tracking-wide">All Brands</span>
                  </motion.span>
                </button>

                {designers.map((d) => {
                  const isActive = selectedDesigner === d;
                  return (
                    <button
                      key={d}
                      onClick={() => { setSelectedDesigner(d); setIsBrandFilterOpen(false); if (location.pathname !== '/') navigate('/'); }}
                      className="relative flex items-center gap-2.5 px-3 py-2 rounded-full shrink-0 w-[calc(100%-16px)] mx-2 my-0.5 hover:bg-black/5"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-brand-bg"
                          className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                          transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                        />
                      )}
                      <motion.span 
                        className="relative z-10 flex items-center gap-2.5 w-full"
                        animate={{ color: isActive ? '#ffffff' : '#4a4a4d' }}
                        transition={{ duration: 0.15, ease: "linear" }}
                      >
                        <span className="w-5 h-5 flex items-center justify-center shrink-0">
                          {isActive && <Check size={15} strokeWidth={2.5} />}
                        </span>
                        <span className="text-[13px] font-medium tracking-wide">{d}</span>
                      </motion.span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
                {/* Color Filter Selector — iOS style */}
        <div className="relative" ref={colorFilterRef}>
          <button
            onClick={() => setIsColorFilterOpen(!isColorFilterOpen)}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full transition-all duration-300 outline-none"
            style={selectedColor ? {
              background: 'transparent',
            } : {
              background: 'rgba(118, 118, 128, 0.12)',
            }}
            title="Filter by color"
          >
            {selectedColor ? (
              <div 
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-black/15 shadow-sm" 
                style={{ backgroundColor: colors.find(c => c.name === selectedColor)?.hex }}
              />
            ) : (
              <CosmoColorIcon size={16} className="opacity-80" />
            )}
          </button>

          {/* iOS 27 Liquid Glass popup (Color) */}
          {isColorFilterOpen && (
            <div
              className="absolute top-full right-0 mt-2 w-60 rounded-[22px] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.75) 50%, rgba(240,240,245,0.85) 100%)',
                backdropFilter: 'blur(60px) saturate(180%)',
                WebkitBackdropFilter: 'blur(60px) saturate(180%)',
                boxShadow: `
                  0 8px 48px rgba(0,0,0,0.10),
                  0 2px 16px rgba(0,0,0,0.06),
                  inset 0 1px 0 rgba(255,255,255,0.7),
                  inset 0 -1px 0 rgba(255,255,255,0.15)
                `,
                border: '0.5px solid rgba(255,255,255,0.55)',
              }}
            >
              {/* Specular highlight overlay */}
              <div
                className="absolute inset-0 rounded-[22px] pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.05) 100%)',
                }}
              />

              {/* Header */}
              <div className="relative px-4 pt-4 pb-2.5" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-black/85">Colors</span>
                  {selectedColor && (
                    <span className="text-[11px] text-black/40 truncate ml-2 max-w-[120px]">{selectedColor}</span>
                  )}
                </div>
              </div>

              {/* Options List */}
              <div className="relative py-1.5 max-h-[300px] overflow-y-auto">
                {/* All Colors */}
                <button
                  onClick={() => { setSelectedColor(null); setIsColorFilterOpen(false); }}
                  className="relative flex items-center gap-2.5 px-3 py-2 rounded-full shrink-0 w-[calc(100%-16px)] mx-2 my-0.5 hover:bg-black/5"
                >
                  {!selectedColor && (
                    <motion.div
                      layoutId="active-color-bg"
                      className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                      transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                    />
                  )}
                  <motion.span 
                    className="relative z-10 flex items-center gap-2.5 w-full"
                    animate={{ color: !selectedColor ? '#ffffff' : '#4a4a4d' }}
                    transition={{ duration: 0.15, ease: "linear" }}
                  >
                    <span className="w-5 h-5 flex items-center justify-center shrink-0">
                      {!selectedColor && <Check size={15} strokeWidth={2.5} />}
                    </span>
                    <div className="w-4 h-4 rounded-full border border-dashed border-[#ccc] bg-white/20" />
                    <span className="text-[13px] font-medium tracking-wide">All colors</span>
                  </motion.span>
                </button>

                {colors.map((color) => {
                  const isActive = selectedColor === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={() => { setSelectedColor(color.name); setIsColorFilterOpen(false); }}
                      className="relative flex items-center gap-2.5 px-3 py-2 rounded-full shrink-0 w-[calc(100%-16px)] mx-2 my-0.5 hover:bg-black/5"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-color-bg"
                          className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                          transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                        />
                      )}
                      <motion.span 
                        className="relative z-10 flex items-center gap-2.5 w-full"
                        animate={{ color: isActive ? '#ffffff' : '#4a4a4d' }}
                        transition={{ duration: 0.15, ease: "linear" }}
                      >
                        <span className="w-5 h-5 flex items-center justify-center shrink-0">
                          {isActive && <Check size={15} strokeWidth={2.5} />}
                        </span>
                        <div 
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-[13px] font-medium tracking-wide">{color.name}</span>
                      </motion.span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
              </>
            }
          />
        </div>
      </div>

    </header>
  );
};

export default Header;
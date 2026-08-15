import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, X, Heart, UserPlus, Check, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { CosmoColorIcon } from "./Icons";
import { PromptInput } from "./ui/ai-chat-input";
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
  // Drives the masthead's collapse. Read straight off the scroll position with
  // a passive listener rather than a motion value — this is a boolean that
  // flips once, not a value that animates.
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getGreetingKey = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'greeting_morning';
    if (hour >= 12 && hour < 18) return 'greeting_afternoon';
    return 'greeting_evening';
  };
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


  const navItems = [
    { label: t('shop') || 'Shop', to: '/' },
    ...(enableNews ? [{ label: t('news') || 'News', to: '/news' }] : []),
    { label: t('community_looks') || 'Community', to: '/community' },
  ];

  return (
    <>
      {/* Masthead. One sticky bar carrying identity, navigation and utilities —
          replacing the fixed, transparent icon cluster that used to float over
          the catalogue with nothing behind it. The greeting and search below
          collapse away on scroll, so what stays pinned is only ever a 56px
          bar, not a 200px block. */}
      <header className="sticky top-0 z-50 bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 hairline-b">
        <div className="shell-wide relative flex h-14 items-center justify-between gap-6 md:h-[68px]">
          <Link
            to="/"
            aria-label="Villaoro — home"
            className="font-display shrink-0 text-[27px] leading-none tracking-[-0.02em] text-ink transition-opacity duration-base ease-sine hover:opacity-60 md:text-[31px]"
          >
            Villaoro
          </Link>

          {/* Centre nav, optically centred on the bar rather than on whatever
              space the wordmark leaves over. */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                aria-current={location.pathname === item.to ? 'page' : undefined}
                className="nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/cart"
            aria-label={`${t('bag') || 'Bag'}${itemCount > 0 ? ` (${itemCount})` : ''}`}
            className="relative flex h-10 w-10 items-center justify-center transition-opacity duration-base ease-sine hover:opacity-60"
          >
            <Heart size={19} strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-ink px-1 font-mono text-[9px] tabular-nums leading-none text-paper">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Menu (Language & Login) for all screen sizes */}
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center transition-opacity duration-base ease-sine hover:opacity-60" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="8" x2="20" y2="8" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="16" x2="16" y2="16" />
                  </svg>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="z-[100] w-[86%] max-w-[340px] border-l-hairline border-ink/15 bg-paper p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="flex h-full flex-col px-6 pb-8 pt-16">
                  {/* Primary destinations, set large — a menu that opens over
                      the page should answer "where can I go" before anything
                      else, at a size you can hit with a thumb. */}
                  <nav className="flex flex-col md:hidden">
                    {navItems.map((item) => (
                      <Link
                        key={`sheet-${item.to}-${item.label}`}
                        to={item.to}
                        className="type-h3 py-3.5 transition-opacity duration-base ease-sine hairline-b hover:opacity-55"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>

                  <div className="mt-8 flex flex-col gap-6">
                  <div className="flex flex-col gap-4 w-full">
                    <div className="flex items-center justify-between gap-4 pb-4 hairline-b">
                      <span className="type-label text-ink/60">Background Music</span>
                      <VinylButton isPlaying={isPlaying} isVisible={isVisible} onToggle={togglePlay} />
                    </div>
                    <Link to="/community" className="type-label flex items-center gap-3 pb-4 text-ink/60 transition-colors duration-base ease-sine hairline-b hover:text-ink md:hidden">
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
                  {/* Account sits at the bottom of the sheet, pushed there by
                      mt-auto: it's the least-used thing in here and shouldn't
                      compete with navigation for the top of the panel. */}
                  <div className="mt-auto space-y-4 pt-8">
                    {session ? (
                      <div className="flex flex-col gap-4">
                        <div className="text-[13px] text-ink/60">
                          {user?.user_metadata?.first_name || user?.email}
                        </div>
                        <button
                          onClick={async () => await signOut()}
                          className="type-label flex items-center gap-2 text-left text-ink/50 transition-colors duration-base ease-sine hover:text-critical"
                        >
                          <UserPlus size={15} strokeWidth={1.8} />
                          Log Out
                        </button>
                      </div>
                    ) : (
                      <Link to="/login" className="type-label flex items-center gap-2 text-left transition-opacity duration-base ease-sine hover:opacity-60">
                        <UserPlus size={15} strokeWidth={1.8} />
                        {t('login')}
                      </Link>
                    )}
                  </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        </div>

      {/* Greeting + search. Collapses to nothing once the catalogue is moving
          — a personal greeting is worth a third of the screen when you arrive
          and worth none of it once you're shopping. */}
      <motion.div
        data-tour="search-bar"
        animate={{
          height: isScrolled ? 0 : 'auto',
          opacity: isScrolled ? 0 : 1,
        }}
        initial={false}
        transition={{ duration: 0.4, ease: [0.445, 0.05, 0.55, 0.95] }}
        className="overflow-hidden"
      >
        <div className="shell-wide flex w-full flex-col items-center gap-4 pb-5 pt-1">
        <div className="flex flex-col items-center gap-2">
          <div className="relative inline-block">
            <motion.div
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 2, ease: [0.45, 0, 0.55, 1] }}
              style={{ display: 'inline-block', paddingRight: '4px' }}
            >
          <GradientShimmer
            gradient="sunrise"
            easing="smooth"
            duration={2}
            spread={3}
            angle={105}
            pauseBetween={2000}
            className="font-display text-center text-[30px] font-light leading-none tracking-[-0.02em] text-ink sm:text-[42px]"
          >
            {t(getGreetingKey()).replace('{name}', user?.user_metadata?.first_name || 'Cauã')}
          </GradientShimmer>
            </motion.div>

            {/* Blinking Cursor that tracks with the wipe */}
            <motion.span
              initial={{ left: '0%', opacity: 0 }}
              animate={{ left: '100%', opacity: [1, 1, 0, 0] }}
              transition={{
                left: { duration: 2, ease: [0.45, 0, 0.55, 1] },
                opacity: { duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }
              }}
              className="font-display absolute bottom-0 top-0 flex items-center text-[30px] font-extralight text-ink/40 sm:text-[42px]"
            >
              |
            </motion.span>
          </div>
        </div>
        <div className="flex-1 w-full relative z-[5]">
          <PromptInput
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
            placeholder={t('search_help')}
          leftActions={
              <>
                {/* Brand Filter Button — iOS style */}
        <div className="relative" ref={brandFilterRef}>
          <button
            onClick={() => setIsBrandFilterOpen(!isBrandFilterOpen)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-hairline outline-none transition-colors duration-base ease-sine ${
              selectedDesigner
                ? 'border-transparent bg-ink text-paper'
                : 'border-ink/15 bg-paper text-ink/50 hover:border-ink/30 hover:text-ink'
            }`}
            aria-pressed={!!selectedDesigner}
            title="Filter by brand"
          >
            <SlidersHorizontal size={13} />
          </button>

          {/* A panel, not a pane of glass: opaque, square, hairlined, with the
              one shadow the system allows for something that genuinely floats
              above the page. */}
          {isBrandFilterOpen && (
            <div className="absolute left-0 top-full z-[100] mt-2 w-60 overflow-hidden border-hairline border-ink/15 bg-paper shadow-pop animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Header */}
              <div className="relative px-4 pb-2.5 pt-3.5 hairline-b">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">{t('brands') || 'Brands'}</span>
                  {selectedDesigner && (
                    <span className="truncate text-[11px] text-ink/40">{selectedDesigner}</span>
                  )}
                </div>
              </div>

              {/* Options List */}
              <div className="relative py-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
                {/* All Brands */}
                <button
                  onClick={() => { setSelectedDesigner(null); setIsBrandFilterOpen(false); if (location.pathname !== '/') navigate('/'); }}
                  className="relative mx-1.5 my-px flex w-[calc(100%-12px)] shrink-0 items-center gap-2.5 px-2.5 py-2 hover:bg-ink/5"
                >
                  {!selectedDesigner && (
                    <motion.div
                      layoutId="active-brand-bg"
                      className="absolute inset-0 z-0 bg-ink"
                      transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.7 }}
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
                      className="relative mx-1.5 my-px flex w-[calc(100%-12px)] shrink-0 items-center gap-2.5 px-2.5 py-2 hover:bg-ink/5"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-brand-bg"
                          className="absolute inset-0 z-0 bg-ink"
                          transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.7 }}
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
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-hairline outline-none transition-colors duration-base ease-sine ${
              selectedColor
                ? 'border-ink/30 bg-paper'
                : 'border-ink/15 bg-paper text-ink/50 hover:border-ink/30 hover:text-ink'
            }`}
            aria-pressed={!!selectedColor}
            title="Filter by color"
          >
            {selectedColor ? (
              <div
                className="h-4 w-4 rounded-full border-hairline border-ink/20"
                style={{ backgroundColor: colors.find(c => c.name === selectedColor)?.hex }}
              />
            ) : (
              <CosmoColorIcon size={14} className="opacity-80" />
            )}
          </button>

          {isColorFilterOpen && (
            <div className="absolute right-0 top-full z-[100] mt-2 w-60 overflow-hidden border-hairline border-ink/15 bg-paper shadow-pop animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Header */}
              <div className="relative px-4 pb-2.5 pt-3.5 hairline-b">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">{t('colors') || 'Colours'}</span>
                  {selectedColor && (
                    <span className="truncate text-[11px] text-ink/40">{selectedColor}</span>
                  )}
                </div>
              </div>

              {/* Options List */}
              <div className="relative py-1.5 max-h-[300px] overflow-y-auto">
                {/* All Colors */}
                <button
                  onClick={() => { setSelectedColor(null); setIsColorFilterOpen(false); }}
                  className="relative mx-1.5 my-px flex w-[calc(100%-12px)] shrink-0 items-center gap-2.5 px-2.5 py-2 hover:bg-ink/5"
                >
                  {!selectedColor && (
                    <motion.div
                      layoutId="active-color-bg"
                      className="absolute inset-0 z-0 bg-ink"
                      transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.7 }}
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
                      className="relative mx-1.5 my-px flex w-[calc(100%-12px)] shrink-0 items-center gap-2.5 px-2.5 py-2 hover:bg-ink/5"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-color-bg"
                          className="absolute inset-0 z-0 bg-ink"
                          transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.7 }}
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
      </motion.div>
    </header>
    </>
  );
};

export default Header;
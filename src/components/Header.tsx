import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, X, ShoppingBag, UserPlus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearch } from "@/contexts/SearchContext";
import { useMusicPlayer } from "@/contexts/MusicContext";
import { VinylButton } from "@/components/BackgroundMusic";
import LanguageSwitcher from "./LanguageSwitcher";
import { useCart } from "@/contexts/CartContext";
import { getDesignSettings, getProducts, getDesigners, getCategories } from "@/lib/store";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const Header = () => {
  const { t, language } = useLanguage();
  const { itemCount } = useCart();
  const { searchQuery, setSearchQuery } = useSearch();
  const { isPlaying, isVisible, togglePlay } = useMusicPlayer();
  const [isFocused, setIsFocused] = useState(false);
  const [enableNews, setEnableNews] = useState(true);
  const [suggestion, setSuggestion] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setEnableNews(getDesignSettings().enableNewsPage !== false);
  }, []);

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

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      {/* Unified Header — same layout on all screen sizes */}
      <div className="flex items-center justify-between px-3 sm:px-6 lg:px-10 h-14 sm:h-16 max-w-[1600px] mx-auto w-full gap-2 sm:gap-4">
        {/* Left: Logo */}
        <div className="flex items-center shrink-0">
          <Link to={enableNews ? "/news" : "/"} className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tighter leading-none shrink-0">
            Villaoro
          </Link>
        </div>

        {/* Center: AI Search Bar */}
        <div className="flex-1 max-w-[600px] flex justify-center mx-2 sm:mx-4">
          <div className="w-full">
            <div
              className={`flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border transition-all duration-300 ${isFocused
                  ? "border-black bg-white shadow-sm"
                  : "border-[#e0e0e0] bg-[#f8f8f8] hover:border-[#ccc]"
                }`}
            >
              <Sparkles size={12} className={`shrink-0 transition-colors sm:w-[14px] sm:h-[14px] ${isFocused ? "text-black" : "text-[#aaa]"}`} />
              <div className="relative flex-1 min-w-0 flex items-center">
                {suggestion && isFocused && searchQuery && suggestion.toLowerCase().startsWith(searchQuery.toLowerCase()) && (
                  <div className="absolute inset-0 pointer-events-none flex items-center text-[11px] sm:text-[12px] text-[#bbb] whitespace-pre overflow-hidden">
                    <span className="opacity-0">{searchQuery}</span>
                    <span>{suggestion.slice(searchQuery.length)}</span>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (location.pathname !== "/") {
                      navigate("/");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && suggestion && isFocused) {
                      e.preventDefault();
                      setSearchQuery(searchQuery + suggestion.slice(searchQuery.length));
                    } else if (e.key === "ArrowRight" && suggestion && isFocused && inputRef.current && inputRef.current.selectionStart === searchQuery.length) {
                      e.preventDefault();
                      setSearchQuery(searchQuery + suggestion.slice(searchQuery.length));
                    }
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={t('search') + " products, designers..."}
                  className="w-full text-[11px] sm:text-[12px] outline-none bg-transparent placeholder:text-[#bbb] text-black relative z-10"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
                  className="text-[#999] hover:text-black transition-colors shrink-0 z-20"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Nav */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 lg:gap-5 shrink-0">
          <VinylButton isPlaying={isPlaying} isVisible={isVisible} onToggle={togglePlay} />
          <a href="https://www.altadaily.com/" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity flex items-center justify-center text-black" title="Create a look on Alta Daily">
            <svg width="20" height="14" viewBox="0 0 48 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[22px] sm:h-[16px]">
              {/* Left person */}
              <circle cx="10" cy="8" r="3.8" strokeWidth="2.2" />
              <path d="M3.5 23c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeWidth="2.2" />
              {/* Center person (slightly forward) */}
              <circle cx="24" cy="6" r="3.8" strokeWidth="2.2" />
              <path d="M17.5 21c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeWidth="2.2" />
              {/* Right person */}
              <circle cx="38" cy="8" r="3.8" strokeWidth="2.2" />
              <path d="M31.5 23c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeWidth="2.2" />
            </svg>
          </a>
          <Link to="/cart" className="hover:opacity-70 transition-opacity flex items-center gap-1">
            <ShoppingBag size={16} strokeWidth={1.5} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-[9px] sm:text-[10px] font-medium">({itemCount})</span>
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
                  <div className="flex flex-col w-full">
                    <LanguageSwitcher />
                  </div>
                  <div className="space-y-4 border-t border-border pt-6">
                    <button className="flex items-center gap-2 text-left text-xs uppercase tracking-widest font-bold hover:text-[#555] transition-colors">
                      <UserPlus size={18} strokeWidth={2} />
                      {t('login')}
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Menu, Search, User, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearch } from "@/contexts/SearchContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const SsenseBagIcon = ({ count }: { count: number }) => (
  <div className="relative flex items-center justify-center w-5 h-5">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M4 6V15C4 15.5523 4.44772 16 5 16H13C13.5523 16 14 15.5523 14 15V6" />
      <path d="M6 8V5C6 3.34315 7.34315 2 9 2C10.6569 2 12 3.34315 12 5V8" />
    </svg>
    <span className="absolute top-[5px] text-[8px] font-bold tracking-tight text-center w-full">
      {count}
    </span>
  </div>
);

const Header = () => {
  const { t } = useLanguage();
  const { searchQuery, setSearchQuery } = useSearch();
  const [isFocused, setIsFocused] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearchMobile && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [showSearchMobile]);

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-6 lg:px-10 h-16 max-w-[1600px] mx-auto w-full gap-4">
        <div className="flex items-center gap-8 lg:gap-16 flex-1">
          {/* Logo */}
          <a href="/" className="text-3xl font-bold tracking-tighter leading-none shrink-0 uppercase">
            Villaoro
          </a>

          {/* AI Search Bar */}
          <div className="flex-1 max-w-[480px]">
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all duration-300 ${
                isFocused
                  ? "border-black bg-white shadow-sm"
                  : "border-[#e0e0e0] bg-[#f8f8f8] hover:border-[#ccc]"
              }`}
            >
              <Sparkles size={14} className={`shrink-0 transition-colors ${isFocused ? "text-black" : "text-[#aaa]"}`} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={t('search') + " products, designers..."}
                className="flex-1 text-[12px] outline-none bg-transparent placeholder:text-[#bbb] text-black"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
                  className="text-[#999] hover:text-black transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Nav */}
        <div className="flex items-center justify-end gap-6 shrink-0">
          <LanguageSwitcher />
          <button className="text-[10px] uppercase font-bold tracking-widest hover:underline underline-offset-4">{t('login')}</button>
          <button className="hover:opacity-70 transition-opacity flex items-center gap-1">
            <ShoppingBag size={18} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">(0)</span>
          </button>
        </div>
      </div>

      {/* Mobile Header (Inspired by SSENSE) */}
      <div className="lg:hidden flex items-center justify-between px-4 h-14 w-full relative">
        {/* Left Side: Hamburger Menu & Search Toggle */}
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="hover:opacity-75 transition-opacity py-2" aria-label="Menu">
                <Menu size={18} strokeWidth={1.5} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] max-w-[300px] p-6 flex flex-col justify-between bg-white z-[100]">
              <div className="space-y-8 pt-8">
                <a href="/" className="text-2xl font-bold tracking-[0.2em] uppercase leading-none block border-b border-black pb-4">
                  Villaoro
                </a>
                <nav className="flex flex-col gap-6">
                  <a href="/" className="text-xs uppercase tracking-widest font-medium hover:text-black text-[#555]">
                    {t('shop') || "Shop"}
                  </a>
                  <a href="/admin/login" className="text-xs uppercase tracking-widest font-medium hover:text-black text-[#555]">
                    {t('admin_portal') || "Admin Portal"}
                  </a>
                  <button className="text-left text-xs uppercase tracking-widest font-medium hover:text-black text-[#555]">
                    {t('login')}
                  </button>
                </nav>
              </div>
              <div className="space-y-4 border-t border-border pt-6">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Language</p>
                <LanguageSwitcher />
              </div>
            </SheetContent>
          </Sheet>

          <button 
            onClick={() => setShowSearchMobile(!showSearchMobile)}
            className="hover:opacity-75 transition-opacity py-2"
            aria-label="Search"
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Center Side: Centered Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <a href="/" className="text-[15px] font-bold tracking-[0.3em] uppercase leading-none select-none text-black">
            Villaoro
          </a>
        </div>

        {/* Right Side: Profile & Bag */}
        <div className="flex items-center gap-4">
          <button className="hover:opacity-75 transition-opacity py-2" aria-label="Profile">
            <User size={18} strokeWidth={1.5} />
          </button>
          <button className="hover:opacity-75 transition-opacity py-2 flex items-center" aria-label="Shopping Bag">
            <SsenseBagIcon count={0} />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Row (slides down/toggles inline) */}
      {showSearchMobile && (
        <div className="lg:hidden bg-background border-t border-b border-border px-4 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex-1 flex items-center gap-2 border border-black px-3 py-1.5 bg-white">
            <Search size={13} className="text-black shrink-0" />
            <input
              ref={mobileInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search') + " products, designers..."}
              className="flex-1 text-[11px] outline-none bg-transparent placeholder:text-[#bbb] text-black"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[#999] hover:text-black shrink-0">
                <X size={13} />
              </button>
            )}
          </div>
          <button 
            onClick={() => {
              setShowSearchMobile(false);
              setSearchQuery("");
            }}
            className="text-[10px] uppercase tracking-widest font-bold text-black shrink-0"
          >
            Cancel
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;

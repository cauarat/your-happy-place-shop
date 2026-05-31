import { useState, useRef, useEffect } from "react";
import { Sparkles, X, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearch } from "@/contexts/SearchContext";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const { t } = useLanguage();
  const { searchQuery, setSearchQuery } = useSearch();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 lg:px-10 h-16 max-w-[1600px] mx-auto w-full gap-4">
        <div className="flex items-center gap-8 lg:gap-16 flex-1">
          {/* Logo */}
          <a href="/" className="text-3xl font-bold tracking-tighter leading-none shrink-0">
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
    </header>
  );
};

export default Header;

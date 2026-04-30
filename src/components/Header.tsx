import { ShoppingBag, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const { t } = useLanguage();

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 lg:px-10 h-16 max-w-[1600px] mx-auto w-full">
        <a href="/" className="text-3xl font-bold tracking-tighter leading-none">
          Villaoro
        </a>
        
        <div className="flex items-center justify-end gap-6">
          <LanguageSwitcher />
          <button className="text-[10px] uppercase font-bold tracking-widest hover:underline underline-offset-4">{t('search')}</button>
          <button className="text-[10px] uppercase font-bold tracking-widest hover:underline underline-offset-4">{t('login')}</button>
          <button className="text-[10px] uppercase font-bold tracking-widest hover:underline underline-offset-4 flex items-center gap-1">
            {t('bag')} <span className="text-[9px] opacity-60">(0)</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

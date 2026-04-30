import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const languages = [
  { code: "EN", label: "English", flag: "🇺🇸" },
  { code: "PT", label: "Portuguese", flag: "🇧🇷" },
  { code: "ES", label: "Spanish", flag: "🇪🇸" },
] as const;

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest hover:text-black transition-colors"
      >
        <span className="opacity-70">{currentLang.flag}</span>
        <span>{currentLang.code}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[190]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute right-0 mt-2 w-32 bg-white border border-border shadow-sm z-[200] overflow-hidden"
            >
              <div className="flex flex-col py-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-left transition-colors hover:bg-muted ${
                      language === lang.code ? "bg-muted font-bold" : "text-muted-foreground"
                    }`}
                  >
                    <span className="opacity-80 scale-110">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;

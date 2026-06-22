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
    <div className="flex flex-col w-full">
      {/* Trigger: Currently Selected Language */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest hover:text-black transition-colors"
      >
        <span className="opacity-70 scale-110">{currentLang.flag}</span>
        <span>{currentLang.code}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ml-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Inline Expanding Options */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} // smooth, slightly springy easing
            className="overflow-hidden flex flex-col"
          >
            <div className="flex flex-col gap-4 pt-4">
              {languages
                .filter((lang) => lang.code !== currentLang.code)
                .map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[#555] hover:text-black transition-colors"
                  >
                    <span className="opacity-70 scale-110">{lang.flag}</span>
                    <span>{lang.code}</span>
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;

import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  Newspaper,
  Shirt,
  Footprints,
  Gem,
  Glasses,
  Box,
  Layers,
} from "lucide-react";
import {
  CapIcon,
  PantsIcon,
  ShortsIcon,
  JacketIcon,
  HoodieIcon,
  VestIcon,
  PoloIcon,
  TankTopIcon,
  BagIcon,
  PufferJacketIcon,
  SweaterIcon,
} from "@/components/Icons";
import { getCategories, getDesignSettings } from "@/lib/store";
import { useLanguage } from "@/contexts/LanguageContext";

const getCategoryIcon = (cat: string) => {
  switch (cat.toUpperCase()) {
    case "CLOTHING":    return Shirt;
    case "FOOTWEAR":    return Footprints;
    case "BAGS":        return BagIcon;
    case "JEWELRY":     return Gem;
    case "ACCESSORIES": return Glasses;
    case "CAPS":        return CapIcon;
    case "JACKETS":     return JacketIcon;
    case "PUFFER JACKET": return PufferJacketIcon;
    case "PUFFER JACKETS": return PufferJacketIcon;
    case "OBJECTS":     return Box;
    case "PANTS":       return PantsIcon;
    case "POLO":        return PoloIcon;
    case "SET":         return Layers;
    case "SHORTS":      return ShortsIcon;
    case "SWEATER":     return SweaterIcon;
    case "SWEATERS":    return SweaterIcon;
    case "T-SHIRT":     return Shirt;
    case "TANK TOP":    return TankTopIcon;
    case "HOODIES":     return HoodieIcon;
    case "VEST":        return VestIcon;
    default:            return null;
  }
};

export default function MobileBottomDock() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { t }     = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isNewsPage   = location.pathname === "/news";
  const dimCatalogue = isNewsPage;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <div className="bg-[#f2f2f6]/70 backdrop-blur-[32px] saturate-[180%] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] overflow-hidden pointer-events-auto border border-white/20 mx-3 max-w-[100vw]">
        <div
          ref={scrollRef}
          className="overflow-x-auto no-scrollbar flex items-center px-1.5 py-1.5 gap-0"
        >
          {/* All */}
          <motion.button
            layout
            onClick={() => navigate("/")}
            animate={{ opacity: dimCatalogue ? 0.45 : 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1 }}
            className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px] text-[#4a4a4d] hover:bg-black/5"
          >
            <motion.span 
              className="flex flex-col items-center gap-0.5"
              animate={{ color: '#4a4a4d' }}
            >
              <SlidersHorizontal size={20} strokeWidth={1.7} />
              <span className="text-[9px] font-semibold tracking-wide">All</span>
            </motion.span>
          </motion.button>

          {/* News */}
          {getDesignSettings().enableNewsPage !== false && (
            <motion.button
              layout
              onClick={() => navigate("/news")}
              className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px]"
            >
              {isNewsPage && (
                <motion.div
                  layoutId="shared-dock-active"
                  className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                  transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1 }}
                />
              )}
              <motion.span 
                className="relative z-10 flex flex-col items-center gap-0.5"
                animate={{ color: isNewsPage ? '#ffffff' : '#4a4a4d' }}
                transition={{ duration: 0.15, ease: "linear" }}
              >
                <Newspaper size={20} strokeWidth={isNewsPage ? 2 : 1.7} />
                <span className="text-[9px] font-semibold tracking-wide">
                  {t("news") || "News"}
                </span>
              </motion.span>
            </motion.button>
          )}

          {/* Sale */}
          {getDesignSettings().enableSalePage !== false && (
            <motion.button
              layout
              onClick={() => navigate("/")}
              animate={{ opacity: dimCatalogue ? 0.45 : 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1 }}
              className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px] text-[#4a4a4d] hover:bg-black/5"
            >
              <motion.span 
                className="flex flex-col items-center gap-0.5"
                animate={{ color: '#4a4a4d' }}
              >
                <span className="text-[18px] leading-none font-light select-none">%</span>
                <span className="text-[9px] font-semibold tracking-wide">{t("sale")}</span>
              </motion.span>
            </motion.button>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-black/10 shrink-0 mx-0.5" />

          {/* Categories */}
          <AnimatePresence mode="popLayout">
            {getCategories().map((c) => {
              const Icon = getCategoryIcon(c);
              return (
                <motion.button
                  layout
                  key={`nbd-${c}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: dimCatalogue ? 0.35 : 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1 }}
                  onClick={() => navigate(`/?category=${encodeURIComponent(c)}`)}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-full shrink-0 min-w-[54px] text-[#4a4a4d] hover:bg-black/5"
                >
                  <motion.span 
                    className="flex flex-col items-center gap-0.5"
                    animate={{ color: '#4a4a4d' }}
                  >
                    {Icon ? (
                      <Icon size={20} strokeWidth={1.7} />
                    ) : (
                      <span className="w-5 h-5" />
                    )}
                    <span className="text-[9px] font-semibold tracking-wide leading-tight max-w-[48px] text-center">
                      {t(c.toLowerCase()) === c.toLowerCase() ? c : t(c.toLowerCase())}
                    </span>
                  </motion.span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

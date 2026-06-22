import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearch } from "@/contexts/SearchContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import SortBar, { SortKey } from "@/components/SortBar";
import ProductCard from "@/components/ProductCard";
import { getProducts, getDesigners, getCategories, getDesignSettings } from "@/lib/store";
import type { Product } from "@/data/products";
import ImmersiveAi from "@/components/ImmersiveAi";
import TryTheLook from "@/components/TryTheLook";
import { motion, AnimatePresence } from "framer-motion";
import { X, Newspaper, ChevronDown } from "lucide-react";

/* Shared slide-down animation config — mirrors LanguageSwitcher */
const dropdownVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit:    { height: 0, opacity: 0 },
};
const dropdownTransition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] };

const searchTranslations: Record<string, string[]> = {
  // Colors
  branco: ["white", "blanco"],
  blanco: ["white", "branco"],
  white: ["branco", "blanco"],
  preto: ["black", "negro"],
  negro: ["black", "preto"],
  black: ["preto", "negro"],
  azul: ["blue"],
  blue: ["azul"],
  vermelho: ["red", "rojo"],
  rojo: ["red", "vermelho"],
  red: ["vermelho", "rojo"],
  verde: ["green"],
  green: ["verde"],
  amarelo: ["yellow", "amarillo"],
  amarillo: ["yellow", "amarelo"],
  yellow: ["amarelo", "amarillo"],
  rosa: ["pink"],
  pink: ["rosa"],
  cinza: ["grey", "gray", "gris"],
  gris: ["grey", "gray", "cinza"],
  grey: ["cinza", "gris"],
  gray: ["cinza", "gris"],
  marrom: ["brown", "marrón", "marron"],
  marrón: ["brown", "marrom"],
  brown: ["marrom", "marrón"],
  roxo: ["purple", "morado"],
  morado: ["purple", "roxo"],
  purple: ["roxo", "morado"],
  laranja: ["orange", "naranja"],
  naranja: ["orange", "laranja"],
  orange: ["laranja", "naranja"],
  dourado: ["gold", "dorado"],
  dorado: ["gold", "dourado"],
  gold: ["dourado", "dorado"],
  prata: ["silver", "plata"],
  plata: ["silver", "prata"],
  silver: ["prata", "plata"],
  bege: ["beige"],
  beige: ["bege"],

  // Categories / Items
  blusa: ["t-shirt", "shirt", "top", "camiseta"],
  camiseta: ["t-shirt", "shirt", "top", "blusa"],
  "t-shirt": ["blusa", "camiseta", "shirt"],
  shirt: ["blusa", "camiseta", "t-shirt"],
  calça: ["pants", "trousers", "jeans", "pantalones"],
  pantalones: ["pants", "trousers", "jeans", "calça"],
  pants: ["calça", "pantalones", "trousers"],
  trousers: ["calça", "pantalones", "pants"],
  "tênis": ["sneakers", "shoes", "zapatillas"],
  tenis: ["sneakers", "shoes", "zapatillas"],
  zapatillas: ["sneakers", "shoes", "tênis", "tenis"],
  sneakers: ["tênis", "tenis", "zapatillas", "shoes"],
  sapato: ["shoes", "zapatos"],
  calçado: ["shoes", "zapatos"],
  zapatos: ["shoes", "sapato", "calçado"],
  shoes: ["sapato", "calçado", "zapatos", "tênis", "sneakers"],
  "boné": ["hat", "cap", "gorra"],
  bone: ["hat", "cap", "gorra"],
  "chapéu": ["hat", "cap", "sombrero"],
  chapeu: ["hat", "cap", "sombrero"],
  gorra: ["hat", "cap", "boné"],
  sombrero: ["hat", "cap", "chapéu"],
  hat: ["boné", "chapéu", "gorra", "sombrero", "cap"],
  cap: ["boné", "chapéu", "gorra", "sombrero", "hat"],
  "acessórios": ["accessories", "accesorios"],
  acessorios: ["accessories", "accesorios"],
  accesorios: ["accessories", "acessórios"],
  accessories: ["acessórios", "acessorios"],
  "sandália": ["sandal", "slipper", "sandalia"],
  sandalia: ["sandal", "slipper", "sandália"],
  sandal: ["sandália", "sandalia", "slipper"],
  slipper: ["sandália", "sandalia", "sandal", "chinelo"],
  chinelo: ["slipper", "sandal", "chancla", "sandália"],
  chancla: ["slipper", "sandal", "chinelo"]
};

function getTranslatedQueries(q: string) {
  const translatedQueries = [q];
  Object.keys(searchTranslations).forEach(key => {
    if (q.includes(key)) {
      searchTranslations[key].forEach(trans => translatedQueries.push(q.replace(key, trans)));
    }
  });
  return translatedQueries;
}

import { Shirt, Footprints, ShoppingBag, Gem, Glasses, Box, Layers } from "lucide-react";
import { CapIcon, PantsIcon, ShortsIcon, JacketIcon, HoodieIcon, VestIcon, PoloIcon, TankTopIcon } from "@/components/Icons";

const getCategoryIcon = (cat: string) => {
  switch (cat.toUpperCase()) {
    case 'CLOTHING': return Shirt;
    case 'FOOTWEAR': return Footprints;
    case 'BAGS': return ShoppingBag;
    case 'JEWELRY': return Gem;
    case 'ACCESSORIES': return Glasses;
    case 'CAPS': return CapIcon;
    case 'JACKETS': return JacketIcon;
    case 'OBJECTS': return Box;
    case 'PANTS': return PantsIcon;
    case 'POLO': return PoloIcon;
    case 'SET': return Layers;
    case 'SHORTS': return ShortsIcon;
    case 'T-SHIRT': return Shirt;
    case 'TANK TOP': return TankTopIcon;
    case 'HOODIES': return HoodieIcon;
    case 'VEST': return VestIcon;
    default: return null;
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<string>("Footwear");
  const [designer, setDesigner] = useState<string>(() => {
    const paramDesigner = searchParams.get("designer");
    if (paramDesigner) {
      const availableDesigners = getDesigners();
      if (availableDesigners.includes(paramDesigner)) return paramDesigner;
    }
    return "All";
  });
  const [sort, setSort] = useState<SortKey>("latest");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { searchQuery } = useSearch();
  const [isDesignersOpen, setIsDesignersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  const navigate = useNavigate();

  // Drag to scroll refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    if (scrollRef.current) {
      startX.current = e.pageX - scrollRef.current.offsetLeft;
      scrollLeft.current = scrollRef.current.scrollLeft;
    }
  };

  const onMouseLeave = () => {
    isDragging.current = false;
  };

  const onMouseUp = () => {
    isDragging.current = false;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; // Scroll speed
    if (Math.abs(walk) > 5) {
      hasDragged.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const onDoubleClick = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setProducts(getProducts());
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // When search is active, reset sidebar filters so all results show
  useEffect(() => {
    if (searchQuery.trim()) {
      setCategory("All");
      setDesigner("All");
    }
  }, [searchQuery]);

  const availableProducts = useMemo(() => {
    let list = products;

    if (showSaleOnly) {
      list = list.filter((p) => p.oldPrice !== undefined && p.oldPrice > p.price);
    }

    // AI search filter — matches name, designer, category, description, handles translations (PT, ES, EN)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const translatedQueries = getTranslatedQueries(q);

      list = list.filter((p) => {
        const pName = p.name.toLowerCase();
        const pDesigner = p.designer.toLowerCase();
        const pCategory = p.category.toLowerCase();
        const pDescription = (p.description || "").toLowerCase();
        return translatedQueries.some(tq =>
          pName.includes(tq) ||
          pDesigner.includes(tq) ||
          pCategory.includes(tq) ||
          pDescription.includes(tq)
        );
      });
    } else {
      // Normal category filter when not searching
      list = list.filter((p) => category === "All" || p.category === category);
    }
    
    return list;
  }, [products, showSaleOnly, searchQuery, category]);

  const filtered = useMemo(() => {
    let list = availableProducts;

    if (!searchQuery.trim()) {
      list = list.filter((p) => designer === "All" || p.designer === designer);
    }

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rated":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      default:
        list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [availableProducts, designer, sort, searchQuery]);

  const { t } = useLanguage();

  // Dynamic designer list for the brands dropdown based on available products
  const dynamicDesigners = useMemo(() => {
    const available = new Set(availableProducts.map(p => p.designer));
    return getDesigners().filter(d => available.has(d));
  }, [availableProducts]);

  // Sort options for the sort dropdown
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "latest", label: t('latest') },
    { key: "price-asc", label: t('price_asc') },
    { key: "price-desc", label: t('price_desc') },
    { key: "rated", label: t('rated') },
  ];

  // Build the top bar label
  const topBarLabel = searchQuery.trim()
    ? `"${searchQuery}"`
    : category !== "All"
      ? t(category.toLowerCase())
      : designer !== "All"
        ? designer
        : t("all_products");

  // Toggle helpers — only one dropdown open at a time
  const toggleDesigners = () => {
    setIsDesignersOpen((prev) => !prev);
    setIsSortOpen(false);
  };
  const toggleSort = () => {
    setIsSortOpen((prev) => !prev);
    setIsDesignersOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 w-full max-w-[1800px] mx-auto px-0 md:px-0">
        {/* 1. Filter Pills / Designers Scroll Row — topmost */}
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onDoubleClick={onDoubleClick}
          className="border-b border-border py-2 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 bg-white select-none whitespace-nowrap cursor-grab active:cursor-grabbing"
        >
          {/* News Pill */}
          {getDesignSettings().enableNewsPage !== false && (
            <button
              onClick={(e) => {
                if (hasDragged.current) return;
                navigate('/news');
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-border text-black hover:border-black text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
            >
              <Newspaper size={12} strokeWidth={2} className="shrink-0" />
              {t('news') || 'News'}
            </button>
          )}

          {/* Sale Toggle Pill */}
          {getDesignSettings().enableSalePage !== false && (
            <button
              onClick={(e) => {
                if (hasDragged.current) return;
                setShowSaleOnly(!showSaleOnly);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${showSaleOnly
                  ? "border-black bg-black text-white"
                  : "border-border text-black hover:border-black"
                }`}
            >
              <span className={`w-2 h-2 border transition-colors ${showSaleOnly ? "border-white bg-white" : "border-black bg-transparent"}`} />
              {t('sale')}
            </button>
          )}

          {/* Designer Pill (if a designer is selected) */}
          {designer !== "All" && (
            <button
              onClick={(e) => {
                if (hasDragged.current) return;
                setDesigner("All");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black bg-black text-white text-[10px] font-bold uppercase tracking-[0.15em]"
            >
              {designer}
              <X size={10} className="shrink-0" />
            </button>
          )}

          {/* All Categories Toggles */}
          {getCategories().map((c) => {
            const Icon = getCategoryIcon(c);
            return (
              <button
                key={c}
                onClick={(e) => {
                  if (hasDragged.current) return;
                  setCategory(category === c ? "All" : c);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${category === c
                    ? "border-black bg-black text-white"
                    : "border-border text-black hover:border-black"
                  }`}
              >
                {Icon && <Icon size={12} strokeWidth={2} />}
                {t(c.toLowerCase()) === c.toLowerCase() ? c : t(c.toLowerCase())}
              </button>
            );
          })}
        </div>

        {/* 3. BRANDS / SORT Split Bar with Inline Dropdowns */}
        <div className="sticky top-14 z-40 bg-white">
          {/* Toggle Row */}
          <div className="border-b border-border flex w-full">
            <button
              onClick={toggleDesigners}
              className="flex-1 py-3 text-[11px] font-bold uppercase tracking-[0.25em] border-r border-border text-center hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {t('brands') || "BRANDS"}
              <span className="text-muted-foreground ml-1 font-light normal-case tracking-normal">({dynamicDesigners.length})</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isDesignersOpen ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={toggleSort}
              className="flex-1 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-center hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {t('sort')}
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isSortOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Inline Dropdown Panels — push content below */}
          <AnimatePresence>
            {(isDesignersOpen || isSortOpen) && (
              <motion.div
                key={isDesignersOpen ? "designers-panel" : "sort-panel"}
                variants={dropdownVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={dropdownTransition}
                className="overflow-hidden border-b border-border bg-white"
              >
                <div className="flex w-full">
                  {/* Brands (Designers) Column */}
                  <div className={`flex-1 border-r border-border px-5 sm:px-8 py-4 sm:py-5 ${!isDesignersOpen ? "pointer-events-none" : ""}`}>
                    {isDesignersOpen && (
                      <ul className="space-y-2">
                        <li>
                          <button
                            onClick={() => { setDesigner("All"); setIsDesignersOpen(false); }}
                            className={`text-[11px] tracking-wide transition-colors text-left whitespace-nowrap pb-0.5 border-b ${
                              designer === "All" ? "text-black font-medium border-black" : "text-[#888] hover:text-black border-transparent"
                            }`}
                          >
                            All
                          </button>
                        </li>
                        {dynamicDesigners.map((d) => (
                          <li key={d}>
                            <button
                              onClick={() => { setDesigner(designer === d ? "All" : d); setIsDesignersOpen(false); }}
                              className={`text-[11px] tracking-wide transition-colors text-left whitespace-nowrap pb-0.5 border-b ${
                                designer === d ? "text-black font-medium border-black" : "text-[#888] hover:text-black border-transparent"
                              }`}
                            >
                              {d}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Sort Column */}
                  <div className={`flex-1 px-5 sm:px-8 py-4 sm:py-5 ${!isSortOpen ? "pointer-events-none" : ""}`}>
                    {isSortOpen && (
                      <ul className="space-y-2">
                        {sortOptions.map((o) => (
                          <li key={o.key}>
                            <button
                              onClick={() => { setSort(o.key); setIsSortOpen(false); }}
                              className={`text-[11px] tracking-wide transition-colors text-left whitespace-nowrap pb-0.5 border-b ${
                                sort === o.key ? "text-black font-medium border-black" : "text-[#888] hover:text-black border-transparent"
                              }`}
                            >
                              {o.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Label / Count Bar — directly connected to brand selector above */}
        <div className="border-b border-border py-2.5 flex items-center justify-center">
          <h2 className="text-[11px] lowercase tracking-[0.2em] font-medium text-foreground">
            {topBarLabel}
            <span className="text-muted-foreground ml-2 font-light">({filtered.length})</span>
          </h2>
        </div>

        <div className="border-b border-border min-h-[calc(100vh-200px)] flex">
          {/* Product Grid (Full Width) */}
          <div className="flex-1 px-2.5 sm:px-4 py-3 lg:py-6 w-full">
            {isLoading ?
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-1 sm:gap-x-2 lg:gap-x-4 gap-y-4 sm:gap-y-5 lg:gap-y-8">
                {Array(12).fill(0).map((_, i) =>
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/5] bg-[#f0efed]" />
                    <div className="mt-3 space-y-2">
                      <div className="h-2.5 bg-[#e8e8e8] rounded w-1/3" />
                      <div className="h-3 bg-[#e8e8e8] rounded w-3/4" />
                      <div className="h-3 bg-[#e8e8e8] rounded w-1/4" />
                    </div>
                  </div>
                )}
              </div> :
              filtered.length === 0 ?
                <div className="text-center py-24 w-full">
                  <p className="text-[12px] uppercase tracking-widest text-[#999]">{t('no_products')}</p>
                </div> :

                <motion.div
                  key={`${category}-${designer}-${searchQuery}-${showSaleOnly}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-1 sm:gap-x-2 lg:gap-x-4 gap-y-4 sm:gap-y-5 lg:gap-y-8 w-full">
                  {filtered.map((product, i) =>
                    <ProductCard key={product.id} product={product} index={i} />
                  )}
                </motion.div>
            }
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );

};

export default Index;

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
import { X, Newspaper, ChevronDown, SlidersHorizontal } from "lucide-react";

/* Shared slide-down animation config — mirrors LanguageSwitcher */
const dropdownVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit:    { height: 0, opacity: 0 },
};
const dropdownTransition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

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

import { Shirt, Footprints, ShoppingBag, Gem, Glasses, Box, Layers, Search } from "lucide-react";
import { CapIcon, PantsIcon, ShortsIcon, JacketIcon, HoodieIcon, VestIcon, PoloIcon, TankTopIcon, BagIcon, PufferJacketIcon, SweaterIcon } from "@/components/Icons";

const getCategoryIcon = (cat: string) => {
  switch (cat.toUpperCase()) {
    case 'CLOTHING': return Shirt;
    case 'FOOTWEAR': return Footprints;
    case 'BAGS': return BagIcon;
    case 'JEWELRY': return Gem;
    case 'ACCESSORIES': return Glasses;
    case 'CAPS': return CapIcon;
    case 'JACKETS': return JacketIcon;
    case 'PUFFER JACKET': return PufferJacketIcon;
    case 'PUFFER JACKETS': return PufferJacketIcon;
    case 'OBJECTS': return Box;
    case 'PANTS': return PantsIcon;
    case 'POLO': return PoloIcon;
    case 'SET': return Layers;
    case 'SHORTS': return ShortsIcon;
    case 'SWEATER': return SweaterIcon;
    case 'SWEATERS': return SweaterIcon;
    case 'T-SHIRT': return Shirt;
    case 'TANK TOP': return TankTopIcon;
    case 'HOODIES': return HoodieIcon;
    case 'VEST': return VestIcon;
    default: return null;
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>(() => {
    const paramCategory = searchParams.get("category");
    if (paramCategory) return paramCategory;
    const defaultCat = getDesignSettings().defaultCategory || "Footwear";
    if (defaultCat === "News") return "All";
    return defaultCat;
  });
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
  const { searchQuery, setSearchQuery } = useSearch();
  const [isDesignersOpen, setIsDesignersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Drag to scroll refs (top bar — desktop)
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false);

  // Bottom dock scroll ref (mobile)
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const handleCategorySelect = (c: string) => {
    if (hasDragged.current) return;
    setCategory(c);
    if (c === 'All' && scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

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

  // Redirect to News page if admin set it as default landing
  useEffect(() => {
    const defaultCat = getDesignSettings().defaultCategory;
    if (defaultCat === "News" && !searchParams.get("category")) {
      navigate("/news", { replace: true });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setProducts(getProducts());
    const timer = setTimeout(() => setIsLoading(false), 600);
    
    const handleProductsUpdate = () => {
      setProducts(getProducts());
    };
    
    window.addEventListener('products-updated', handleProductsUpdate);
    window.addEventListener('storage', handleProductsUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('products-updated', handleProductsUpdate);
      window.removeEventListener('storage', handleProductsUpdate);
    };
  }, []);

  // Removed useEffect that resets sidebar filters on searchQuery change so category and designer filters persist while searching.

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
        const pDesigners = p.designers ? p.designers.map(d => d.toLowerCase()) : [];
        const pCategory = p.category.toLowerCase();
        const pDescription = (p.description || "").toLowerCase();
        return translatedQueries.some(tq =>
          pName.includes(tq) ||
          pDesigner.includes(tq) ||
          pDesigners.some(d => d.includes(tq)) ||
          pCategory.includes(tq) ||
          pDescription.includes(tq)
        );
      });
    }

    // Always apply category filter
    list = list.filter((p) => category === "All" || p.category === category);
    
    return list;
  }, [products, showSaleOnly, searchQuery, category]);

  const filtered = useMemo(() => {
    let list = availableProducts;

    // Always apply designer filter
    list = list.filter((p) => designer === "All" || p.designer === designer || (p.designers && p.designers.includes(designer)));

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

  // Group filtered products by designer for News-style layout
  const filteredByDesigner = useMemo(() => {
    const grouped = filtered.reduce((acc, p) => {
      if (!acc[p.designer]) acc[p.designer] = [];
      acc[p.designer].push(p);
      return acc;
    }, {} as Record<string, Product[]>);

    return Object.entries(grouped).map(([d, prods]) => ({
      designer: d,
      products: prods,
    }));
  }, [filtered]);

  const { t } = useLanguage();

  // Dynamic designer list for the brands dropdown based on available products
  const dynamicDesigners = useMemo(() => {
    const available = new Set(availableProducts.map(p => p.designer));
    return getDesigners().filter(d => available.has(d));
  }, [availableProducts]);

  // Categories that the selected designer actually has products in
  const categoriesForDesigner = useMemo(() => {
    if (designer === 'All') return null;
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.designer === designer || (p.designers && p.designers.includes(designer))) {
        cats.add(p.category);
      }
    });
    return cats;
  }, [designer, products]);

  // Sort options for the sort dropdown
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "latest", label: t('latest') },
    { key: "price-asc", label: t('price_asc') },
    { key: "price-desc", label: t('price_desc') },
    { key: "rated", label: t('rated') },
  ];

  const activeFilters = [];
  if (category !== "All") activeFilters.push(t(category.toLowerCase()));
  if (designer !== "All") activeFilters.push(designer);
  if (showSaleOnly) activeFilters.push(t('sale_items') || 'Sale Items');
  if (searchQuery.trim()) activeFilters.push(`"${searchQuery}"`);

  const topBarLabel = activeFilters.length > 0
    ? activeFilters.join(" ; ")
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

  const isAnyActive = category !== 'All' || showSaleOnly;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 w-full max-w-[1800px] mx-auto px-0 md:px-0 pb-[96px] xl:pb-0">

        {/* 3. BRANDS / SORT Split Bar with Inline Dropdowns */}
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] sm:top-[calc(4rem+env(safe-area-inset-top))] z-40 bg-white">
          {/* Toggle Row */}
          <div className="border-b border-border flex w-full h-[46px]">
            <button
              onClick={toggleDesigners}
              className="flex-1 h-full text-[11px] font-bold uppercase tracking-[0.25em] border-r border-border text-center hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {t('brands') || "BRANDS"}
              <span className="text-muted-foreground ml-1 font-light normal-case tracking-normal">({dynamicDesigners.length})</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isDesignersOpen ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={toggleSort}
              className="flex-1 h-full text-[11px] font-bold uppercase tracking-[0.25em] text-center hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
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

          {/* 2. Label / Count Bar — directly connected to brand selector above */}
          <div className="border-b border-border h-[46px] flex items-center justify-center bg-[#fafafa]">
            <h2 className="text-xs md:text-[13px] lowercase tracking-[0.22em] font-bold text-black">
              {topBarLabel}
              <span className="text-muted-foreground ml-2.5 font-normal">({filtered.length})</span>
            </h2>
          </div>
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
                <div className="flex flex-col items-center justify-center py-32 px-4 text-center w-full max-w-2xl mx-auto font-sans">
                  <div className="w-20 h-20 mb-8 rounded-full bg-[#FAFAFA] flex items-center justify-center border border-border/50">
                    <ShoppingBag className="w-8 h-8 text-[#555] stroke-[1.5]" />
                  </div>
                  <h3 className="text-3xl font-semibold mb-3 tracking-tight text-foreground">
                    {t('no_products')}
                  </h3>
                  <div className="flex flex-col items-center text-[#666] text-[15px] mb-10 leading-relaxed">
                    <p className="mb-1">
                      {searchQuery.trim() ? `${t('no_results_for')} "${searchQuery}"` : t('no_results_for').replace(' for', '').replace(' para', '')}{(category !== "All" || designer !== "All" || showSaleOnly) ? ` ${t('in_category')} ` + [category !== "All" ? (t(category.toLowerCase()) === category.toLowerCase() ? category : t(category.toLowerCase())) : null, designer !== "All" ? designer : null, showSaleOnly ? t('sale_items') : null].filter(Boolean).join(", ") : ""}.
                    </p>
                    <p>{t('try_searching')}</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (searchInput) {
                        setTimeout(() => searchInput.focus(), 500);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-border bg-white text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm mb-8"
                  >
                    <Search className="w-4 h-4 text-foreground" />
                    {t('search_again')}
                  </button>
                  
                  <div className="flex items-center w-full max-w-[240px] gap-4 mb-8">
                    <div className="flex-1 h-px bg-border/60"></div>
                    <span className="text-[#999] text-[13px]">{t('or')}</span>
                    <div className="flex-1 h-px bg-border/60"></div>
                  </div>

                  <button 
                    onClick={() => {
                      setSearchQuery("");
                      setCategory("All");
                      setDesigner("All");
                      setShowSaleOnly(false);
                    }}
                    className="px-10 py-3.5 bg-black text-white text-[15px] font-medium rounded-full hover:bg-black/90 transition-colors"
                  >
                    {t('clear_all_filters')}
                  </button>
                </div> :

                <motion.div
                  key={`${category}-${designer}-${searchQuery}-${showSaleOnly}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col w-full"
                >
                  {filteredByDesigner.map(({ designer: brandName, products: brandProducts }, sectionIndex) => (
                    <section key={brandName}>
                      {/* Big brand name header */}
                      <div className="flex items-center justify-center py-5 sm:py-7 md:py-9">
                        <motion.button
                          onClick={() => { setDesigner(designer === brandName ? "All" : brandName); setIsDesignersOpen(false); }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: sectionIndex * 0.08 }}
                          className="text-[1.6rem] sm:text-[2rem] md:text-[2.6rem] font-black uppercase leading-none tracking-tight text-black text-center hover:opacity-60 transition-opacity cursor-pointer"
                        >
                          {brandName}
                        </motion.button>
                      </div>

                      {/* Product grid: standard 4 column layout */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: sectionIndex * 0.08 + 0.12 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-x-1 sm:gap-x-2 lg:gap-x-4 gap-y-4 sm:gap-y-5 lg:gap-y-8 mb-0"
                      >
                        {brandProducts.map((product, i) => (
                            <motion.div
                              key={product.id}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.35, delay: i * 0.04 }}
                              className="col-span-1 flex flex-col"
                            >
                              <ProductCard product={product} index={sectionIndex * 10 + i} isFeatured={false} />
                            </motion.div>
                        ))}
                      </motion.div>
                    </section>
                  ))}
                </motion.div>
            }
          </div>
        </div>
      </main>

      {/* ─── Global App Store-style floating bottom dock ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Outer frosted-glass pill */}
        <div className="bg-[#f2f2f6]/70 backdrop-blur-[32px] saturate-[180%] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] overflow-hidden pointer-events-auto border border-white/20 mx-3 max-w-[100vw]">
          <div
            ref={bottomScrollRef}
            className="overflow-x-auto no-scrollbar flex items-center px-1.5 py-1.5 gap-0"
          >
            {/* All / Filter */}
            {(() => {
              const isAllActive = category === 'All' && !showSaleOnly && designer === 'All';
              return (
                <motion.button
                  layout
                  key="bd-all"
                  onClick={() => { handleCategorySelect('All'); setShowSaleOnly(false); setDesigner('All'); }}
                  className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px]"
                >
                  {isAllActive && (
                    <motion.div
                      layoutId="active-dock-bg"
                      className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                      transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                    />
                  )}
                  <motion.span 
                    className="relative z-10 flex flex-col items-center gap-0.5"
                    animate={{ color: isAllActive ? '#ffffff' : '#4a4a4d' }}
                    transition={{ duration: 0.15, ease: "linear" }}
                  >
                    <SlidersHorizontal size={20} strokeWidth={isAllActive ? 2 : 1.7} />
                    <span className="text-[9px] font-semibold tracking-wide">All</span>
                  </motion.span>
                </motion.button>
              );
            })()}

            {/* News */}
            {getDesignSettings().enableNewsPage !== false && (
              <motion.button
                layout
                key="bd-news"
                onClick={() => navigate('/news')}
                animate={{ opacity: isAnyActive || designer !== 'All' ? 0.45 : 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1.1 }}
                className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px] text-[#4a4a4d] hover:bg-black/5"
              >
                <motion.span 
                  className="flex flex-col items-center gap-0.5"
                  animate={{ color: '#4a4a4d' }}
                >
                  <Newspaper size={20} strokeWidth={1.7} />
                  <span className="text-[9px] font-semibold tracking-wide">{t('news') || 'News'}</span>
                </motion.span>
              </motion.button>
            )}

            {/* Sale */}
            {getDesignSettings().enableSalePage !== false && (() => {
              const isSaleActive = showSaleOnly;
              return (
                <motion.button
                  layout
                  key="bd-sale"
                  onClick={() => setShowSaleOnly(!showSaleOnly)}
                  animate={{ opacity: isSaleActive ? 1 : (isAnyActive && !isSaleActive ? 0.45 : 1) }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1.1 }}
                  className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px]"
                >
                  {isSaleActive && (
                    <motion.div
                      layoutId="active-dock-bg"
                      className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                      transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                    />
                  )}
                  <motion.span 
                    className="relative z-10 flex flex-col items-center gap-0.5"
                    animate={{ color: isSaleActive ? '#ffffff' : '#4a4a4d' }}
                    transition={{ duration: 0.15, ease: "linear" }}
                  >
                    <span className="text-[18px] leading-none font-light">%</span>
                    <span className="text-[9px] font-semibold tracking-wide">{t('sale')}</span>
                  </motion.span>
                </motion.button>
              );
            })()}

            {/* Divider */}
            <div className="w-px h-6 bg-black/10 shrink-0 mx-0.5" />

            {/* Category chips */}
            <AnimatePresence mode="popLayout">
              {getCategories().map((c) => {
                const isActive = category === c;
                const Icon = getCategoryIcon(c);
                const belongsToDesigner = categoriesForDesigner ? categoriesForDesigner.has(c) : true;
                const isDimmed = (categoriesForDesigner && !belongsToDesigner && !isActive) || (!isActive && isAnyActive && !categoriesForDesigner);
                return (
                  <motion.button
                    layout
                    key={`bd-cat-${c}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: isActive ? 1 : isDimmed ? 0.38 : 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                    onClick={() => handleCategorySelect(isActive ? 'All' : c)}
                    className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-full shrink-0 min-w-[54px]"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-dock-bg"
                        className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
                        transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                      />
                    )}
                    <motion.span 
                      className="relative z-10 flex flex-col items-center gap-0.5"
                      animate={{ color: isActive ? '#ffffff' : '#4a4a4d' }}
                      transition={{ duration: 0.15, ease: "linear" }}
                    >
                      {Icon
                        ? <Icon size={20} strokeWidth={isActive ? 2 : 1.7} />
                        : <span className="w-5 h-5" />}
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

      <Footer />
    </div>
  );

};

export default Index;

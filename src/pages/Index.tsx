import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearch } from "@/contexts/SearchContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import SortBar, { SortKey } from "@/components/SortBar";
import ProductCard from "@/components/ProductCard";
import { getProducts, getDesigners, getCategories, getDesignSettings, saveCustomerSuggestion } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { Product } from "@/data/products";
import ImmersiveAi from "@/components/ImmersiveAi";
import TryTheLook from "@/components/TryTheLook";
import AppTour from "@/components/AppTour";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Reveal, Eyebrow } from "@/components/system";
import { X, Newspaper, ChevronDown, ChevronUp, SlidersHorizontal, Package, MessageSquare, Send, CheckCircle } from "lucide-react";

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
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
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
  const { searchQuery, setSearchQuery, selectedColor, setSelectedColor, selectedDesigner, setSelectedDesigner } = useSearch();
  const [isDesignersOpen, setIsDesignersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showSaleOnly, setShowSaleOnly] = useState(false);
  const [suggestionCard, setSuggestionCard] = useState<'product' | 'feedback' | null>(null);
  const [suggestionSent, setSuggestionSent] = useState(false);
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

  // Sync selectedDesigner from SearchContext (Header brand filter) with local designer state
  useEffect(() => {
    if (selectedDesigner) {
      setDesigner(selectedDesigner);
    } else {
      // Only reset if it was previously set via context
      setDesigner(prev => prev !== "All" ? "All" : prev);
    }
  }, [selectedDesigner]);

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

    // Apply color filter
    if (selectedColor) {
      const colorQuery = selectedColor.toLowerCase();
      const colorVariants = getTranslatedQueries(colorQuery);
      list = list.filter(p => {
        const textToSearch = (p.name + " " + (p.description || "")).toLowerCase();
        return colorVariants.some(variant => textToSearch.includes(variant));
      });
    }

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rated":
        list = [...list].sort((a, b) => a.rating - b.rating);
        break;
      default:
        list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [availableProducts, designer, sort, searchQuery, selectedColor]);

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

  const activeFilters: string[] = [];
  if (category !== "All") activeFilters.push(t(category.toLowerCase()));
  if (designer !== "All") activeFilters.push(designer);
  if (showSaleOnly) activeFilters.push(t('sale_items') || 'Sale Items');
  if (selectedColor) activeFilters.push(t(selectedColor.toLowerCase()) || selectedColor);
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

      {/* The category dock is fixed at every width, so the clearance under the
          content has to be too — `xl:pb-0` was letting the dock sit on top of
          the last row of products on large screens. */}
      <main className="w-full flex-1 pb-24">

        {/* The catalogue bar. Pinned directly under the masthead, it answers
            the two questions someone scrolling a filtered grid actually has:
            what am I looking at, and how many are there. The count is the
            piece the old bar was missing entirely. */}
        <div
          className="sticky z-40 w-full bg-paper/90 backdrop-blur-xl backdrop-saturate-150 hairline-b"
          style={{ top: 'calc(var(--masthead-h) + env(safe-area-inset-top))' }}
        >
          <div className="shell-wide flex h-11 items-center justify-between gap-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="group flex min-w-0 items-center gap-2 transition-opacity duration-base ease-sine hover:opacity-60"
            >
              <span className="type-label truncate text-ink">{topBarLabel}</span>
              <span className="type-label shrink-0 text-ink/35 tabular-nums">
                {filtered.length}
              </span>
              <motion.span
                animate={{ rotate: isScrolled ? 0 : 90, opacity: isScrolled ? 1 : 0.35 }}
                transition={{ duration: 0.4, ease: [0.445, 0.05, 0.55, 0.95] }}
                className="shrink-0"
              >
                <ChevronUp size={13} strokeWidth={2} className="text-ink/60" />
              </motion.span>
            </button>

            {/* Clear Filters Button (only if filters are active) */}
            {(category !== "All" || designer !== "All" || showSaleOnly || searchQuery.trim() || selectedColor || selectedDesigner) && (
              <button
                onClick={() => {
                  setCategory("All");
                  setDesigner("All");
                  setShowSaleOnly(false);
                  setSearchQuery("");
                  setSelectedColor(null);
                  setSelectedDesigner(null);
                }}
                className="type-label flex shrink-0 items-center gap-1.5 text-ink/45 transition-colors duration-base ease-sine hover:text-ink"
              >
                <span>{t('clear') || 'Clear'}</span>
                <X size={11} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-[calc(100vh-200px)] flex">
          {/* Product Grid (Full Width) */}
          <div className="shell-wide flex-1 pb-3 pt-6 sm:pt-8 lg:pb-6">
            {isLoading ?
              // The skeleton is the grid, at the grid's real proportions, so
              // nothing reflows when the products land.
              <div className="grid grid-cols-2 gap-x-[var(--grid-gap)] gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-y-12 xl:grid-cols-5">
                {Array(15).fill(0).map((_, i) =>
                  <div key={i}>
                    <div className="skeleton aspect-square" />
                    <div className="mt-3.5 space-y-2">
                      <div className="skeleton h-2.5 w-1/3" />
                      <div className="skeleton h-2.5 w-3/4" />
                      <div className="skeleton h-2.5 w-1/4" />
                    </div>
                  </div>
                )}
              </div> :
              filtered.length === 0 ?
                <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:py-32">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-7 flex h-14 w-14 items-center justify-center rounded-full border-hairline border-ink/15"
                  >
                    <ShoppingBag className="h-5 w-5 text-ink/40" strokeWidth={1.5} />
                  </motion.div>

                  <motion.h3
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="type-h3 mb-3 max-w-md"
                  >
                    {(user?.user_metadata?.first_name?.split(' ')[0] || 'Usuário').replace(/,/g, '')}, {t('we_dont_have_yet')} “{activeFilters.length > 0 ? activeFilters.join(" ") : t("products").toLowerCase()}”
                  </motion.h3>

                  {/* Action buttons row */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="mb-12 mt-5 flex justify-center"
                  >
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setCategory("All");
                        setDesigner("All");
                        setShowSaleOnly(false);
                        setSelectedColor(null);
                      }}
                      className="btn btn-solid"
                    >
                      {t('clear_all_filters')}
                    </button>
                  </motion.div>

                  {/* Suggestion Cards — Apple-style glass cards */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg"
                  >
                    {/* Request a Product Card */}
                    <button
                      onClick={() => setSuggestionCard('product')}
                      aria-pressed={suggestionCard === 'product'}
                      className={`group relative border-hairline p-5 text-left transition-colors duration-base ease-sine ${
                        suggestionCard === 'product'
                          ? 'border-ink bg-ink text-paper'
                          : 'border-ink/15 bg-paper hover:border-ink/40'
                      }`}
                    >
                      <Package className="mb-4 h-4 w-4" strokeWidth={1.5} />
                      <h4 className="type-label mb-2">{t('suggest_product')}</h4>
                      <p className={`text-[12px] leading-relaxed ${
                        suggestionCard === 'product' ? 'text-paper/60' : 'text-ink/50'
                      }`}>
                        {t('suggest_product_desc')}
                      </p>
                    </button>

                    {/* Send Feedback Card */}
                    <button
                      onClick={() => setSuggestionCard('feedback')}
                      aria-pressed={suggestionCard === 'feedback'}
                      className={`group relative border-hairline p-5 text-left transition-colors duration-base ease-sine ${
                        suggestionCard === 'feedback'
                          ? 'border-ink bg-ink text-paper'
                          : 'border-ink/15 bg-paper hover:border-ink/40'
                      }`}
                    >
                      <MessageSquare className="mb-4 h-4 w-4" strokeWidth={1.5} />
                      <h4 className="type-label mb-2">{t('suggest_site')}</h4>
                      <p className={`text-[12px] leading-relaxed ${
                        suggestionCard === 'feedback' ? 'text-paper/60' : 'text-ink/50'
                      }`}>
                        {t('suggest_site_desc')}
                      </p>
                    </button>
                  </motion.div>

                  {/* Inline form — slides in smoothly */}
                  <AnimatePresence mode="wait">
                    {suggestionCard && !suggestionSent && (
                      <motion.form
                        key={suggestionCard}
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="w-full max-w-lg overflow-hidden"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const formData = new FormData(form);
                          
                          await saveCustomerSuggestion({
                            id: `SUG-${Date.now()}`,
                            type: suggestionCard === 'product' ? 'product_request' : 'feedback',
                            productName: formData.get('productName') as string || undefined,
                            productBrand: formData.get('productBrand') as string || undefined,
                            message: formData.get('message') as string || undefined,
                            email: formData.get('email') as string || undefined,
                            searchQuery: searchQuery || undefined,
                            createdAt: Date.now(),
                          });
                          
                          setSuggestionSent(true);
                          setTimeout(() => {
                            setSuggestionSent(false);
                            setSuggestionCard(null);
                          }, 3000);
                        }}
                      >
                        <div className="space-y-3 border-hairline border-ink/15 bg-paper p-5">
                          {suggestionCard === 'product' ? (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  name="productName"
                                  type="text"
                                  required
                                  placeholder={t('product_name_placeholder')}
                                  className="w-full border-hairline border-ink/15 bg-surface-sunken px-4 py-3 text-sm text-ink placeholder:text-ink/35 transition-colors duration-base ease-sine focus:border-ink focus:outline-none"
                                />
                                <input
                                  name="productBrand"
                                  type="text"
                                  placeholder={t('product_brand_placeholder')}
                                  className="w-full border-hairline border-ink/15 bg-surface-sunken px-4 py-3 text-sm text-ink placeholder:text-ink/35 transition-colors duration-base ease-sine focus:border-ink focus:outline-none"
                                />
                              </div>
                              <input
                                name="email"
                                type="email"
                                placeholder={t('your_email_placeholder')}
                                className="w-full border-hairline border-ink/15 bg-surface-sunken px-4 py-3 text-sm text-ink placeholder:text-ink/35 transition-colors duration-base ease-sine focus:border-ink focus:outline-none"
                              />
                            </>
                          ) : (
                            <>
                              <textarea
                                name="message"
                                required
                                rows={3}
                                placeholder={t('your_suggestion_placeholder')}
                                className="w-full resize-none border-hairline border-ink/15 bg-surface-sunken px-4 py-3 text-sm text-ink placeholder:text-ink/35 transition-colors duration-base ease-sine focus:border-ink focus:outline-none"
                              />
                              <input
                                name="email"
                                type="email"
                                placeholder={t('your_email_placeholder')}
                                className="w-full border-hairline border-ink/15 bg-surface-sunken px-4 py-3 text-sm text-ink placeholder:text-ink/35 transition-colors duration-base ease-sine focus:border-ink focus:outline-none"
                              />
                            </>
                          )}
                          <button
                            type="submit"
                            className="btn btn-solid btn-block"
                          >
                            <Send className="w-4 h-4" />
                            {t('send_suggestion')}
                          </button>
                        </div>
                      </motion.form>
                    )}

                    {suggestionSent && (
                      <motion.div
                        key="sent"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="mt-4 w-full max-w-lg"
                      >
                        <div className="flex flex-col items-center gap-3 border-hairline border-ink/15 bg-surface-sunken p-6">
                          <CheckCircle className="h-6 w-6 text-ink" strokeWidth={1.5} />
                          <p className="type-label text-ink/70">
                            {suggestionCard === 'product' ? t('suggestion_sent_product') : t('suggestion_sent')}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div> :

                <motion.div
                  key={`${category}-${designer}-${searchQuery}-${showSaleOnly}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col w-full"
                >
                  {filteredByDesigner.map(({ designer: brandName, products: brandProducts }, sectionIndex) => (
                    <section key={brandName} className={sectionIndex === 0 ? "pt-1" : "pt-14 sm:pt-20 lg:pt-24"}>
                      {/* House header. Left-aligned and numbered: a run of
                          these reads as a contents page rather than a stack of
                          unrelated centred titles, and the rule underneath
                          gives each section a floor to sit on.

                          Revealed on scroll rather than on mount — the old
                          mount animation fired for every section at once,
                          including the ones four screens below the fold, so by
                          the time you got there they had already played. */}
                      <Reveal className="mb-6 flex items-end justify-between gap-6 pb-5 hairline-b sm:mb-8 sm:pb-6">
                        <button
                          onClick={() => { setDesigner(designer === brandName ? "All" : brandName); setIsDesignersOpen(false); }}
                          className="group flex min-w-0 flex-col items-start gap-2.5 text-left"
                          aria-pressed={designer === brandName}
                        >
                          <Eyebrow index={String(sectionIndex + 1).padStart(2, "0")}>
                            {designer === brandName ? (t('clear') || 'Clear') : (t('brands') || 'House')}
                          </Eyebrow>
                          <span className="type-h1 block truncate uppercase transition-opacity duration-base ease-sine group-hover:opacity-55">
                            {brandName}
                          </span>
                        </button>
                        <span className="type-label shrink-0 pb-1.5 text-ink/40 tabular-nums">
                          {brandProducts.length}
                        </span>
                      </Reveal>

                      {/* Product rail. Cards are revealed as a group rather
                          than one by one — a per-card stagger inside a
                          horizontally scrolling rail animates items that are
                          off to the right and never seen. */}
                      <Reveal delay={0.05} className="relative w-full">
                        <Carousel
                          opts={{
                            align: "start",
                            dragFree: true,
                          }}
                          className="w-full"
                        >
                          <CarouselContent className="-ml-[var(--grid-gap)]">
                            {brandProducts.map((product, i) => (
                              <CarouselItem
                                key={product.id}
                                className="basis-1/2 pl-[var(--grid-gap)] sm:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                              >
                                <ProductCard product={product} index={sectionIndex * 10 + i} isFeatured={false} />
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                        </Carousel>
                      </Reveal>
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
        <div className="pointer-events-auto mx-3 max-w-[100vw] overflow-hidden rounded-full border-hairline border-ink/10 bg-paper/85 shadow-pop backdrop-blur-2xl backdrop-saturate-150">
          <div
            ref={bottomScrollRef}
            data-tour="category-scroll"
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
                      className="absolute inset-0 z-0 rounded-full bg-ink"
                      transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.7 }}
                    />
                  )}
                  <motion.span 
                    className="relative z-10 flex flex-col items-center gap-0.5"
                    animate={{ color: isAllActive ? '#ffffff' : 'rgba(17,17,17,0.55)' }}
                    transition={{ duration: 0.15, ease: "linear" }}
                  >
                    <SlidersHorizontal size={20} strokeWidth={isAllActive ? 2 : 1.7} />
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.1em]">All</span>
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
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.1em]">{t('news') || 'News'}</span>
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
                      className="absolute inset-0 z-0 rounded-full bg-ink"
                      transition={{ type: 'spring', stiffness: 220, damping: 28, mass: 0.7 }}
                    />
                  )}
                  <motion.span 
                    className="relative z-10 flex flex-col items-center gap-0.5"
                    animate={{ color: isSaleActive ? '#ffffff' : '#4a4a4d' }}
                    transition={{ duration: 0.15, ease: "linear" }}
                  >
                    <span className="text-[18px] leading-none font-light">%</span>
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.1em]">{t('sale')}</span>
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
                        className="absolute inset-0 z-0 rounded-full bg-ink"
                        transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
                      />
                    )}
                    <motion.span 
                      className="relative z-10 flex flex-col items-center gap-0.5"
                      animate={{ color: isActive ? '#ffffff' : 'rgba(17,17,17,0.55)' }}
                      transition={{ duration: 0.15, ease: "linear" }}
                    >
                      {Icon
                        ? <Icon size={20} strokeWidth={isActive ? 2 : 1.7} />
                        : <span className="w-5 h-5" />}
                      <span className="font-mono text-[8.5px] uppercase leading-tight tracking-[0.1em] max-w-[52px] text-center">
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

      <AppTour />
      <Footer />
    </div>
  );

};

export default Index;

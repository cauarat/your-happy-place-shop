import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getProducts, getDesigners, getDesignSettings, getCategories } from "@/lib/store";
import type { Product } from "@/data/products";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, Shirt, Footprints, ShoppingBag, Gem, Glasses, Box, Layers, SlidersHorizontal } from "lucide-react";
import { CapIcon, PantsIcon, ShortsIcon, JacketIcon, HoodieIcon, VestIcon, PoloIcon, TankTopIcon, BagIcon, PufferJacketIcon, SweaterIcon } from "@/components/Icons";
import MobileBottomDock from "@/components/MobileBottomDock";

const getCategoryIcon = (cat: string) => {
  switch (cat.toUpperCase()) {
    case 'CLOTHING': return Shirt;
    case 'FOOTWEAR': return Footprints;
    case 'BAGS': return BagIcon;
    case 'JEWELRY': return Gem;
    case 'ACCESSORIES': return Glasses;
    case 'CAPS': return CapIcon;
    case 'JACKETS': return JacketIcon;
    case "PUFFER JACKET": return PufferJacketIcon;
    case "PUFFER JACKETS": return PufferJacketIcon;
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

const News = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
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
  const onMouseLeave = () => { isDragging.current = false; };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    if (Math.abs(walk) > 5) hasDragged.current = true;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };
  const onDoubleClick = () => {
    if (scrollRef.current) scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (getDesignSettings().enableNewsPage === false) {
      navigate('/', { replace: true });
      return;
    }
    setIsLoading(true);
    setProducts(getProducts());
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [navigate]);

  // Group products by designer, sorted by latest, no filtering
  const productsByDesigner = useMemo(() => {
    const sorted = [...products].sort((a, b) => b.createdAt - a.createdAt);

    const grouped = sorted.reduce((acc, p) => {
      if (!acc[p.designer]) acc[p.designer] = [];
      acc[p.designer].push(p);
      return acc;
    }, {} as Record<string, Product[]>);

    return Object.entries(grouped)
      .map(([d, prods]) => ({ 
        designer: d, 
        products: prods,
        latestDate: Math.max(...prods.map(p => p.createdAt || 0))
      }))
      .sort((a, b) => b.latestDate - a.latestDate);
  }, [products]);

  const totalCount = useMemo(
    () => productsByDesigner.reduce((sum, g) => sum + g.products.length, 0),
    [productsByDesigner]
  );

  // Navigate to Index with a category pre-selected
  const goToCategory = (categoryName: string) => {
    navigate(`/?category=${encodeURIComponent(categoryName)}`);
  };

  // Navigate to Index with a designer pre-selected
  const goToDesigner = (designerName: string) => {
    navigate(`/?designer=${encodeURIComponent(designerName)}`);
  };


  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 w-full max-w-[1800px] mx-auto px-0 md:px-0 pb-[96px] xl:pb-0">
        {/* Apple-style Segmented Control Filter Bar */}
        <div
          className="hidden xl:block border-b border-[#f0f0f0] bg-white"
          style={{ WebkitBackdropFilter: 'blur(20px)' }}
        >
          <div
            ref={scrollRef}
            onMouseDown={onMouseDown}
            onMouseLeave={onMouseLeave}
            onMouseUp={onMouseUp}
            onMouseMove={onMouseMove}
            onDoubleClick={onDoubleClick}
            className="overflow-x-auto no-scrollbar flex items-center px-3 py-2 gap-1 select-none whitespace-nowrap cursor-grab active:cursor-grabbing"
          >
            {/* Filter icon chip — navigates to catalog (all products) */}
            <motion.button
              layout
              key="filter-all"
              onClick={() => { if (hasDragged.current) return; navigate('/'); }}
              className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200 mr-0.5 text-[#555] hover:bg-[#f2f2f2]"
              whileHover={{ backgroundColor: '#f2f2f2' }}
            >
              <span className="relative z-10 flex items-center justify-center">
                <SlidersHorizontal size={15} strokeWidth={1.8} />
              </span>
            </motion.button>

            <AnimatePresence mode="popLayout">
              {/* News Chip — active on this page */}
              {getDesignSettings().enableNewsPage !== false && (
                <motion.button
                  layout
                  key="news"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1.1 }}
                  className="relative flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[11px] font-semibold tracking-wide text-white shrink-0"
                >
                  <motion.div className="absolute inset-0 rounded-full bg-black" />
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Newspaper size={12} strokeWidth={2} className="shrink-0" />
                    {t('news') || 'News'}
                  </span>
                </motion.button>
              )}

              {/* Sale Chip — navigates to catalog with sale filter */}
              {getDesignSettings().enableSalePage !== false && (
                <motion.button
                  layout
                  key="sale"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 0.6, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1.1 }}
                  onClick={() => { if (hasDragged.current) return; navigate('/'); }}
                  className="relative flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[11px] font-medium tracking-wide text-[#333] shrink-0 transition-colors duration-200 hover:bg-[#f2f2f2]"
                >
                  {t('sale')}
                </motion.button>
              )}

              {/* All Categories — navigate to catalog with that category */}
              {getCategories().map((c) => {
                const Icon = getCategoryIcon(c);
                return (
                  <motion.button
                    layout
                    key={`cat-${c}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1.1 }}
                    onClick={() => { if (hasDragged.current) return; goToCategory(c); }}
                    whileHover={{ backgroundColor: '#f2f2f2' }}
                    className="relative flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[11px] font-medium tracking-wide text-[#333] shrink-0 transition-colors duration-150"
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      {Icon && <Icon size={12} strokeWidth={1.8} className="shrink-0 opacity-60" />}
                      {t(c.toLowerCase()) === c.toLowerCase() ? c : t(c.toLowerCase())}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Label / Count Bar */}
        <div className="border-b border-border py-3 flex items-center justify-center bg-[#fafafa]">
          <h2 className="text-xs md:text-[13px] lowercase tracking-[0.22em] font-bold text-black">
            {t('news') || 'news'}
            <span className="text-[#aaa] ml-2 font-light">({totalCount})</span>
          </h2>
        </div>


        {/* News Content */}
        <div className="border-b border-border min-h-[calc(100vh-200px)]">
          <div className="flex-1 px-2.5 sm:px-4 py-3 lg:py-6 w-full">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-1 sm:gap-x-2 lg:gap-x-4 gap-y-4 sm:gap-y-5 lg:gap-y-8">
                {Array(12).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/5] bg-[#f0efed]" />
                    <div className="mt-3 space-y-2">
                      <div className="h-2.5 bg-[#e8e8e8] rounded w-1/3" />
                      <div className="h-3 bg-[#e8e8e8] rounded w-3/4" />
                      <div className="h-3 bg-[#e8e8e8] rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : totalCount === 0 ? (
              <div className="text-center py-24 w-full">
                <p className="text-[12px] uppercase tracking-widest text-[#999]">{t('no_products')}</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {productsByDesigner.map(({ designer: brandName, products: brandProducts }, sectionIndex) => {
                  const items = brandProducts.slice(0, 6);

                  return (
                    <section key={brandName}>
                      {/* Brand name — proportional, clickable, navigates to catalog */}
                      <div className="flex items-center justify-center py-5 sm:py-7 md:py-9">
                        <motion.button
                          onClick={() => goToDesigner(brandName)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: sectionIndex * 0.1 }}
                          className="text-[1.6rem] sm:text-[2rem] md:text-[2.6rem] font-black uppercase leading-none tracking-tight text-black text-center hover:opacity-60 transition-opacity cursor-pointer"
                        >
                          {brandName}
                        </motion.button>
                      </div>

                      {/* Grid layout: 2 big + 4 standard */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: sectionIndex * 0.1 + 0.15 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-x-1 sm:gap-x-2 lg:gap-x-4 gap-y-4 sm:gap-y-5 lg:gap-y-8 mb-0"
                      >
                        {items.map((product, i) => {
                          const isBig = i < 2;
                          const spanClass = isBig ? "col-span-1 md:col-span-2" : "col-span-1";

                          return (
                            <motion.div
                              key={product.id}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.35, delay: i * 0.06 }}
                              className={`${spanClass} flex flex-col`}
                            >
                              <ProductCard product={product} isFeatured={isBig} />
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomDock />
      <Footer />
    </div>
  );
};

export default News;

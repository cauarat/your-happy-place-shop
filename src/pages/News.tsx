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


        {/* Active Filter Label & Count — same style as catalog */}
        <div
          className="sticky top-[100px] sm:top-[112px] z-40 w-full pt-2 pb-6 -mb-6 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 22px, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 22px, transparent 100%)',
          }}
        >
          <div className="relative flex items-center justify-center px-3 sm:px-6 lg:px-10 py-1 w-full pointer-events-auto">
            <div className="flex items-center justify-center overflow-hidden w-full max-w-[75%] sm:max-w-[85%] mx-auto">
              <span className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase truncate text-black text-center">
                {t('news') || 'news'}
              </span>
            </div>
          </div>
        </div>

        {/* News Content */}
        <div className="min-h-[calc(100vh-200px)]">
          <div className="flex-1 px-2.5 sm:px-4 pb-3 lg:pb-6 pt-0 w-full">
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
                      <div className={`flex flex-col items-center justify-center pb-5 sm:pb-7 md:pb-9 ${sectionIndex === 0 ? "pt-1 sm:pt-2" : "pt-10 sm:pt-14 md:pt-16"}`}>
                        <motion.button
                          onClick={() => goToDesigner(brandName)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: sectionIndex * 0.1 }}
                          className="flex flex-col items-center gap-1.5 hover:opacity-60 transition-opacity cursor-pointer group"
                        >
                          <span className="text-[1.6rem] sm:text-[2rem] md:text-[2.6rem] font-black uppercase leading-none tracking-tight text-black text-center">
                            {brandName}
                          </span>
                          <span className="text-[11px] sm:text-xs font-semibold tracking-widest text-[#888] group-hover:text-black transition-colors">
                            ({brandProducts.length})
                          </span>
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

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getProducts, getDesigners, getDesignSettings } from "@/lib/store";
import type { Product } from "@/data/products";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";

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
      .map(([d, prods]) => ({ designer: d, products: prods }))
      .sort((a, b) => b.products.length - a.products.length);
  }, [products]);

  const totalCount = useMemo(
    () => productsByDesigner.reduce((sum, g) => sum + g.products.length, 0),
    [productsByDesigner]
  );

  // Navigate to Index with a designer pre-selected
  const goToDesigner = (designerName: string) => {
    navigate(`/?designer=${encodeURIComponent(designerName)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 w-full max-w-[1800px] mx-auto px-0 md:px-0">
        {/* Full-Width Top Bar */}
        <div className="border-y border-border py-2.5 mb-0 flex items-center justify-center">
          <h2 className="text-[11px] lowercase tracking-[0.2em] font-medium text-foreground">
            {t('news') || "news"}
            <span className="text-muted-foreground ml-2 font-light">({totalCount})</span>
          </h2>
        </div>

        {/* Sticky CATEGORIES / SORT Sub-header — navigates back to catalog */}
        <div className="sticky top-14 z-40 bg-white border-b border-border flex w-full">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 text-[11px] font-bold uppercase tracking-[0.25em] border-r border-border text-center hover:bg-neutral-50 transition-colors"
          >
            {t('categories')}
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-center hover:bg-neutral-50 transition-colors"
          >
            {t('sort')}
          </button>
        </div>

        {/* Filter Pills / Designers Scroll Row */}
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onDoubleClick={onDoubleClick}
          className="border-b border-border py-2 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 bg-white select-none whitespace-nowrap cursor-grab active:cursor-grabbing"
        >
          {/* News Pill (active on this page) */}
          <button
            className="flex items-center gap-2 px-3 py-1.5 border border-black bg-black text-white text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
          >
            <Newspaper size={12} strokeWidth={2} className="shrink-0" />
            {t('news') || 'News'}
          </button>

          {/* Sale pill — navigates to catalog with sale */}
          {getDesignSettings().enableSalePage !== false && (
            <button
              onClick={(e) => {
                if (hasDragged.current) return;
                navigate('/');
              }}
              className="flex items-center gap-2 px-3 py-1.5 border border-border text-black hover:border-black text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
            >
              <span className="w-2 h-2 border border-black bg-transparent" />
              {t('sale')}
            </button>
          )}

          {/* All Designers — click navigates to Index filtered by that brand */}
          {getDesigners().map((d) => (
            <button
              key={d}
              onClick={(e) => {
                if (hasDragged.current) return;
                goToDesigner(d);
              }}
              className="px-3 py-1.5 border border-border text-black hover:border-black text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
            >
              {d}
            </button>
          ))}
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

      <Footer />
    </div>
  );
};

export default News;

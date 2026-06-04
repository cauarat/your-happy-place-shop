import { useMemo, useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearch } from "@/contexts/SearchContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import SortBar, { SortKey } from "@/components/SortBar";
import ProductCard from "@/components/ProductCard";
import { getProducts, getDesigners } from "@/lib/store";
import type { Product } from "@/data/products";
import ImmersiveAi from "@/components/ImmersiveAi";
import TryTheLook from "@/components/TryTheLook";
import { motion } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X } from "lucide-react";

const Index = () => {
  const [category, setCategory] = useState<string>("All");
  const [designer, setDesigner] = useState<string>(() => {
    const availableDesigners = getDesigners();
    const randomIndex = Math.floor(Math.random() * availableDesigners.length);
    return availableDesigners[randomIndex] || "All";
  });
  const [sort, setSort] = useState<SortKey>("latest");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { searchQuery } = useSearch();
  const [isRefineOpen, setIsRefineOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showSaleOnly, setShowSaleOnly] = useState(false);

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

  const filtered = useMemo(() => {
    let list = products;

    if (showSaleOnly) {
      list = list.filter((p) => p.oldPrice !== undefined && p.oldPrice > p.price);
    }

    // AI search filter — matches name, designer, category
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.designer.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    } else {
      // Normal sidebar filters only when not searching
      list = list.filter(
        (p) =>
          (category === "All" || p.category === category) &&
          (designer === "All" || p.designer === designer)
      );
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
  }, [category, designer, sort, products, searchQuery, showSaleOnly]);

  // Derive which designers/categories are in the current results (for sidebar highlighting)
  const activeDesigners = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return new Set(filtered.map((p) => p.designer));
  }, [filtered, searchQuery]);

  const activeCategories = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return new Set(filtered.map((p) => p.category));
  }, [filtered, searchQuery]);

  const { t } = useLanguage();

  // Build the top bar label
  const topBarLabel = searchQuery.trim()
    ? `"${searchQuery}"`
    : designer !== "All"
      ? designer
      : category !== "All"
        ? t(category.toLowerCase())
        : t("all_products");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 w-full max-w-[1800px] mx-auto px-0 md:px-0">
        {/* Full-Width Top Bar */}
        <div className="border-y border-border py-2.5 mb-0 flex items-center justify-center">
          <h2 className="text-[11px] lowercase tracking-[0.2em] font-medium text-foreground">
            {topBarLabel}
            <span className="text-muted-foreground ml-2 font-light">({filtered.length})</span>
          </h2>
        </div>

        {/* Mobile Sticky REFINE / SORT Sub-header */}
        <div className="lg:hidden sticky top-14 z-40 bg-white border-b border-border flex w-full">
          <button 
            onClick={() => setIsRefineOpen(true)}
            className="flex-1 py-3 text-[11px] font-bold uppercase tracking-[0.25em] border-r border-border text-center hover:bg-neutral-50 transition-colors"
          >
            Refine
          </button>
          <button 
            onClick={() => setIsSortOpen(true)}
            className="flex-1 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-center hover:bg-neutral-50 transition-colors"
          >
            Sort
          </button>
        </div>

        {/* Filter Pills / Recommended Tags Row */}
        <div className="border-b border-border py-2 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 bg-white select-none whitespace-nowrap">
          {/* Sale Toggle Pill */}
          <button
            onClick={() => setShowSaleOnly(!showSaleOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
              showSaleOnly 
                ? "border-black bg-black text-white" 
                : "border-border text-black hover:border-black"
            }`}
          >
            <span className={`w-2 h-2 border transition-colors ${showSaleOnly ? "border-white bg-white" : "border-black bg-transparent"}`} />
            Sale
          </button>

          {/* Category Pill */}
          {category !== "All" && (
            <button
              onClick={() => setCategory("All")}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black bg-black text-white text-[10px] font-bold uppercase tracking-[0.15em]"
            >
              {t(category.toLowerCase())}
              <X size={10} className="shrink-0" />
            </button>
          )}

          {/* Designer Pill */}
          {designer !== "All" && (
            <button
              onClick={() => setDesigner("All")}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black bg-black text-white text-[10px] font-bold uppercase tracking-[0.15em]"
            >
              {designer}
              <X size={10} className="shrink-0" />
            </button>
          )}

          {/* If no filters, show default categories/designers */}
          {category === "All" && designer === "All" && (
            <>
              {getProducts().map(p => p.designer).filter((value, index, self) => self.indexOf(value) === index).slice(0, 5).map((d) => (
                <button
                  key={d}
                  onClick={() => setDesigner(d)}
                  className="px-3 py-1.5 border border-border text-black text-[10px] font-bold uppercase tracking-[0.15em] hover:border-black transition-colors"
                >
                  {d}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] border-b border-border min-h-[calc(100vh-200px)]">
          {/* Left Sidebar */}
          <div className="hidden lg:flex lg:border-r border-border py-6 px-4 lg:px-5 flex-col">
            <div className="flex-1">
              <Sidebar
                category={category}
                setCategory={setCategory}
                designer={designer}
                setDesigner={setDesigner}
                showTitle={true}
                highlightedDesigners={activeDesigners}
                highlightedCategories={activeCategories}
              />
            </div>
            
            {/* Vertical Decorative Art - Left */}
            <div className="hidden lg:flex flex-col items-center gap-6 opacity-[0.1] pointer-events-none select-none mt-24 mb-12">
              <div className="w-px h-24 bg-foreground" />
              <div className="[writing-mode:vertical-rl] text-[9px] lowercase tracking-[0.3em] font-medium py-4 whitespace-nowrap">
                Villaoro Collection
              </div>
              <div className="w-px h-16 bg-foreground" />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 px-2.5 sm:px-4 py-3 lg:py-4">
            {isLoading ?
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-1 sm:gap-x-2 gap-y-4 sm:gap-y-5">
                {Array(8).fill(0).map((_, i) =>
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-[#f0efed]" />
                    <div className="mt-3 space-y-2">
                      <div className="h-2.5 bg-[#e8e8e8] rounded w-1/3" />
                      <div className="h-3 bg-[#e8e8e8] rounded w-3/4" />
                      <div className="h-3 bg-[#e8e8e8] rounded w-1/4" />
                    </div>
                  </div>
                )}
              </div> :
              filtered.length === 0 ?
                <div className="text-center py-24">
                  <p className="text-[12px] uppercase tracking-widest text-[#999]">{t('no_products')}</p>
                </div> :

                <motion.div
                  key={`${category}-${designer}-${searchQuery}-${showSaleOnly}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-1 sm:gap-x-2 gap-y-4 sm:gap-y-5">
                  {filtered.map((product, i) =>
                    <ProductCard key={product.id} product={product} index={i} />
                  )}
                </motion.div>
            }
          </div>

          {/* Right Sort Bar */}
          <div className="hidden lg:flex lg:border-l border-border py-6 px-4 lg:px-5 flex-col">
            <div className="flex-1">
              <SortBar sort={sort} setSort={setSort} showTitle={true} />
            </div>
            
            {/* Vertical Decorative Art - Right */}
            <div className="hidden lg:flex flex-col items-center gap-6 opacity-[0.1] pointer-events-none select-none mt-24 mb-12">
              <div className="w-px h-32 bg-foreground" />
              <div className="[writing-mode:vertical-rl] text-[9px] lowercase tracking-[0.3em] font-bold py-4 whitespace-nowrap">
                {topBarLabel} <span className="opacity-50">({filtered.length})</span>
              </div>
              <div className="w-px h-24 bg-foreground" />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Drawers (Sheets) */}
      <Sheet open={isRefineOpen} onOpenChange={setIsRefineOpen}>
        <SheetContent side="left" className="w-[85%] max-w-[340px] p-6 flex flex-col justify-between bg-white z-[100] overflow-y-auto no-scrollbar">
          <div>
            <div className="flex items-center justify-between border-b border-black pb-4 mb-6">
              <h2 className="text-xs uppercase tracking-widest font-bold text-black">Refine</h2>
              <button 
                onClick={() => setIsRefineOpen(false)}
                className="text-[10px] uppercase font-bold tracking-widest text-[#999] hover:text-black"
              >
                Close
              </button>
            </div>
            
            <Sidebar
              category={category}
              setCategory={setCategory}
              designer={designer}
              setDesigner={setDesigner}
              showTitle={true}
              highlightedDesigners={activeDesigners}
              highlightedCategories={activeCategories}
            />
          </div>

          <div className="border-t border-border pt-4 mt-8 flex gap-3">
            <button 
              onClick={() => {
                setCategory("All");
                setDesigner("All");
                setIsRefineOpen(false);
              }}
              className="flex-1 border border-black py-2.5 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-neutral-50 transition-colors"
            >
              Clear All
            </button>
            <button 
              onClick={() => setIsRefineOpen(false)}
              className="flex-1 bg-black text-white py-2.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isSortOpen} onOpenChange={setIsSortOpen}>
        <SheetContent side="bottom" className="p-6 bg-white z-[100] max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <h2 className="text-xs uppercase tracking-widest font-bold text-black">Sort</h2>
            <button 
              onClick={() => setIsSortOpen(false)}
              className="text-[10px] uppercase font-bold tracking-widest text-[#999] hover:text-black"
            >
              Close
            </button>
          </div>
          
          <div className="py-2">
            <SortBar 
              sort={sort} 
              setSort={(newSort) => {
                setSort(newSort);
                setIsSortOpen(false);
              }} 
              showTitle={false} 
            />
          </div>
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );

};

export default Index;

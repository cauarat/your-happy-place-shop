import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getProducts, Product, getLooks, Look } from "@/lib/store";
import { toast } from "sonner";
import { ShoppingBag, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MobileBottomDock from "@/components/MobileBottomDock";

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98,
    };
  },
};

export default function CommunityLooks() {
  const { addItem } = useCart();
  const { t } = useLanguage();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [selectedLook, setSelectedLook] = useState<Look | null>(null);
  
  // Carousel state
  const [[page, direction], setPage] = useState([0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const storedProducts = getProducts();
    const storedLooks = getLooks();
    setAllProducts(storedProducts);
    setLooks(storedLooks);

    // Preload images
    storedLooks.forEach(look => {
      const img = new Image();
      img.src = look.modelImage;
    });
  }, []);

  const getLookProducts = (look: Look) => {
    return look.productIds
      .map(id => allProducts.find(p => p.id === id))
      .filter(Boolean) as Product[];
  };

  const handleAddAllToCart = (products: Product[]) => {
    products.forEach(product => {
      addItem({ ...product, quantity: 1, selectedSize: product.sizes?.[0] || 'M' });
    });
    toast.success("Outfit added to your cart");
    setSelectedLook(null);
  };

  const handleShopLookClick = (look: Look) => {
    setSelectedLook(look);
  };

  // Total slides = looks + 1 CTA slide
  const totalSlides = looks.length + 1;
  const activeIndex = totalSlides > 0 ? ((page % totalSlides) + totalSlides) % totalSlides : 0;
  const isCtaSlide = activeIndex === looks.length;
  const activeLook = isCtaSlide ? null : looks[activeIndex];

  const paginate = useCallback((newDirection: number) => {
    if (isAnimating || totalSlides <= 1) return;
    setIsAnimating(true);
    setPage([page + newDirection, newDirection]);
  }, [isAnimating, page, totalSlides]);

  const jumpTo = (index: number) => {
    if (isAnimating || totalSlides <= 1 || index === activeIndex) return;
    setIsAnimating(true);
    const newDirection = index > activeIndex ? 1 : -1;
    setPage([page + (index - activeIndex), newDirection]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") paginate(-1);
      if (e.key === "ArrowRight") paginate(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paginate]);

  if (looks.length === 0) return null;

  const lookProducts = activeLook ? getLookProducts(activeLook) : [];

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col overflow-x-hidden">
      <Header />
      
      <main className="flex-1 flex flex-col pt-4 pb-[96px] xl:pb-12">
        <div className="text-center mb-6 px-6">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase mb-5" style={{ fontFamily: 'var(--font-heading, Inter, sans-serif)' }}>
            <a href="https://www.altadaily.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity duration-300">
              ALTA
            </a>
          </h1>
          <p className="text-lg md:text-xl font-medium tracking-wide text-gray-800">
            {t('ai_stylist_tagline')}
          </p>
        </div>

        <div className="relative w-full max-w-7xl mx-auto flex-1 flex flex-col items-center justify-center px-4">
          
          {/* Navigation Arrows */}
          {totalSlides > 1 && (
            <>
              <button 
                onClick={() => paginate(-1)}
                className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white/50 backdrop-blur-sm border border-black/5 hover:bg-white hover:scale-110 transition-all duration-300 active:scale-95 group shadow-sm"
                aria-label="Previous Look"
              >
                <ChevronLeft className="w-6 h-6 text-black/70 group-hover:text-black transition-colors" />
              </button>
              
              <button 
                onClick={() => paginate(1)}
                className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white/50 backdrop-blur-sm border border-black/5 hover:bg-white hover:scale-110 transition-all duration-300 active:scale-95 group shadow-sm"
                aria-label="Next Look"
              >
                <ChevronRight className="w-6 h-6 text-black/70 group-hover:text-black transition-colors" />
              </button>
            </>
          )}

          {/* Carousel Viewport */}
          <div className="relative w-full max-w-[550px] md:max-w-[650px] aspect-[3/4] flex items-center justify-center">
            <AnimatePresence 
              initial={false} 
              custom={direction} 
              mode="popLayout"
              onExitComplete={() => setIsAnimating(false)}
            >
              <motion.div
                key={page}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.4, ease: "easeInOut" },
                  scale: { duration: 0.4, ease: "easeInOut" }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);
                  if (swipe < -swipeConfidenceThreshold) {
                    paginate(1);
                  } else if (swipe > swipeConfidenceThreshold) {
                    paginate(-1);
                  }
                }}
                className="absolute inset-0 flex flex-col group cursor-grab active:cursor-grabbing"
              >
                {isCtaSlide ? (
                  /* "Create Your Own" CTA Slide */
                  <a
                    href="https://www.altadaily.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-full h-full bg-[#f5f5f5] overflow-hidden flex flex-col items-center justify-center gap-6 hover:bg-[#efefef] transition-colors duration-500 cursor-pointer"
                  >
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-dashed border-black/20 flex items-center justify-center group-hover:border-black/40 transition-colors duration-300">
                      <Plus className="w-10 h-10 md:w-12 md:h-12 text-black/30 group-hover:text-black/60 transition-colors duration-300" />
                    </div>
                    <div className="text-center px-8">
                      <p className="text-xl md:text-2xl font-black uppercase tracking-tight text-black/80 mb-2">{t('create_your_own')}</p>
                      <p className="text-sm text-black/40 tracking-wide">{t('design_look_alta')}</p>
                    </div>
                  </a>
                ) : activeLook ? (
                  <div className="relative w-full h-full bg-[#f8f8f8] overflow-hidden">
                    <img 
                      src={activeLook.modelImage} 
                      alt={`Community Look ${activeIndex + 1}`} 
                      className="w-full h-full object-cover object-center pointer-events-none"
                      draggable={false}
                    />
                    {/* Overlay for Shop This Look on hover */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center p-6 backdrop-blur-[2px]">
                      <button 
                        onClick={() => handleShopLookClick(activeLook)}
                        className="translate-y-4 group-hover:translate-y-0 transition-all duration-500 bg-white text-black px-8 py-4 rounded-none text-sm font-bold uppercase tracking-widest hover:bg-gray-100 flex items-center gap-3 shadow-2xl"
                      >
                        <ShoppingBag size={18} />
                        {t('shop_this_look')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Mobile Shop/CTA Button */}
          <div className="w-full max-w-[550px] md:max-w-[650px] mt-6 xl:hidden">
            {isCtaSlide ? (
              <a
                href="https://www.altadaily.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-black text-white px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-neutral-800 transition-colors"
              >
                <Plus size={16} />
                {t('create_your_own')}
              </a>
            ) : activeLook ? (
              <button 
                onClick={() => handleShopLookClick(activeLook)}
                className="w-full bg-black text-white px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-neutral-800 transition-colors"
              >
                <ShoppingBag size={16} />
                {t('shop_this_look')}
              </button>
            ) : null}
          </div>

          {/* Pagination Dots */}
          {totalSlides > 1 && (
            <div className="flex items-center gap-3 mt-10">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => jumpTo(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    idx === activeIndex 
                      ? 'w-10 h-1.5 bg-black' 
                      : 'w-1.5 h-1.5 bg-black/20 hover:bg-black/50'
                  }`}
                  aria-label={idx === looks.length ? 'Create your own look' : `Go to look ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Alta Website Link */}
          <a
            href="https://www.altadaily.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 text-sm font-medium tracking-wider text-black/40 hover:text-black transition-colors duration-300 uppercase"
          >
            www.altadaily.com
          </a>

        </div>
      </main>

      {/* Shop This Look Modal */}
      <Dialog open={!!selectedLook} onOpenChange={(open) => !open && setSelectedLook(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white border-0 rounded-none shadow-2xl">
          {selectedLook && (() => {
            const currentLookProducts = getLookProducts(selectedLook);
            const total = currentLookProducts.reduce((acc, p) => acc + (p.price || 0), 0);

            return (
              <div className="flex flex-col h-full max-h-[90vh]">
                <DialogHeader className="p-6 md:p-8 border-b border-gray-100 bg-white z-10">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter">{t('shop_the_look')}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* Left: Model Preview */}
                    <div className="relative aspect-[3/4] bg-[#f8f8f8] hidden md:block">
                      <img 
                        src={selectedLook.modelImage} 
                        alt="Look preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Right: Products */}
                    <div className="flex flex-col space-y-6 md:py-4">
                      <div className="space-y-6">
                        {currentLookProducts.map((product) => (
                          <div key={product.id} className="flex gap-4 items-start group">
                            <div className="w-24 h-28 bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100">
                              {product.images && product.images[0] ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">No Img</div>
                              )}
                            </div>
                            <div className="flex-1 py-1">
                              <Link to={`/product/${product.id}`} className="block hover:underline font-semibold text-sm">
                                {product.name}
                              </Link>
                              <div className="text-xs text-gray-400 uppercase tracking-widest mt-1 mb-2">
                                {product.designer}
                              </div>
                              <div className="text-sm font-medium">
                                ${product.price}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 z-10">
                  <div className="text-sm font-medium uppercase tracking-wider text-gray-500">
                    {t('total_value')}: <span className="text-xl font-bold ml-2 text-black">${total}</span>
                  </div>
                  <button 
                    onClick={() => handleAddAllToCart(currentLookProducts)}
                    className="w-full md:w-auto bg-black text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={16} />
                    {t('add_entire_look')}
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      
      <MobileBottomDock />
      <Footer />
    </div>
  );
}

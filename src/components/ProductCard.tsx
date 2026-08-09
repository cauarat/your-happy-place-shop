import { Product } from "@/data/products";
import { Link } from "react-router-dom";
import { useState, useCallback } from "react";
import { computeCropStyles } from "@/lib/cropUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDesignSettings } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const ProductCard = ({ product, index, isFeatured }: { product: Product, index?: number, isFeatured?: boolean }) => {
  const { t } = useLanguage();
  const { items, addToCart, removeFromCart } = useCart();
  
  const cartItems = items.filter(item => item.product.id === product.id);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const isFavorite = totalQuantity > 0;

  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImgAspect(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isFavorite) {
      // Add product with quantity 1 and default size null
      addToCart(product, 1, (product as any).sizes?.[0] || null);
      toast.success(`${product.name} adicionado à sacola / favoritos`);
    } else {
      cartItems.forEach(item => removeFromCart(item.id));
    }
  };
  
  const formatPrice = (p: number) => {
    return p % 1 === 0 ? `$${Math.round(p)}` : `$${p.toFixed(2)}`;
  };

  return (
    <Link 
      to={`/product/${product.id}`} 
      className="group block w-full select-none"
      data-tour={index === 0 ? "product-card" : undefined}
    >
      {(() => {
        const cropData = product.displayCrops?.[0];
        const hasCrop = !!cropData;
        const containerAspect = 4 / 5;
        // Skip crop styles if this is a featured card without a fixed aspect container
        const cropStyles = (hasCrop && imgAspect && !isFeatured) 
          ? computeCropStyles(imgAspect, containerAspect, cropData) 
          : undefined;

        return (
          <>
          <div className={`relative bg-white overflow-hidden rounded-2xl ${cropStyles ? '' : 'flex items-center justify-center'} ${isFeatured ? 'w-full h-auto aspect-auto' : 'aspect-[4/5]'}`}>

            <img 
              src={product.image} 
              alt={product.name} 
              onLoad={handleImageLoad}
              loading={(index !== undefined && index < 8) || isFeatured ? "eager" : "lazy"}
              {...(((index !== undefined && index < 4) || isFeatured) ? { fetchPriority: "high" } as any : {})}
              decoding="async"
              className={cropStyles ? `transition-transform duration-700 ease-out group-hover:scale-[1.02]` : `w-full ${isFeatured ? 'h-auto object-contain' : 'h-full object-contain'} transition-transform duration-700 ease-out group-hover:scale-[1.02]`}
              style={cropStyles || undefined}
            />
            
            {/* Interactive Favorite Heart */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2.5 right-2.5 z-10 p-2 hover:bg-black/5 rounded-full transition-colors focus:outline-none flex items-center justify-center"
          aria-label="Add to favorites"
        >
          <div className="relative">
            <motion.div
              key={isFavorite ? 'favorited' : 'unfavorited'}
              animate={
                isFavorite 
                  ? { scale: [1, 1.3, 0.9, 1.1, 1] } 
                  : { scale: 1 }
              }
              transition={{ duration: 0.4 }}
            >
              <Heart 
                size={22} 
                strokeWidth={isFavorite ? 0 : 1.2} 
                fill={isFavorite ? "#FF3B30" : "transparent"}
                className={isFavorite ? "text-[#FF3B30]" : "text-black drop-shadow-sm"} 
              />
            </motion.div>
            
            <AnimatePresence>
              {totalQuantity > 0 && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1.5 -right-1.5 bg-[#FF3B30] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm"
                >
                  {totalQuantity}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>
      </div>
      <div className="flex flex-col mt-3 space-y-1 w-full text-left">
        <p className="text-[11px] md:text-[12px] text-black font-semibold uppercase tracking-widest leading-none">
          {product.designer}
        </p>
        <p className="text-[11px] md:text-[12px] text-[#555] font-normal leading-tight line-clamp-2 min-h-[2.2em]">
          {t(product.name)}
        </p>
        {getDesignSettings().showPrices !== false && (
          <p className="text-[11px] md:text-[12px] text-black pt-1 font-medium tracking-wide flex items-center gap-1.5 leading-none">
            <span>{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-[#999] line-through text-[10px] md:text-[11px]">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </p>
        )}
      </div>
      </>
        );
      })()}

    </Link>
  );
};

export default ProductCard;

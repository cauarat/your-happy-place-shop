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
        // Square, not 4:5. The catalogue is mostly wide product shots on
        // white; in a portrait well they scaled to the width and left a third
        // of the card empty above and below. Must stay in step with the
        // aspect-square on the well below — the crop maths derives from it.
        const containerAspect = 1;
        // Skip crop styles if this is a featured card without a fixed aspect container
        const cropStyles = (hasCrop && imgAspect && !isFeatured) 
          ? computeCropStyles(imgAspect, containerAspect, cropData) 
          : undefined;

        const onSale = !!product.oldPrice && product.oldPrice > product.price;

        return (
          // The well: square, sunken, hairlined. A product shot now sits *in*
          // the page instead of on a floating rounded white tile, which is
          // what let the old grid read as a pile of cards rather than a
          // catalogue.
          <div
            className={`relative overflow-hidden bg-surface-sunken border-hairline border-ink/[0.08] ${
              cropStyles ? "" : "flex items-center justify-center"
            } ${isFeatured ? "w-full h-auto aspect-auto" : "aspect-square"}`}
          >
            <img
              src={product.image}
              alt={product.name}
              onLoad={handleImageLoad}
              loading={(index !== undefined && index < 8) || isFeatured ? "eager" : "lazy"}
              {...(((index !== undefined && index < 4) || isFeatured) ? { fetchPriority: "high" } as any : {})}
              decoding="async"
              className={
                cropStyles
                  ? `transition-transform duration-slow ease-quint group-hover:scale-[1.04]`
                  : `w-full ${isFeatured ? "h-auto object-contain" : "h-full object-contain"} transition-transform duration-slow ease-quint group-hover:scale-[1.04]`
              }
              style={cropStyles || undefined}
            />

            {onSale && (
              <span className="sale-badge absolute left-3 top-3 z-10 bg-paper/90 px-2 py-1 backdrop-blur-sm">
                {t('sale') || 'Sale'}
              </span>
            )}

            {/* Save. Always visible on touch, where there is no hover to
                reveal it; on a pointer device it fades in with the card so the
                grid stays quiet until you engage with it. */}
            <button
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? "Remove from bag" : "Add to bag"}
              aria-pressed={isFavorite}
              className="absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border-hairline border-ink/10 bg-paper/85 backdrop-blur-sm transition-[opacity,border-color,background-color] duration-base ease-sine hover:border-ink/30 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <div className="relative">
                <motion.div
                  key={isFavorite ? 'favorited' : 'unfavorited'}
                  animate={isFavorite ? { scale: [1, 1.28, 0.92, 1.08, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.445, 0.05, 0.55, 0.95] }}
                >
                  <Heart
                    size={16}
                    strokeWidth={isFavorite ? 0 : 1.5}
                    fill={isFavorite ? "currentColor" : "transparent"}
                    className={isFavorite ? "text-ink" : "text-ink/70"}
                  />
                </motion.div>

                <AnimatePresence>
                  {totalQuantity > 1 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 font-mono text-[9px] tabular-nums text-paper"
                    >
                      {totalQuantity}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
          </div>
      );})()}

      {/* Caption. Three lines, three voices: mono for the house, sans for the
          piece, mono tabular for the price so figures align down the column. */}
      <div className="mt-3.5 flex w-full flex-col gap-1.5 text-left">
        <p className="type-label text-ink transition-opacity duration-base ease-sine group-hover:opacity-60">
          {product.designer}
        </p>
        <p className="line-clamp-2 min-h-[2.4em] text-[13px] leading-snug text-ink/60">
          {t(product.name)}
        </p>
        {getDesignSettings().showPrices !== false && (
          <p className="type-numeric flex items-baseline gap-2 pt-0.5 text-[13px] text-ink">
            <span>{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-[11px] text-ink/35 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;

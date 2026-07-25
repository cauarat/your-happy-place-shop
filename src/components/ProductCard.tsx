import { Product } from "@/data/products";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDesignSettings } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

const ProductCard = ({ product, index, isFeatured }: { product: Product, index?: number, isFeatured?: boolean }) => {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isFavorite) {
      setIsFavorite(true);
      // Add product with quantity 1 and default size null (or auto-select first size if we want, but null is fine)
      addToCart(product, 1, product.sizes?.[0] || null);
      toast.success(`${product.name} adicionado à sacola / favoritos`);
    } else {
      setIsFavorite(false);
    }
  };
  
  const formatPrice = (p: number) => {
    return p % 1 === 0 ? `$${Math.round(p)}` : `$${p.toFixed(2)}`;
  };

  return (
    <Link to={`/product/${product.id}`} className="group block w-full select-none">
      <div className={`relative bg-white overflow-hidden flex items-center justify-center ${isFeatured ? 'w-full h-auto aspect-auto' : 'aspect-[4/5]'}`}>
        <img 
          src={product.image} 
          alt={product.name} 
          loading={(index !== undefined && index < 8) || isFeatured ? "eager" : "lazy"}
          {...(((index !== undefined && index < 4) || isFeatured) ? { fetchPriority: "high" } as any : {})}
          decoding="async"
          className={`w-full ${isFeatured ? 'h-auto object-contain' : 'h-full object-contain'} transition-transform duration-700 ease-out group-hover:scale-[1.02]`}
        />
        
        {/* Interactive Favorite Heart */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2.5 right-2.5 z-10 p-2 hover:bg-black/5 rounded-full transition-colors focus:outline-none flex items-center justify-center"
          aria-label="Add to favorites"
        >
          <motion.div
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
        </button>
      </div>
      <div className="flex flex-col mt-2.5 space-y-0.5 px-0.5">
        <p className="text-[11px] md:text-[12px] text-black font-bold uppercase tracking-[0.08em] leading-snug">
          {product.designer}
        </p>
        <p className="text-[11px] md:text-[12px] text-neutral-800 font-light tracking-tight leading-snug line-clamp-2 min-h-[2.4em]">
          {t(product.name)}
        </p>
        {getDesignSettings().showPrices !== false && (
          <p className="text-[11px] md:text-[12px] text-black pt-0.5 font-normal tracking-wide flex items-center gap-1.5">
            <span>{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-[#999] line-through text-[10px] md:text-[11px]">
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

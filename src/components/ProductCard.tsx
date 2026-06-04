import { Product } from "@/data/products";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const ProductCard = ({ product, index }: { product: Product, index?: number }) => {
  const { t } = useLanguage();
  
  const formatPrice = (p: number) => {
    return p % 1 === 0 ? `$${Math.round(p)}` : `$${p.toFixed(2)}`;
  };

  return (
    <Link to={`/product/${product.id}`} className="group block w-full select-none">
      <div className="relative aspect-[3/4] bg-white overflow-hidden flex items-center justify-center">
        <img 
          src={product.image} 
          alt={product.name} 
          loading="lazy" 
          className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col mt-2.5 space-y-0.5 px-0.5">
        <p className="text-[11px] md:text-[12px] text-black font-bold uppercase tracking-[0.08em] leading-snug">
          {product.designer}
        </p>
        <p className="text-[11px] md:text-[12px] text-neutral-800 font-light tracking-tight leading-snug line-clamp-2 min-h-[2.4em]">
          {t(product.name)}
        </p>
        <p className="text-[11px] md:text-[12px] text-black pt-0.5 font-normal tracking-wide flex items-center gap-1.5">
          <span>{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="text-[#999] line-through text-[10px] md:text-[11px]">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;

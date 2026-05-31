import { Product } from "@/data/products";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const ProductCard = ({ product, index }: { product: Product, index?: number }) => {
  const { t } = useLanguage();
  const discount = product.oldPrice 
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
    : 0;

  return (
    <Link to={`/product/${product.id}`} className="group block w-full">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#ffffff]">
        {discount > 0 && (
          <span className="absolute top-3 left-3 text-[10px] font-medium text-black">
            -{discount}%
          </span>
        )}
        <img 
          src={product.image} 
          alt={product.name} 
          loading="lazy" 
          className="w-full h-full object-contain transition-transform duration-1000 ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col mt-3 space-y-0.5">
        <p className="text-[13px] text-black font-bold uppercase tracking-wide leading-snug">
          {product.designer}
        </p>
        <p className="text-[12px] text-black leading-snug">
          {t(product.name)}
        </p>
        <p className="text-[12px] text-black pt-0.5">
          ${product.price.toFixed(2)}
          {product.oldPrice && (
            <span className="text-[11px] text-[#999] line-through ml-2">
              ${product.oldPrice.toFixed(2)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;

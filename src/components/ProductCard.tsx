import { Product } from "@/data/products";
import { Link } from "react-router-dom";

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <Link to={`/product/${product.id}`} className="group block w-full">
      <div className="relative aspect-[3/4] overflow-hidden mb-2 bg-[#F9F9F9]">
        <img 
          src={product.image} 
          alt={product.name} 
          loading="lazy" 
          className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-tight text-black leading-none">
          {product.designer}
        </p>
        <p className="text-[10px] text-black tracking-tight leading-tight">
          {product.name}
        </p>
        <div className="pt-1">
          <span className="text-[10px] font-medium text-black">${product.price.toFixed(0)}</span>
          {product.oldPrice && (
            <span className="text-[9px] text-muted-foreground ml-2 line-through decoration-muted-foreground/30">
              ${product.oldPrice.toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;

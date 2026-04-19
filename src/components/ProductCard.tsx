import { Product } from "@/data/products";

const ProductCard = ({ product }: { product: Product }) => {
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  return (
    <a href="#" className="product-card group">
      <div className="product-card-image">
        {discount > 0 && <span className="sale-badge">-{discount}%</span>}
        <img src={product.image} alt={product.name} loading="lazy" width={800} height={800} />
      </div>
      <div className="pt-5 pb-2">
        <p className="eyebrow mb-2">{product.category}</p>
        <h3 className="text-base font-normal leading-snug mb-2" style={{ fontFamily: "var(--font-sans)" }}>
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-sm">${product.price.toFixed(2)}</span>
          {product.oldPrice && (
            <span className="text-sm text-muted-foreground line-through">
              ${product.oldPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
};

export default ProductCard;

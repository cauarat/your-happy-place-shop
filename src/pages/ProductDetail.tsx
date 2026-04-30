import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProducts } from "@/lib/store";
import type { Product } from "@/data/products";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Minus, Plus, ShoppingBag } from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    const products = getProducts();
    const found = products.find((p) => p.id === id);
    if (found) setProduct(found);
    window.scrollTo(0, 0);
  }, [id]);

  if (!product) return null;

  const sizes = ["40", "41", "42", "43", "44"];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 lg:px-12 py-12">
        <div className="flex flex-col items-center justify-center mb-16 text-center">
          <Link to="/" className="text-[11px] uppercase tracking-widest hover:opacity-60 transition-opacity mb-8">
            ← Back to Catalog
          </Link>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-3">
            {product.category}
          </p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tighter uppercase mb-3 max-w-2xl">
            {product.designer} {product.name}
          </h1>
          <div className="w-12 h-px bg-border mb-6" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-16 items-start">
          {/* Left Column: Description */}
          <div className="space-y-8 lg:sticky lg:top-32 h-fit">
            <div className="space-y-6 text-sm leading-relaxed text-foreground/80">
              <p className="font-medium uppercase text-[10px] tracking-widest text-muted-foreground">Description</p>
              <p>
                {product.description || `The ${product.name} reflects the essence of ${product.designer}'s minimalist design philosophy. 
                Crafted with premium materials and a focus on essential details, it offers both timeless style and exceptional comfort.`}
              </p>
              <ul className="space-y-2 list-none pt-4 text-[10px] uppercase tracking-widest">
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary rounded-full" /> Made in Italy</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary rounded-full" /> Premium Materials</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary rounded-full" /> Hand-finished details</li>
              </ul>
            </div>
          </div>

          {/* Center Column: Images */}
          <div className="space-y-12">
            {(product.images && product.images.length > 0 ? product.images : [product.image]).map((img, i) => (
              <div key={i} className="aspect-[4/5] bg-transparent flex items-center justify-center overflow-hidden">
                <img 
                  src={img} 
                  alt={`${product.name} ${i + 1}`} 
                  className="w-full h-full object-contain"
                  style={product.removeBackground ? { mixBlendMode: 'multiply' } : {}}
                />
              </div>
            ))}
          </div>

          {/* Right Column: Checkout */}
          <div className="space-y-10 lg:sticky lg:top-1/2 lg:-translate-y-1/2 h-fit">
            <div>
              <div className="flex flex-col gap-1 mb-6">
                <span className="text-xl font-medium">${product.price.toFixed(2)} USD</span>
                {product.oldPrice && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground line-through">${product.oldPrice.toFixed(2)} USD</span>
                    <span className="text-[10px] uppercase tracking-widest text-destructive">
                      Save {Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest mb-4">Select a Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 border text-xs flex items-center justify-center transition-all ${
                      selectedSize === size 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest mb-4">Quantity</p>
              <div className="flex items-center w-32 border border-border">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="flex-1 text-center text-xs">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <button className="w-full bg-primary text-primary-foreground h-14 uppercase text-[11px] font-bold tracking-[0.2em] flex items-center justify-center gap-3 hover:opacity-90 transition-opacity">
              <ShoppingBag className="w-4 h-4" />
              Add to Bag — ${(product.price * quantity).toFixed(2)}
            </button>

            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
              Free shipping on orders over $100.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;

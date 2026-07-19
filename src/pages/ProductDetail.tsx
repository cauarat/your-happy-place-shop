import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getProducts, getDesignSettings } from "@/lib/store";
import type { Product } from "@/data/products";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Minus, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import MobileBottomDock from "@/components/MobileBottomDock";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isAddedToBag, setIsAddedToBag] = useState(false);
  const { t, language } = useLanguage();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const products = getProducts();
    const found = products.find((p) => p.id === id);
    if (found) setProduct(found);
    window.scrollTo(0, 0);
  }, [id]);

  if (!product) return null;

  const shoeSizes = ["40", "41", "42", "43", "44"];
  const clothingSizes = language === 'PT' ? ['P', 'M', 'G'] : ['S', 'M', 'L'];
  
  const productCategory = product.category.toLowerCase();
  const isShoe = productCategory === 'footwear';
  const isClothing = ['clothing', 'sweater', 'vest', 'shorts', 'pants', 't-shirts', 't-shirt', 'hoodies', 'tank tops', 'tank top'].includes(productCategory);
  
  const sizes = isShoe ? shoeSizes : isClothing ? clothingSizes : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-5 lg:px-12 py-6 md:py-12 pb-[96px] xl:pb-12 relative">
        <div className="w-full mb-4 md:absolute md:top-12 md:left-12 md:w-auto">
          <Link to="/" className="inline-flex items-center text-[11px] uppercase tracking-widest hover:opacity-60 transition-opacity">
            ← {t('back_to_catalog')}
          </Link>
        </div>
        
        <div className="flex flex-col items-center justify-center mb-8 md:mb-16 text-center">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-2 md:mb-3">
            {t(product.category.toLowerCase())}
          </p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tighter uppercase mb-3 max-w-2xl">
            {product.designer} {t(product.name)}
          </h1>
          <div className="w-12 h-px bg-border mb-4 md:mb-6" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-10 md:gap-16 items-start">
          {/* Left Column: Description */}
          <div className="order-3 lg:order-none space-y-8 lg:sticky lg:top-32 h-fit mt-4 lg:mt-0">
            <div className="space-y-6 text-sm leading-relaxed text-foreground/80">
              <p className="font-medium uppercase text-[10px] tracking-widest text-muted-foreground">{t('description')}</p>
              <div className="whitespace-pre-wrap">
                {product.description ? t(product.description) : t('default_description').replace('{product}', t(product.name)).replace('{designer}', product.designer)}
              </div>
              <ul className="space-y-2 list-none pt-4 text-[10px] uppercase tracking-widest">
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary rounded-full" /> Made in Italy</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary rounded-full" /> Premium Materials</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 bg-primary rounded-full" /> Hand-finished details</li>
              </ul>
            </div>
          </div>

          {/* Center Column: Images */}
          <div className="order-1 lg:order-none space-y-6 md:space-y-12">
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
          <div className="order-2 lg:order-none space-y-8 md:space-y-10 lg:sticky lg:top-1/2 lg:-translate-y-1/2 h-fit">
            {getDesignSettings().showPrices !== false && (
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
            )}

            {(isShoe || isClothing) && (
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-4">{t('select_size')}</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 border rounded-full text-xs flex items-center justify-center transition-all ${
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
            )}

            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest mb-4">{t('quantity')}</p>
              <div className="flex items-center w-32 border border-border rounded-full overflow-hidden">
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

            <button 
              onClick={() => {
                if (isAddedToBag) {
                  navigate("/cart");
                } else {
                  addToCart(product, quantity, selectedSize);
                  setIsAddedToBag(true);
                }
              }}
              className="w-full bg-primary text-primary-foreground h-14 rounded-full uppercase text-[11px] font-bold tracking-[0.2em] flex items-center justify-center hover:opacity-90 transition-all duration-300"
            >
              {isAddedToBag ? t('proceed_to_checkout') : t('add_to_bag')}
            </button>
          </div>
        </div>
      </main>

      <MobileBottomDock />
      <Footer />
    </div>
  );
};

export default ProductDetail;

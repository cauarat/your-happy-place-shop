import { useState, useEffect } from "react";
import { Sparkles, ShoppingBag } from "lucide-react";
import { getLooks, getProducts, Look } from "@/lib/store";
import { Link } from "react-router-dom";
import type { Product } from "@/data/products";

const TryTheLook = () => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [look, setLook] = useState<Look | null>(null);
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const looks = getLooks();
    if (looks.length > 0) {
      setLook(looks[0]);
      const allProducts = getProducts();
      const matchedProducts = looks[0].productIds
        .map(id => allProducts.find(p => p.id === id))
        .filter((p): p is Product => p !== undefined);
      setItems(matchedProducts);
    }
  }, []);

  if (!look || items.length === 0) return null;

  return (
    <section className="py-24 px-6 lg:px-12 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-4">{look.name}</h2>
          <p className="text-muted-foreground uppercase tracking-wide text-xs">
            Curated Looks For You
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_2fr_1fr] gap-8 lg:gap-16 items-center">
          {/* Left Column - Accessories & Tops */}
          <div className="flex flex-row lg:flex-col gap-6 justify-center lg:justify-end order-2 lg:order-1 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 no-scrollbar">
            {items.slice(0, Math.ceil(items.length / 2)).map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.id}`}
                className={`glass p-4 rounded-xl min-w-[120px] transition-all duration-300 hover:scale-105 ${
                  selectedItem === item.id ? "ring-1 ring-primary shadow-md" : "opacity-80 hover:opacity-100"
                }`}
              >
                <div className="aspect-square bg-secondary/50 rounded-lg overflow-hidden mb-3">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground line-clamp-1">{item.name}</p>
                <p className="text-xs mt-1">${item.price}</p>
              </Link>
            ))}
          </div>

          {/* Center Column - Main Model */}
          <div className="relative order-1 lg:order-2">
            <div className="aspect-[3/4] md:aspect-square lg:aspect-[3/4] w-full max-w-md mx-auto overflow-hidden rounded-sm bg-secondary relative group">
              <img
                src={look.modelImage}
                alt={look.name}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              
              <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <button className="bg-primary text-primary-foreground px-8 py-3 uppercase text-xs tracking-wider flex items-center gap-2 hover:bg-primary/90 transition-colors">
                  <ShoppingBag className="w-4 h-4" />
                  Shop Full Look
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Bottoms & Footwear */}
          <div className="flex flex-row lg:flex-col gap-6 justify-center lg:justify-start order-3 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 no-scrollbar">
             {items.slice(Math.ceil(items.length / 2)).map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.id}`}
                className={`glass p-4 rounded-xl min-w-[120px] transition-all duration-300 hover:scale-105 ${
                  selectedItem === item.id ? "ring-1 ring-primary shadow-md" : "opacity-80 hover:opacity-100"
                }`}
              >
                <div className="aspect-square bg-secondary/50 rounded-lg overflow-hidden mb-3">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground line-clamp-1">{item.name}</p>
                <p className="text-xs mt-1">${item.price}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TryTheLook;

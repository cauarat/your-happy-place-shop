import { useMemo, useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import SortBar, { SortKey } from "@/components/SortBar";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/store";
import type { Product } from "@/data/products";
import ImmersiveAi from "@/components/ImmersiveAi";
import TryTheLook from "@/components/TryTheLook";

import { designers } from "@/data/products";

const Index = () => {
  const [category, setCategory] = useState<string>("All");
  const [designer, setDesigner] = useState<string>(() => {
    // Pick a random designer on initial load
    const randomIndex = Math.floor(Math.random() * designers.length);
    return designers[randomIndex];
  });
  const [sort, setSort] = useState<SortKey>("latest");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const filtered = useMemo(() => {
    let list = products.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (designer === "All" || p.designer === designer)
    );
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rated":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      default:
        list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [category, designer, sort, products]);

  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 py-8">
          {/* Left Sidebar */}
          <div className="lg:w-40 shrink-0">
            <Sidebar
              category={category}
              setCategory={setCategory}
              designer={designer}
              setDesigner={setDesigner}
            />
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="flex flex-col items-center justify-center py-8 border-b border-border mb-8">
              <h2 className="text-xl md:text-2xl font-bold tracking-tighter uppercase mb-1">
                {designer !== "All" ? designer : (category !== "All" ? t(category.toLowerCase()) : t('all_products'))}
              </h2>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-medium">
                {filtered.length} {filtered.length === 1 ? t('product') : t('products')}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <p className="text-[11px] uppercase tracking-[0.5em] text-muted-foreground text-center">
                  {t('no_products')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 lg:gap-x-4 gap-y-16">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>

          {/* Right Sort Bar */}
          <div className="lg:w-32 shrink-0">
            <SortBar sort={sort} setSort={setSort} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

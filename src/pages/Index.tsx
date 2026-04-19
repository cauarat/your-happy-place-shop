import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import SortBar, { SortKey } from "@/components/SortBar";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

const Index = () => {
  const [category, setCategory] = useState<string>("All");
  const [designer, setDesigner] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("latest");

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
  }, [category, designer, sort]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="text-center py-10 border-b border-border">
        <p className="text-sm tracking-[var(--tracking-wide)] uppercase">
          All Products <span className="text-muted-foreground ml-1">({filtered.length})</span>
        </p>
      </section>

      <main className="flex-1 px-8 lg:px-12 py-12">
        <div className="flex gap-12">
          <Sidebar
            category={category}
            setCategory={setCategory}
            designer={designer}
            setDesigner={setDesigner}
          />

          <div className="flex-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products match your selection.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>

          <SortBar sort={sort} setSort={setSort} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

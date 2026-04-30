import { useEffect, useState } from "react";
import { getProducts, updateProductsList } from "@/lib/store";
import type { Product } from "@/data/products";
import { ArrowUp, ArrowDown, Save } from "lucide-react";

const AdminCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newProducts = [...products];
    [newProducts[index - 1], newProducts[index]] = [newProducts[index], newProducts[index - 1]];
    setProducts(newProducts);
  };

  const moveDown = (index: number) => {
    if (index === products.length - 1) return;
    const newProducts = [...products];
    [newProducts[index + 1], newProducts[index]] = [newProducts[index], newProducts[index + 1]];
    setProducts(newProducts);
  };

  const handleSave = () => {
    updateProductsList(products);
    alert("Catalog order saved successfully.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl tracking-tight mb-2">Catalog Order</h1>
          <p className="text-muted-foreground">Adjust the order products appear on the homepage.</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-full uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" />
          Save Order
        </button>
      </div>

      <div className="glass rounded-xl overflow-hidden p-6 max-w-3xl">
        <div className="space-y-3">
          {products.map((product, index) => (
            <div key={product.id} className="flex items-center gap-4 p-4 border border-border bg-background rounded-lg hover:border-primary transition-colors">
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => moveUp(index)} 
                  disabled={index === 0}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => moveDown(index)} 
                  disabled={index === products.length - 1}
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
              
              <div className="w-12 h-12 bg-secondary rounded overflow-hidden flex-shrink-0">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1">
                <p className="font-medium text-sm">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category} • ${product.price}</p>
              </div>
              
              <div className="text-xs text-muted-foreground font-mono">
                #{index + 1}
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="text-center text-muted-foreground text-sm p-8">No products found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCatalog;

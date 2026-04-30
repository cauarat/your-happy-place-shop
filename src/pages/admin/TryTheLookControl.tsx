import { useEffect, useState } from "react";
import { getLooks, saveLook, getProducts, Look } from "@/lib/store";
import type { Product } from "@/data/products";
import { Save } from "lucide-react";

const AdminTryTheLook = () => {
  const [look, setLook] = useState<Look | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    const looks = getLooks();
    if (looks.length > 0) {
      setLook(looks[0]);
    }
    setAllProducts(getProducts());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (look) {
      saveLook(look);
      alert("Look updated successfully.");
    }
  };

  const toggleProduct = (productId: string) => {
    if (!look) return;
    const isSelected = look.productIds.includes(productId);
    let newIds = [...look.productIds];
    
    if (isSelected) {
      newIds = newIds.filter(id => id !== productId);
    } else {
      if (newIds.length >= 4) {
        alert("Maximum 4 products per look.");
        return;
      }
      newIds.push(productId);
    }
    setLook({ ...look, productIds: newIds });
  };

  if (!look) return <div className="p-8 text-center">Loading or no look found...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">Try The Look Control</h1>
        <p className="text-muted-foreground">Manage the curated outfit on the homepage.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6 glass p-8 rounded-2xl h-fit">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">Look Title</label>
            <input 
              type="text" 
              className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-primary transition-colors"
              value={look.name}
              onChange={(e) => setLook({ ...look, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">Model Image URL</label>
            <input 
              type="text" 
              className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-primary transition-colors"
              value={look.modelImage}
              onChange={(e) => setLook({ ...look, modelImage: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-4">
              Select Products (Max 4) ({look.productIds.length}/4 selected)
            </label>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 border border-border p-4 bg-background">
              {allProducts.map(product => {
                const isSelected = look.productIds.includes(product.id);
                return (
                  <div 
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 border-primary border" : "hover:bg-secondary border border-transparent"
                    }`}
                  >
                    <div className="w-8 h-8 bg-secondary rounded overflow-hidden flex-shrink-0">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm line-clamp-1 flex-1">{product.name}</p>
                    {isSelected && <span className="text-xs text-primary font-medium">Selected</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-primary text-primary-foreground px-8 py-3 rounded-full uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Save className="w-4 h-4" />
              Save Look
            </button>
          </div>
        </div>

        {/* Live Preview of Model Image */}
        <div>
           <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-6">Model Preview</h2>
           <div className="aspect-[3/4] w-full max-w-sm mx-auto overflow-hidden rounded-sm bg-secondary">
              <img
                src={look.modelImage}
                alt={look.name}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.src = "")}
              />
           </div>
        </div>
      </form>
    </div>
  );
};

export default AdminTryTheLook;

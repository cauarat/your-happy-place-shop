import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, deleteProduct, saveProduct, getCategories } from "@/lib/store";
import type { Product } from "@/data/products";
import { Edit2, Trash2, Copy, Plus, ExternalLink, Search, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const loadProducts = () => {
    setProducts(getProducts());
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = (id: string) => {
    toast("Are you sure?", {
      description: "This will permanently remove the product.",
      action: {
        label: "Delete",
        onClick: () => {
          deleteProduct(id);
          loadProducts();
          toast.success("Product deleted");
        },
      },
    });
  };

  /**
   * Save one product, reporting a storage failure instead of throwing into the
   * render. The list is only reloaded when the write actually landed, so a
   * rejected save no longer redraws as though it had succeeded.
   */
  const persist = (product: Product): boolean => {
    try {
      saveProduct(product);
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      toast.error(
        error instanceof Error ? error.message : "This change could not be saved.",
        { duration: 10000 }
      );
      return false;
    }
  };

  const handleDuplicate = (product: Product) => {
    const duplicated: Product = {
      ...product,
      id: Date.now().toString(),
      name: `${product.name} (Copy)`,
    };
    if (persist(duplicated)) loadProducts();
  };

  const handleCategoryCycle = (product: Product, direction: 'prev' | 'next') => {
    const categories = getCategories();
    const currentIndex = categories.indexOf(product.category);
    let nextIndex = 0;
    
    if (currentIndex === -1) {
      nextIndex = 0;
    } else if (direction === 'prev') {
      nextIndex = currentIndex <= 0 ? categories.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex === categories.length - 1 ? 0 : currentIndex + 1;
    }

    const updatedProduct = { ...product, category: categories[nextIndex] };
    if (persist(updatedProduct)) loadProducts();
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;

    // Split search query into lowercase keywords
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0);

    return products.filter(p => {
      // Create a searchable string containing all relevant product metadata
      const searchableText = `${p.name} ${p.designer} ${p.category}`.toLowerCase();
      
      // Product must match ALL keywords
      return keywords.every(keyword => searchableText.includes(keyword));
    });
  }, [products, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl tracking-tight mb-2">Products</h1>
          <p className="text-muted-foreground">Manage your catalog.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", url);
              downloadAnchorNode.setAttribute("download", "villaoro_catalog.json");
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              document.body.removeChild(downloadAnchorNode);
              setTimeout(() => URL.revokeObjectURL(url), 100);
            }}
            className="border border-border px-6 py-3 rounded-full uppercase text-xs tracking-wider hover:bg-secondary transition-colors"
          >
            Export Catalog
          </button>
          <Link 
            to="/admin/products/new" 
            className="bg-primary text-primary-foreground px-6 py-3 rounded-full uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative group max-w-3xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[24px] blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50" />
          <div className="relative">
            <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-pulse" />
            <input 
              type="text"
              placeholder="Search for 'black prada bags' or 'winter jackets'..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-2xl border border-white/60 dark:border-white/20 rounded-[24px] text-base focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all shadow-lg font-medium text-foreground placeholder:text-muted-foreground/70"
            />
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-2xl rounded-[32px] p-2 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/5">
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Product</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium text-center">Allow Qty</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Category</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Price</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <td className="p-4 rounded-l-[24px]">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white dark:bg-black/50 rounded-[16px] overflow-hidden flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                        {product.productLinks && product.productLinks.filter(l => l.trim()).length > 0 && (
                          <div className="flex gap-1">
                            {product.productLinks.filter(l => l.trim()).map((link, idx) => (
                              <a 
                                key={idx}
                                href={link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:scale-110 transition-transform"
                                onClick={(e) => e.stopPropagation()}
                                title={`Reference Link ${idx + 1}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{product.designer}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...product, allowQuantity: product.allowQuantity === false ? true : false };
                      if (persist(updated)) loadProducts();
                    }}
                    className={`w-10 h-5 rounded-full transition-all relative inline-flex items-center ${product.allowQuantity !== false ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]' : 'bg-border'}`}
                    title={product.allowQuantity !== false ? "Quantity Selection Enabled" : "Quantity Selection Disabled"}
                  >
                    <span className={`inline-block w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${product.allowQuantity !== false ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                  </button>
                </td>
                <td className="p-4 text-sm">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-black/50 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-full hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm">
                    <button 
                      onClick={() => handleCategoryCycle(product, 'prev')}
                      className="text-muted-foreground hover:text-black transition-colors"
                      title="Previous Category"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="min-w-[80px] text-center font-medium text-[11px] uppercase tracking-widest text-black select-none">
                      {product.category}
                    </span>
                    <button 
                      onClick={() => handleCategoryCycle(product, 'next')}
                      className="text-muted-foreground hover:text-black transition-colors"
                      title="Next Category"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="p-4 text-sm">${product.price}</td>
                <td className="p-4 rounded-r-[24px]">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDuplicate(product)}
                      className="p-2 text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => navigate(`/admin/products/${product.id}`)}
                      className="p-2 text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;

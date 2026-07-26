import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, deleteProduct, saveProduct, getCategories } from "@/lib/store";
import type { Product } from "@/data/products";
import { Edit2, Trash2, Copy, Plus, ExternalLink, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  const handleDuplicate = (product: Product) => {
    const duplicated: Product = {
      ...product,
      id: Date.now().toString(),
      name: `${product.name} (Copy)`,
    };
    saveProduct(duplicated);
    loadProducts();
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
    saveProduct(updatedProduct);
    loadProducts();
  };

  // Derive unique tags from products (categories and designers)
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => {
      if (p.category) tags.add(p.category);
      if (p.designer) tags.add(p.designer);
    });
    return Array.from(tags).sort();
  }, [products]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = searchQuery === "" || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.designer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.includes(p.category) ||
        selectedTags.includes(p.designer);

      return matchesSearch && matchesTags;
    });
  }, [products, searchQuery, selectedTags]);

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

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search products by name, designer, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all"
          />
        </div>
        
        {availableTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  selectedTags.includes(tag) 
                    ? "bg-black text-white border border-black" 
                    : "bg-secondary border border-border text-foreground hover:border-black"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Product</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium text-center">Allow Qty</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Category</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Price</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-secondary/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
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
                      saveProduct(updated);
                      loadProducts();
                    }}
                    className={`w-10 h-5 rounded-full transition-all relative inline-flex items-center ${product.allowQuantity !== false ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]' : 'bg-border'}`}
                    title={product.allowQuantity !== false ? "Quantity Selection Enabled" : "Quantity Selection Disabled"}
                  >
                    <span className={`inline-block w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${product.allowQuantity !== false ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="p-4 text-sm">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e5e5] rounded-full hover:border-[#d0d0d0] transition-colors shadow-sm">
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
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleDuplicate(product)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => navigate(`/admin/products/${product.id}`)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
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

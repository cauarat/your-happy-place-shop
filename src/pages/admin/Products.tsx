import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, deleteProduct, saveProduct } from "@/lib/store";
import type { Product } from "@/data/products";
import { Edit2, Trash2, Copy, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
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

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Product</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Category</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium">Price</th>
              <th className="p-4 text-xs uppercase tracking-wide text-muted-foreground font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
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
                <td className="p-4 text-sm">{product.category}</td>
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
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
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

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, deleteProduct, saveProduct } from "@/lib/store";
import type { Product } from "@/data/products";
import { Edit2, Trash2, Copy, Plus } from "lucide-react";

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
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteProduct(id);
      loadProducts();
    }
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
        <Link 
          to="/admin/products/new" 
          className="bg-primary text-primary-foreground px-6 py-3 rounded-full uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
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
                      <p className="font-medium text-sm line-clamp-1">{product.name}</p>
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

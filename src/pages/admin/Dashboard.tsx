import { useEffect, useState } from "react";
import { getProducts, getLooks } from "@/lib/store";
import { Link, useNavigate } from "react-router-dom";
import { Package, Paintbrush, Sparkles } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleTestOnboarding = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('villaoro_onboarding_done');
    localStorage.removeItem('villaoro_user_name');
    localStorage.removeItem('villaoro_user_email');
    localStorage.removeItem('villaoro_user_gender');
    localStorage.removeItem('villaoro_user_category');
    localStorage.removeItem('villaoro_user_brands');
    navigate('/onboarding');
  };
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeLooks: 0,
  });

  useEffect(() => {
    setStats({
      totalProducts: getProducts().length,
      activeLooks: getLooks().length,
    });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your Villaoro store.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl">
          <p className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Total Products</p>
          <p className="text-4xl font-light">{stats.totalProducts}</p>
        </div>
        <div className="glass p-6 rounded-xl">
          <p className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Active Looks</p>
          <p className="text-4xl font-light">{stats.activeLooks}</p>
        </div>
        <div className="glass p-6 rounded-xl">
          <p className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Recent Edits</p>
          <p className="text-4xl font-light">0</p>
        </div>
      </div>

      <div className="pt-8 border-t border-border">
        <h2 className="text-xl mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/products" className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary transition-colors group">
            <div className="p-3 bg-secondary rounded-lg group-hover:bg-background">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">Add Product</p>
              <p className="text-xs text-muted-foreground mt-1">Create new inventory</p>
            </div>
          </Link>

          <Link to="/admin/catalog" className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary transition-colors group">
            <div className="p-3 bg-secondary rounded-lg group-hover:bg-background">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">Edit Catalog</p>
              <p className="text-xs text-muted-foreground mt-1">Reorder products</p>
            </div>
          </Link>

          <Link to="/admin/design" className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary transition-colors group">
            <div className="p-3 bg-secondary rounded-lg group-hover:bg-background">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">Customize Design</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust UI & styling</p>
            </div>
          </Link>

          <button onClick={handleTestOnboarding} className="flex items-center text-left gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary transition-colors group">
            <div className="p-3 bg-secondary rounded-lg group-hover:bg-background">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">Test Onboarding</p>
              <p className="text-xs text-muted-foreground mt-1">Preview user flow</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

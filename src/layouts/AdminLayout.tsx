import { useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Package, Settings, Bot, Sparkles, Home, Tag, Users, ShoppingCart, MessageSquare } from "lucide-react";
import { useMusicPlayer } from "@/contexts/MusicContext";
import { VinylButton } from "@/components/BackgroundMusic";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { label: "Products", path: "/admin/products", icon: Package },
  { label: "Settings", path: "/admin/design", icon: Settings },
  { label: "AI Stylist", path: "/admin/ai", icon: Bot },
  { label: "Catalog Structure", path: "/admin/catalog", icon: Tag },
  { label: "Community Looks", path: "/admin/looks", icon: Users },
  { label: "Try The Look", path: "/admin/try-the-look", icon: Sparkles },
  { label: "Feedback & Requests", path: "/admin/suggestions", icon: MessageSquare },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPlaying, isVisible, togglePlay } = useMusicPlayer();

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="text-xl font-display uppercase tracking-wider block text-center">
            Villaoro<span className="text-muted-foreground ml-2 text-sm lowercase">admin</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border flex items-center gap-2">
          <Link 
            to="/"
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            Storefront
          </Link>
          <div className="shrink-0 flex items-center justify-center w-10">
            <VinylButton isPlaying={isPlaying} isVisible={isVisible} onToggle={togglePlay} />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

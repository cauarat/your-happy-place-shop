import { useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Package, Settings, Bot, Sparkles, Home, Tag, Users, ShoppingCart, MessageSquare, Eraser, LogOut } from "lucide-react";
import { useMusicPlayer } from "@/contexts/MusicContext";
import { useAuth } from "@/contexts/AuthContext";
import { signOutAdmin } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { label: "Products", path: "/admin/products", icon: Package },
  { label: "Image Studio", path: "/admin/studio", icon: Eraser },
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
  const { isPlaying, togglePlay } = useMusicPlayer();
  const { user } = useAuth();
  const hasPausedRef = useRef(false);

  const handleSignOut = async () => {
    await signOutAdmin();
    navigate("/admin/login", { replace: true });
  };

  // Disable music when entering the admin page
  useEffect(() => {
    if (isPlaying && !hasPausedRef.current) {
      togglePlay();
      hasPausedRef.current = true;
    }
  }, [isPlaying, togglePlay]);

  return (
    <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-black/95">
      <aside className="w-[280px] bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-2xl border-r border-white/40 dark:border-white/10 flex flex-col relative z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-medium transition-all duration-300 mx-2 ${
                  isActive 
                    ? "bg-black text-white shadow-md dark:bg-white dark:text-black scale-[0.98]" 
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          {user?.email && (
            <p className="px-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">
              {user.email}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Link 
              to="/"
              className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-[14px] text-sm font-medium text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors mx-2"
            >
              <Home className="w-4 h-4" />
              Storefront
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="p-3 rounded-[14px] text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors mr-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
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

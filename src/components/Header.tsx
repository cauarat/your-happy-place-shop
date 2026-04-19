import { ShoppingBag, Search } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-background border-b border-border">
      <div className="grid grid-cols-3 items-center px-8 lg:px-12 h-20">
        <a href="/" className="text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Vilaoro
        </a>
        <nav className="flex items-center justify-center gap-12">
          <a href="#" className="nav-link">Home</a>
          <a href="#" className="nav-link">Shop</a>
          <a href="#" className="nav-link">Accessories</a>
        </nav>
        <div className="flex items-center justify-end gap-6">
          <button aria-label="Search" className="hover:text-accent transition-colors">
            <Search className="h-5 w-5" strokeWidth={1.25} />
          </button>
          <button aria-label="Cart" className="relative hover:text-accent transition-colors">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.25} />
            <span className="absolute -top-1 -right-2 text-[10px]">0</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

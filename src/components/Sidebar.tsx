import { categories, designers } from "@/data/products";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shirt, Footprints, ShoppingBag, Glasses, Gem } from "lucide-react";

interface SidebarProps {
  category: string;
  setCategory: (c: string) => void;
  designer: string;
  setDesigner: (d: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "Clothing": <Shirt className="w-4 h-4" />,
  "Footwear": <Footprints className="w-4 h-4" />,
  "Bags": <ShoppingBag className="w-4 h-4" />,
  "Accessories": <Glasses className="w-4 h-4" />,
  "Jewelry": <Gem className="w-4 h-4" />,
};

const Sidebar = ({ category, setCategory, designer, setDesigner }: SidebarProps) => {
  const { t } = useLanguage();

  return (
    <aside className="w-40 shrink-0 space-y-8">
      <div>
        <p className="text-[9px] uppercase font-bold tracking-[0.1em] mb-4 text-left border-b border-border pb-2">{t('categories')}</p>
        <ul className="space-y-1.5">
          {categories.map((c) => (
            <li key={c}>
              <button
                onClick={() => setCategory(category === c ? "All" : c)}
                className={`text-[10px] uppercase tracking-tight transition-colors text-left w-full block ${
                  category === c ? "text-black font-bold" : "text-muted-foreground hover:text-black"
                }`}
              >
                {t(c.toLowerCase())}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[9px] uppercase font-bold tracking-[0.1em] mb-4 text-left border-b border-border pb-2">{t('designers')}</p>
        <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto no-scrollbar">
          {designers.map((d) => (
            <li key={d}>
              <button
                onClick={() => setDesigner(designer === d ? "All" : d)}
                className={`text-[10px] uppercase tracking-tight transition-colors text-left w-full block ${
                  designer === d ? "text-black font-bold" : "text-muted-foreground hover:text-black"
                }`}
              >
                {d}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;

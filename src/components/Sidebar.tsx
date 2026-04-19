import { categories, designers } from "@/data/products";

interface SidebarProps {
  category: string;
  setCategory: (c: string) => void;
  designer: string;
  setDesigner: (d: string) => void;
}

const Sidebar = ({ category, setCategory, designer, setDesigner }: SidebarProps) => {
  return (
    <aside className="w-48 shrink-0 space-y-10">
      <div>
        <p className="eyebrow mb-5">Categories</p>
        <ul className="space-y-3">
          {categories.map((c) => (
            <li key={c}>
              <button
                onClick={() => setCategory(c)}
                className={`text-sm transition-colors ${
                  category === c ? "underline underline-offset-4" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="eyebrow mb-5">Designers</p>
        <ul className="space-y-3">
          {designers.map((d) => (
            <li key={d}>
              <button
                onClick={() => setDesigner(d)}
                className={`text-sm transition-colors ${
                  designer === d ? "underline underline-offset-4" : "text-muted-foreground hover:text-foreground"
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

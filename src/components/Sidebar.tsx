import { useEffect, useState } from "react";
import { getCategories, getDesigners } from "@/lib/store";
import { useLanguage } from "@/contexts/LanguageContext";

interface SidebarProps {
  category: string;
  setCategory: (c: string) => void;
  designer: string;
  setDesigner: (d: string) => void;
  showTitle?: boolean;
  highlightedDesigners?: Set<string> | null;
  highlightedCategories?: Set<string> | null;
}

const Sidebar = ({ category, setCategory, designer, setDesigner, showTitle = true, highlightedDesigners, highlightedCategories }: SidebarProps) => {
  const { t } = useLanguage();
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [dynamicDesigners, setDynamicDesigners] = useState<string[]>([]);

  useEffect(() => {
    setDynamicCategories(getCategories());
    setDynamicDesigners(getDesigners());
  }, []);

  const [designerSearch, setDesignerSearch] = useState("");

  const filteredDesigners = dynamicDesigners.filter(d => 
    d.toLowerCase().includes(designerSearch.toLowerCase())
  );

  return (
    <aside className="space-y-12">
      {/* Categories */}
      <div>
        {showTitle && (
          <p className="text-[10px] lowercase font-bold tracking-[0.2em] mb-4 text-black border-b border-black pb-1 inline-block">
            {t('categories')}
          </p>
        )}
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setCategory("All")}
              className={`text-[11px] tracking-tight transition-colors text-left ${
                !highlightedCategories
                  ? (category === "All" ? "text-black font-bold" : "text-[#999] hover:text-black")
                  : "text-[#ccc]"
              }`}
            >
              All
            </button>
          </li>
          {dynamicCategories.map((c) => (
            <li key={c}>
              <button
                onClick={() => setCategory(category === c ? "All" : c)}
                className={`text-[11px] tracking-tight transition-colors text-left ${
                  highlightedCategories 
                    ? (highlightedCategories.has(c) ? "text-black font-bold" : "text-[#ccc]")
                    : (category === c ? "text-black font-bold" : "text-[#999] hover:text-black")
                }`}
              >
                {t(c.toLowerCase()) === c.toLowerCase() ? c : t(c.toLowerCase())}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Designers */}
      <div>
        <p className="text-[10px] lowercase font-bold tracking-[0.2em] mb-4 text-black border-b border-black pb-1 inline-block">
          {t('designers')}
        </p>
        
        {dynamicDesigners.length > 10 && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search designer"
              value={designerSearch}
              onChange={(e) => setDesignerSearch(e.target.value)}
              className="w-full bg-transparent border-b border-border py-1 text-[10px] tracking-wider outline-none focus:border-black transition-colors placeholder:text-[#ccc]"
            />
          </div>
        )}

        <ul className="space-y-1 mt-2">
          <li>
            <button
              onClick={() => setDesigner("All")}
              className={`text-[11px] tracking-tight transition-colors text-left ${
                !highlightedDesigners
                  ? (designer === "All" ? "text-black font-bold" : "text-[#999] hover:text-black")
                  : "text-[#ccc]"
              }`}
            >
              All designers
            </button>
          </li>
          {filteredDesigners.map((d) => (
            <li key={d}>
              <button
                onClick={() => setDesigner(designer === d ? "All" : d)}
                className={`text-[11px] tracking-tight transition-colors text-left ${
                  highlightedDesigners
                    ? (highlightedDesigners.has(d) ? "text-black font-bold" : "text-[#ccc]")
                    : (designer === d ? "text-black font-bold" : "text-[#999] hover:text-black")
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

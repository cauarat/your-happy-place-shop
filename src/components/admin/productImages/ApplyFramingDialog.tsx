import { useMemo, useState } from "react";
import { X, Search, Check } from "lucide-react";
import type { Product } from "@/data/products";
import { computeCropStyles, aspectFor, aspectClassFor } from "@/lib/cropUtils";
import type { CropClipboard } from "@/lib/cropClipboard";

interface Props {
  clipboard: CropClipboard;
  products: Product[];
  /** Excluded from the list: it is the one the framing came from. */
  currentId: string;
  onApply: (ids: string[], everyImage: boolean) => void;
  onClose: () => void;
}

/**
 * Push one framing onto many products.
 *
 * Filtering and "select all" are the point rather than a convenience: the
 * catalogue is 800+ products of largely the same shape, and the reason to copy
 * a framing at all is that it should hold for a whole category at once.
 * Selection is kept as ids, so narrowing the filter afterwards cannot quietly
 * drop products the user already ticked.
 */
export function ApplyFramingDialog({ clipboard, products, currentId, onApply, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [everyImage, setEveryImage] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.id !== currentId &&
        (category === "all" || p.category === category) &&
        (q === "" || p.name.toLowerCase().includes(q)),
    );
  }, [products, currentId, category, query]);

  const visibleIds = visible.map((p) => p.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-10">
      <div className="bg-background rounded-[28px] w-full max-w-4xl max-h-full flex flex-col overflow-hidden border border-border">
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className={`relative w-16 ${aspectClassFor(undefined)} rounded-lg overflow-hidden bg-[#f5f5f5] border border-border shrink-0`}>
              <img
                src={clipboard.sourceImage}
                alt=""
                style={computeCropStyles(4 / 5, aspectFor(undefined), clipboard.crop)}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium">Apply this framing</h3>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                From {clipboard.sourceName} · {clipboard.crop.x}% / {clipboard.crop.y}% · {clipboard.crop.zoom.toFixed(1)}x
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2.5 rounded-full border border-border bg-transparent text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2.5 rounded-full border border-border bg-transparent text-sm focus:outline-none focus:border-primary"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={visibleIds.length === 0}
              className="text-[10px] uppercase tracking-widest text-primary hover:opacity-70 disabled:opacity-40"
            >
              {allVisibleSelected ? "Clear these" : `Select these ${visibleIds.length}`}
            </button>
            <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={everyImage}
                onChange={(e) => setEveryImage(e.target.checked)}
                className="accent-primary"
              />
              Every photo, not just #{clipboard.index + 1}
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {visible.length === 0 ? (
            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground py-12">
              Nothing matches
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {visible.map((p) => {
                const on = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      on ? "border-primary" : "border-border hover:border-primary/40"
                    }`}
                    title={p.name}
                  >
                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                    {on && (
                      <span className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white drop-shadow" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 p-6 border-t border-border">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-border text-[10px] uppercase tracking-widest hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => onApply(Array.from(selected), everyImage)}
              className="px-6 py-2.5 rounded-full bg-primary text-white text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Apply to {selected.size || ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useMemo } from "react";
import {
  ChevronRight,
  Footprints,
  Glasses,
  Heart,
  Menu,
  Mic,
  Shirt,
  SlidersHorizontal,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { BagIcon, CapIcon, JacketIcon } from "@/components/Icons";

// A non-interactive rendering of the catalogue's home screen, shown inside the
// device frame during onboarding so someone can see what they're being let into
// before they hand over a name and an email. It reuses the real ProductCard
// with real catalogue data — a screenshot would go stale the moment the grid
// or the stock changed.
const PREVIEW_BRAND = "Rimowa";

const dockCategories = [
  { icon: Footprints, key: "footwear" },
  { icon: Shirt, key: "t-shirt" },
  { icon: Glasses, key: "accessories" },
  { icon: BagIcon, key: "bags" },
  { icon: CapIcon, key: "caps" },
  { icon: JacketIcon, key: "jackets" },
];

const CatalogPreview = () => {
  const { t } = useLanguage();
  const { firstName } = useOnboarding();

  // Read from the live catalogue rather than a second copy compiled into the
  // bundle: the store holds the same pieces, and importing the static array
  // here was what kept a duplicate 672-product catalogue in the JavaScript
  // every visitor downloads and builds in memory.
  const brandPieces = useMemo(
    () => getProducts().filter((p) => p.designer === PREVIEW_BRAND),
    []
  );
  const brandProducts = useMemo(() => brandPieces.slice(0, 4), [brandPieces]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const key =
      hour >= 5 && hour < 12
        ? "greeting_morning"
        : hour >= 12 && hour < 18
        ? "greeting_afternoon"
        : "greeting_evening";
    // The name isn't collected until a later step, so drop the placeholder
    // rather than greeting an empty string.
    return t(key).replace("{name}", firstName.trim()).replace(/\s+([!¡]?)$/, "$1");
  }, [t, firstName]);

  // Everything in here is decoration: no tab stops, no clicks, no navigation
  // out of the onboarding flow. `inert` covers the keyboard, pointer-events
  // covers browsers that don't support it yet.
  const makeInert = useCallback((el: HTMLDivElement | null) => {
    if (el) el.inert = true;
  }, []);

  return (
    <div
      ref={makeInert}
      aria-hidden
      className="relative w-full h-full overflow-hidden bg-white select-none pointer-events-none"
    >
      {/* Top bar */}
      <div className="flex items-center justify-end gap-4 px-5 pt-4">
        <div className="relative">
          <Heart className="w-[18px] h-[18px] text-black" strokeWidth={1.75} />
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold">
            13
          </span>
        </div>
        <Menu className="w-[18px] h-[18px] text-black" strokeWidth={2} />
      </div>

      {/* Greeting */}
      <div className="flex justify-center px-6 pt-1">
        <span className="text-[15px] sm:text-[19px] font-semibold tracking-tighter text-black/90">
          {greeting}
        </span>
        <span className="text-[15px] sm:text-[19px] font-light text-black/40 ml-0.5">|</span>
      </div>

      {/* Search */}
      <div className="px-5 sm:px-10 pt-3">
        <div className="flex items-center justify-between gap-3 h-9 sm:h-11 pl-4 pr-1 rounded-full border border-zinc-200/90 bg-white shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
          <span className="text-[12px] sm:text-[13px] text-zinc-400 font-light">
            {t("search")}...
          </span>
          <span className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black">
            <Mic className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={2} />
          </span>
        </div>
      </div>

      {/* Filter label */}
      <div className="flex items-center justify-center gap-1 pt-3">
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase text-black">
          {t("all_products")}
        </span>
        <ChevronRight className="w-3 h-3 text-black/60" strokeWidth={2.5} />
      </div>

      {/* Brand heading */}
      <div className="flex flex-col items-center gap-1 pt-2 pb-3">
        <span className="text-[1.15rem] sm:text-[1.7rem] font-black uppercase leading-none tracking-tight text-black">
          {PREVIEW_BRAND}
        </span>
        <span className="text-[9px] sm:text-[10px] font-semibold tracking-widest text-[#888]">
          ({brandPieces.length})
        </span>
      </div>

      {/* Product grid — the real card component, real products */}
      <div className="grid grid-cols-4 gap-x-2 sm:gap-x-4 px-3 sm:px-6">
        {brandProducts.map((product, index) => (
          // Offset index: ProductCard loads its first eight images eagerly and
          // the first four at high priority, which this preview — mounted
          // below the fold on the very first screen — has no business doing.
          // It also keeps the app tour's anchor off a decorative card.
          <ProductCard key={product.id} product={product} index={index + 8} />
        ))}
      </div>

      {/* Dock, floating over the grid exactly as it does in the app */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center px-3">
        <div
          className="flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(30px) saturate(180%)",
            WebkitBackdropFilter: "blur(30px) saturate(180%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.10), inset 0 0 0 1px rgba(255,255,255,0.6)",
          }}
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black shrink-0">
            <SlidersHorizontal className="w-[14px] h-[14px] text-white" strokeWidth={2} />
          </span>
          {dockCategories.map(({ icon: Icon, key }) => (
            <span
              key={key}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-full text-[#4a4a4d]"
            >
              <Icon className="w-[15px] h-[15px]" />
              <span className="text-[8px] font-medium leading-none">{t(key)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CatalogPreview;

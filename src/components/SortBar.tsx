import { useLanguage } from "@/contexts/LanguageContext";

export type SortKey = "latest" | "price-asc" | "price-desc" | "rated";

const SortBar = ({ sort, setSort }: { sort: SortKey; setSort: (s: SortKey) => void }) => {
  const { t } = useLanguage();

  const options: { key: SortKey; label: string }[] = [
    { key: "latest", label: t('latest') },
    { key: "price-asc", label: t('price_asc') },
    { key: "price-desc", label: t('price_desc') },
    { key: "rated", label: t('rated') },
  ];

  return (
    <aside className="w-32 shrink-0">
      <p className="text-[9px] uppercase font-bold tracking-[0.1em] mb-4 text-left border-b border-border pb-2">{t('sort')}</p>
      <ul className="space-y-1.5">
        {options.map((o) => (
          <li key={o.key}>
            <button
              onClick={() => setSort(o.key)}
              className={`text-[10px] uppercase tracking-tight transition-colors text-left w-full block ${
                sort === o.key ? "text-black font-bold" : "text-muted-foreground hover:text-black"
              }`}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default SortBar;

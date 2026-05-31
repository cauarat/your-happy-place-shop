import { useLanguage } from "@/contexts/LanguageContext";

export type SortKey = "latest" | "price-asc" | "price-desc" | "rated";

const SortBar = ({ sort, setSort, showTitle = true }: { sort: SortKey; setSort: (s: SortKey) => void; showTitle?: boolean }) => {
  const { t } = useLanguage();

  const options: { key: SortKey; label: string }[] = [
    { key: "latest", label: t('latest') },
    { key: "price-asc", label: t('price_asc') },
    { key: "price-desc", label: t('price_desc') },
    { key: "rated", label: t('rated') },
  ];

  return (
    <aside>
      {showTitle && (
        <p className="text-[10px] lowercase font-bold tracking-[0.2em] mb-4 text-black border-b border-black pb-1 inline-block">
          {t('sort')}
        </p>
      )}
      <ul className="space-y-1.5">
        {options.map((o) => (
          <li key={o.key}>
            <button
              onClick={() => setSort(o.key)}
              className={`text-[11px] tracking-wide transition-colors text-left whitespace-nowrap pb-0.5 border-b ${
                sort === o.key ? "text-black font-medium border-black" : "text-[#888] hover:text-black border-transparent"
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

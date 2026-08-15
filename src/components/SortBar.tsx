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
      {showTitle && <p className="eyebrow mb-4">{t('sort')}</p>}
      {/* The selected option is marked by a rule under it rather than by
          weight — swapping font-weight on selection shifts the width of every
          label and makes the whole list twitch as you move between them. */}
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o.key}>
            <button
              onClick={() => setSort(o.key)}
              aria-pressed={sort === o.key}
              className={`type-label whitespace-nowrap border-b-hairline pb-1 text-left transition-colors duration-base ease-sine ${
                sort === o.key
                  ? "border-ink text-ink"
                  : "border-transparent text-ink/45 hover:text-ink"
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

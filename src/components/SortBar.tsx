export type SortKey = "latest" | "price-asc" | "price-desc" | "rated";

const options: { key: SortKey; label: string }[] = [
  { key: "latest", label: "Latest Arrivals" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "rated", label: "Top Rated" },
];

const SortBar = ({ sort, setSort }: { sort: SortKey; setSort: (s: SortKey) => void }) => {
  return (
    <aside className="w-48 shrink-0">
      <p className="eyebrow mb-5">Sort</p>
      <ul className="space-y-3">
        {options.map((o) => (
          <li key={o.key}>
            <button
              onClick={() => setSort(o.key)}
              className={`text-sm transition-colors ${
                sort === o.key ? "underline underline-offset-4" : "text-muted-foreground hover:text-foreground"
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

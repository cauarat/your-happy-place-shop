import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eraser,
  Loader2,
  Pause,
  Play,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getProducts, saveProductsBulk } from "@/lib/store";
import type { Product } from "@/data/products";
import { checkUploadAccess, uploadToR2 } from "@/utils/cloudflareUpload";
import type { BackgroundReport, StudioResult, Strategy } from "@/lib/imageStudio";
import CutoutPreview from "@/components/admin/CutoutPreview";

const SCORE_CACHE_KEY = "villaoro_studio_scores";
/** Border colours only change when a photo changes, so they are worth keeping. */
type ScoreCache = Record<string, BackgroundReport>;

type ItemState = "todo" | "working" | "pending" | "accepted" | "skipped" | "failed";

interface Item {
  product: Product;
  score?: BackgroundReport;
  state: ItemState;
  result?: StudioResult;
  error?: string;
}

function readCache(): ScoreCache {
  try {
    return JSON.parse(localStorage.getItem(SCORE_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: ScoreCache) {
  try {
    localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // A full cache is a cache, not an error. Losing it only costs a rescan.
  }
}

/** The product as it looks once its photo has been replaced by the cut-out. */
function withCutout(product: Product, url: string): Product {
  return {
    ...product,
    image: url,
    images: (product.images || []).map((img) => (img === product.image ? url : img)),
    originalImage: product.originalImage || product.image,
    removeBackground: true,
  };
}

/** Run `worker` over `items`, `limit` at a time, in order of completion. */
async function pool<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

const AdminStudio = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [phase, setPhase] = useState<"idle" | "scanning" | "running">("idle");
  const [scanned, setScanned] = useState(0);
  const [done, setDone] = useState(0);
  const [autoAccept, setAutoAccept] = useState(true);
  const [strategy, setStrategy] = useState<Strategy>("auto");
  // How far from #FFFFFF a background has to be before it is worth touching.
  // Left adjustable rather than fixed because the honest answer depends on the
  // eye: across a sample of 59 products, half sit under 5 (invisible), a
  // quarter between 5 and 12 (only visible against pure white), and the rest
  // read as a grey rectangle on the tile. The count updates as it moves, so
  // the choice is made against the real catalogue rather than a guess.
  const [threshold, setThreshold] = useState(12);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [eta, setEta] = useState("");

  // Read by the loop between items so Pause takes effect immediately, without
  // the loop having to be torn down and rebuilt from state.
  const pausedRef = useRef(false);

  // Asked once, of the server, before offering to run anything. Whether this
  // account may write to the bucket is not something the browser can know on
  // its own any more — which is the point.
  const [access, setAccess] = useState<{ ok: boolean; reason?: string } | null>(null);
  useEffect(() => {
    checkUploadAccess().then(setAccess);
  }, []);
  const configured = access?.ok === true;

  useEffect(() => {
    const cache = readCache();
    setItems(
      getProducts()
        .filter((p) => p.image && /^https?:/.test(p.image))
        .map((product) => ({
          product,
          score: cache[product.image],
          state: "todo" as ItemState,
        }))
    );
  }, []);

  // `todo` and `failed` are the only states a run can still act on. A failed
  // photo is worth another attempt; `accepted` and `skipped` have been decided;
  // `pending` already has a result waiting under Awaiting review, and requeueing
  // it would silently throw away the cut-out you were about to look at.
  const needsWork = useCallback(
    (item: Item) =>
      item.score !== undefined &&
      item.score.distanceFromWhite > threshold &&
      (item.state === "todo" || item.state === "failed"),
    [threshold]
  );

  const stats = useMemo(
    () => ({
      total: items.length,
      scored: items.filter((i) => i.score).length,
      // Counted with the predicate the queue is built from, so the number on the
      // button is what the run will actually process — and falls as it does.
      // Counting every scored photo over the threshold instead left it frozen at
      // its starting value, and pressing it then reported "0 photos cleaned".
      dirty: items.filter(needsWork).length,
      accepted: items.filter((i) => i.state === "accepted").length,
      pending: items.filter((i) => i.state === "pending").length,
      failed: items.filter((i) => i.state === "failed").length,
    }),
    [items, needsWork]
  );

  /** Measure every photo's background without touching any of them. */
  const scan = async () => {
    setPhase("scanning");
    setScanned(0);
    const cache = readCache();
    const { scoreBackground } = await import("@/lib/imageStudio");

    let completed = 0;
    await pool(items, 6, async (item) => {
      if (!cache[item.product.image]) {
        try {
          cache[item.product.image] = await scoreBackground(item.product.image);
        } catch {
          // An image that will not load cannot be processed either; it simply
          // stays unscored and out of the run.
        }
      }
      const score = cache[item.product.image];
      completed++;
      setScanned(completed);
      if (score) {
        setItems((prev) =>
          prev.map((i) => (i.product.id === item.product.id ? { ...i, score } : i))
        );
      }
    });

    writeCache(cache);
    setPhase("idle");
    toast.success(`Scanned ${completed} photos.`);
  };

  /** Cut out everything that needs it, uploading clean results as they land. */
  const run = async () => {
    if (!configured) return;
    setPhase("running");
    pausedRef.current = false;
    setDone(0);

    const { processImage } = await import("@/lib/imageStudio");
    const queue = items.filter(needsWork);
    const saved: Product[] = [];
    const started = Date.now();
    let completed = 0;
    let written = 0;

    // Saving each product on its own re-serialises the whole catalogue every
    // time; saving only at the end loses the entire run if the tab goes away —
    // and it goes away having already uploaded the images, so the bucket fills
    // with objects nothing points at. Ten bounds the loss without the churn.
    const FLUSH_EVERY = 10;
    const flush = () => {
      if (saved.length === written) return;
      try {
        saveProductsBulk(saved.slice(written));
        written = saved.length;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save.");
      }
    };

    for (const item of queue) {
      if (pausedRef.current) break;
      setItems((prev) =>
        prev.map((i) => (i.product.id === item.product.id ? { ...i, state: "working" } : i))
      );

      const fail = (message: string) =>
        setItems((prev) =>
          prev.map((i) =>
            i.product.id === item.product.id ? { ...i, state: "failed", error: message } : i
          )
        );

      // The two awaits are kept apart because they fail for unrelated reasons,
      // and the right response to each is the opposite of the other's.
      let result: StudioResult;
      try {
        result = await processImage(item.product.image, { strategy });
      } catch (error) {
        // One photo that will not decode says nothing about the next one.
        fail(error instanceof Error ? error.message : "Could not process this photo.");
        completed++;
        setDone(completed);
        continue;
      }

      if (result.quality.verdict === "ok" && autoAccept) {
        try {
          const url = await uploadToR2(result.dataUrl, result.extension, { strict: true });
          const updated = withCutout(item.product, url);
          saved.push(updated);
          setItems((prev) =>
            prev.map((i) =>
              i.product.id === item.product.id
                ? { ...i, state: "accepted", product: updated, result: undefined }
                : i
            )
          );
          if (saved.length - written >= FLUSH_EVERY) flush();
        } catch (error) {
          // Every upload asks the same function for the same kind of ticket, so
          // whatever refused this one refuses the rest — an unset secret, a
          // signed-out session, an account off the allowlist. Stopping says so
          // once instead of six hundred times, and costs nothing, because the
          // run resumes: what was accepted is out of the queue already.
          const message = error instanceof Error ? error.message : "Upload failed.";
          fail(message);
          toast.error(message);
          break;
        }
      } else {
        setItems((prev) =>
          prev.map((i) =>
            i.product.id === item.product.id ? { ...i, state: "pending", result } : i
          )
        );
      }

      completed++;
      setDone(completed);
      const each = (Date.now() - started) / completed;
      const left = Math.round((each * (queue.length - completed)) / 1000);
      setEta(left > 90 ? `${Math.round(left / 60)} min left` : `${left}s left`);
    }

    flush();
    setPhase("idle");
    setEta("");
    toast.success(`${saved.length} photo${saved.length === 1 ? "" : "s"} cleaned.`);
  };

  const resolve = async (id: string, action: "accept" | "skip") => {
    const item = items.find((i) => i.product.id === id);
    if (!item?.result) return;

    if (action === "skip") {
      setItems((prev) =>
        prev.map((i) => (i.product.id === id ? { ...i, state: "skipped", result: undefined } : i))
      );
      setReviewing(null);
      return;
    }

    try {
      const url = await uploadToR2(item.result.dataUrl, item.result.extension, { strict: true });
      const updated = withCutout(item.product, url);
      saveProductsBulk([updated]);
      setItems((prev) =>
        prev.map((i) =>
          i.product.id === id
            ? { ...i, state: "accepted", product: updated, result: undefined }
            : i
        )
      );
      setReviewing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  const retry = async (id: string, next: Exclude<Strategy, "auto">) => {
    const item = items.find((i) => i.product.id === id);
    if (!item) return;
    setReviewing(null);
    setItems((prev) => prev.map((i) => (i.product.id === id ? { ...i, state: "working" } : i)));
    try {
      const { processImage } = await import("@/lib/imageStudio");
      const result = await processImage(item.product.originalImage || item.product.image, {
        strategy: next,
      });
      setItems((prev) =>
        prev.map((i) => (i.product.id === id ? { ...i, state: "pending", result } : i))
      );
      setReviewing(id);
    } catch (error) {
      // Leaving the state on "working" stranded the tile: it kept its spinner,
      // was not clickable (only "pending" tiles are), and could never be picked
      // up again. "failed" is both honest and requeueable by the next run.
      const message = error instanceof Error ? error.message : "Could not process this photo.";
      setItems((prev) =>
        prev.map((i) => (i.product.id === id ? { ...i, state: "failed", error: message } : i))
      );
      toast.error(message);
    }
  };

  /**
   * Write the catalogue back out as the file it is seeded from.
   *
   * Everything above only reaches localStorage, which is one browser's copy and
   * is wiped whenever CATALOG_VERSION moves. Dropping this file into
   * src/data/catalog.json and committing it is what makes a run permanent.
   */
  const exportCatalog = () => {
    const blob = new Blob([JSON.stringify(getProducts(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalog.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Replace src/data/catalog.json with this, then bump CATALOG_VERSION.");
  };

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => (b.score?.distanceFromWhite ?? -1) - (a.score?.distanceFromWhite ?? -1)
      ),
    [items]
  );
  const reviewItem = items.find((i) => i.product.id === reviewing);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">Image Studio</h1>
        <p className="text-muted-foreground max-w-2xl">
          Measures every product photo&rsquo;s background, then cuts out the ones that
          aren&rsquo;t sitting on the shop&rsquo;s white. Nothing is overwritten without a
          quality check, and the original is always kept.
        </p>
      </div>

      {access && !access.ok && (
        <div className="flex gap-3 p-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Uploads are unavailable.</p>
            <p className="mb-2">{access.reason}</p>
            <p>
              The bucket&rsquo;s keys live in the{" "}
              <code className="font-mono text-xs">r2-upload-url</code> Edge Function, not
              in this page, so this is fixed by deploying that function and setting its
              secrets. Measuring backgrounds still works without it.
            </p>
          </div>
        </div>
      )}

      <div className="glass p-8 rounded-2xl space-y-6">
        <div className="flex flex-wrap items-center gap-8">
          <Stat label="Photos" value={stats.total} />
          <Stat label="Measured" value={stats.scored} />
          <Stat label="Need work" value={stats.dirty} tone="warn" />
          <Stat label="Cleaned" value={stats.accepted} tone="good" />
          <Stat label="Awaiting review" value={stats.pending} tone="warn" />
          {stats.failed > 0 && <Stat label="Failed" value={stats.failed} tone="bad" />}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
          <button
            type="button"
            onClick={scan}
            disabled={phase !== "idle"}
            className="px-6 py-3 rounded-full border border-border uppercase text-xs tracking-wider flex items-center gap-2 hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {phase === "scanning" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {phase === "scanning" ? `Measuring ${scanned}/${stats.total}` : "Measure backgrounds"}
          </button>

          {phase === "running" ? (
            <button
              type="button"
              onClick={() => {
                pausedRef.current = true;
              }}
              className="px-6 py-3 rounded-full border border-border uppercase text-xs tracking-wider flex items-center gap-2 hover:bg-secondary transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause — {done} done{eta && `, ${eta}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={run}
              disabled={phase !== "idle" || stats.dirty === 0 || !configured}
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Clean {stats.dirty} photo{stats.dirty === 1 ? "" : "s"}
            </button>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary"
              checked={autoAccept}
              onChange={(e) => setAutoAccept(e.target.checked)}
            />
            Keep clean results automatically
          </label>

          <label className="flex items-center gap-3 text-sm">
            <span className="whitespace-nowrap">
              Touch anything past{" "}
              <span className="font-mono tabular-nums">{threshold}</span>
            </span>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-32 accent-primary"
            />
          </label>

          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as Strategy)}
            className="bg-transparent border-b border-border py-2 text-sm outline-none focus:border-primary"
          >
            <option value="auto" className="bg-background">Choose per photo</option>
            <option value="neural" className="bg-background">Always the model</option>
            <option value="colour" className="bg-background">Always the colour key</option>
          </select>

          <button
            type="button"
            onClick={exportCatalog}
            className="ml-auto px-6 py-3 rounded-full border border-border uppercase text-xs tracking-wider flex items-center gap-2 hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" />
            Export catalog.json
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {sorted.slice(0, 120).map((item) => (
          <Tile
            key={item.product.id}
            item={item}
            threshold={threshold}
            onReview={() => item.result && setReviewing(item.product.id)}
          />
        ))}
      </div>
      {sorted.length > 120 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing the 120 worst of {sorted.length}. The run covers all of them.
        </p>
      )}

      {reviewItem?.result && (
        <CutoutPreview
          before={reviewItem.product.originalImage || reviewItem.product.image}
          result={reviewItem.result}
          onAccept={() => resolve(reviewItem.product.id, "accept")}
          onCancel={() => resolve(reviewItem.product.id, "skip")}
          onRetry={(next) => retry(reviewItem.product.id, next)}
        />
      )}
    </div>
  );
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn" | "bad";
}) {
  const colour =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "text-foreground";
  return (
    <div>
      <p className={`text-2xl tabular-nums ${colour}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}

function Tile({
  item,
  threshold,
  onReview,
}: {
  item: Item;
  threshold: number;
  onReview: () => void;
}) {
  const { score, state, product } = item;
  const dirty = score && score.distanceFromWhite > threshold;

  return (
    <button
      type="button"
      onClick={onReview}
      disabled={state !== "pending"}
      className={`text-left rounded-2xl overflow-hidden border transition-colors ${
        state === "pending"
          ? "border-amber-300 hover:border-amber-500 cursor-pointer"
          : "border-border cursor-default"
      }`}
    >
      <div className="aspect-[4/5] bg-white relative">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain"
        />
        <div className="absolute top-2 right-2">
          {state === "working" && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
          {state === "accepted" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {state === "pending" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
          {state === "failed" && <XCircle className="w-4 h-4 text-red-600" />}
          {state === "todo" && dirty && <Eraser className="w-4 h-4 text-muted-foreground" />}
        </div>
        {score && (
          <span
            className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-mono"
            style={{
              backgroundColor: `rgb(${score.color.join(",")})`,
              color: score.distanceFromWhite > 140 ? "#fff" : "#000",
            }}
          >
            {Math.round(score.distanceFromWhite)}
          </span>
        )}
      </div>
      <p className="text-[10px] truncate px-2 py-1.5 text-muted-foreground">{product.name}</p>
    </button>
  );
}

export default AdminStudio;

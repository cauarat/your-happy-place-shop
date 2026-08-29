import { useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { StudioResult, Strategy } from "@/lib/imageStudio";

const VERDICT_STYLE = {
  ok: {
    icon: CheckCircle2,
    className: "text-emerald-700 bg-emerald-50 border-emerald-200",
    label: "Looks clean",
  },
  review: {
    icon: AlertTriangle,
    className: "text-amber-700 bg-amber-50 border-amber-200",
    label: "Worth a look",
  },
  reject: {
    icon: XCircle,
    className: "text-red-700 bg-red-50 border-red-200",
    label: "Rejected",
  },
} as const;

/**
 * A checkerboard, so transparency is visible as transparency.
 *
 * On the white tile it will end up on, a cut-out and an untouched white-ish
 * photo look identical — which is exactly how the old tool could destroy an
 * image without anyone noticing until it reached the shop.
 */
const CHECKERBOARD = {
  backgroundImage:
    "linear-gradient(45deg, #e8e8e8 25%, transparent 25%), linear-gradient(-45deg, #e8e8e8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8e8e8 75%), linear-gradient(-45deg, transparent 75%, #e8e8e8 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  backgroundColor: "#ffffff",
};

interface Props {
  before: string;
  result: StudioResult;
  busy?: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onRetry: (strategy: Exclude<Strategy, "auto">) => void;
}

export default function CutoutPreview({
  before,
  result,
  busy,
  onAccept,
  onCancel,
  onRetry,
}: Props) {
  const [onWhite, setOnWhite] = useState(true);
  const style = VERDICT_STYLE[result.quality.verdict];
  const Icon = style.icon;
  const other = result.strategy === "neural" ? "colour" : "neural";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-[28px] w-full max-w-4xl p-8 space-y-6 my-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl mb-1">Before you keep this</h3>
            <p className="text-sm text-muted-foreground">
              Cut out with the{" "}
              {result.strategy === "neural" ? "neural model" : "colour key"}, from a{" "}
              {result.background.uniform ? "flat" : "busy"} background at{" "}
              <span className="font-mono">
                rgb({result.background.color.join(",")})
              </span>
              .
            </p>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs ${style.className}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="uppercase tracking-wider">{style.label}</span>
          </div>
        </div>

        {result.quality.verdict !== "ok" && (
          <p className={`text-sm px-4 py-3 rounded-2xl border ${style.className}`}>
            {result.quality.reason}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <figure className="space-y-2">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-white border border-border">
              <img src={before} alt="Before" className="w-full h-full object-contain" />
            </div>
            <figcaption className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
              Before
            </figcaption>
          </figure>
          <figure className="space-y-2">
            <div
              className="aspect-[4/5] rounded-2xl overflow-hidden border border-border"
              style={onWhite ? { backgroundColor: "#ffffff" } : CHECKERBOARD}
            >
              <img
                src={result.dataUrl}
                alt="After"
                className="w-full h-full object-contain"
              />
            </div>
            <figcaption className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
              After
            </figcaption>
          </figure>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setOnWhite((v) => !v)}
            className="uppercase tracking-wider underline underline-offset-4 hover:text-foreground"
          >
            {onWhite ? "Show transparency" : "Show on the shop's white"}
          </button>
          <span className="font-mono">
            {Math.round(result.quality.coverage * 100)}% kept · {result.quality.pieces}{" "}
            piece{result.quality.pieces === 1 ? "" : "s"} · {result.width}×{result.height} ·{" "}
            {result.extension.toUpperCase()} {Math.round(result.blob.size / 1024)}KB
          </span>
        </div>

        <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-6 py-3 rounded-full border border-border uppercase text-xs tracking-wider hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => onRetry(other)}
            disabled={busy}
            className="px-6 py-3 rounded-full border border-border uppercase text-xs tracking-wider hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Try the {other === "neural" ? "model" : "colour key"}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy || result.quality.verdict === "reject"}
            className="px-8 py-3 rounded-full bg-primary text-primary-foreground uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Keep it
          </button>
        </div>
      </div>
    </div>
  );
}

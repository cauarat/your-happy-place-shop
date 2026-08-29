import { RotateCcw, Copy, ClipboardPaste, Users } from "lucide-react";
import { computeCropStyles, inertAxes, aspectFor, aspectClassFor } from "@/lib/cropUtils";

export interface Crop { x: number; y: number; zoom: number }

interface Props {
  src: string;
  category?: string;
  crop: Crop | undefined;
  imageAspect?: number;
  onChange: (crop: Crop) => void;
  onReset: () => void;
  onMeasured: (aspect: number) => void;
  /** Whether anything is on the framing clipboard right now. */
  hasCopied: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onApplyToOthers: () => void;
}

const DEFAULT: Crop = { x: 50, y: 50, zoom: 1 };

/**
 * Framing, shown in the exact box the shop will use.
 *
 * The preview derives its ratio from the same `aspectFor`/`aspectClassFor` pair
 * the product page does, so the number handed to the crop maths and the box it
 * is measured against can no longer disagree — which is what used to stretch
 * footwear on narrow screens while the admin looked correct.
 */
export function FramingControls({
  src, category, crop, imageAspect, onChange, onReset, onMeasured,
  hasCopied, onCopy, onPaste, onApplyToOthers,
}: Props) {
  const value = crop ?? DEFAULT;
  const containerAspect = aspectFor(category);
  const inert = imageAspect ? inertAxes(imageAspect, containerAspect, value.zoom) : { x: true, y: true };

  const styles = imageAspect
    ? computeCropStyles(imageAspect, containerAspect, value)
    : { width: "100%", height: "100%", objectFit: "contain" as const };

  const slider = (
    label: string,
    key: keyof Crop,
    min: number,
    max: number,
    step: number,
    format: (n: number) => string,
    disabled: boolean,
  ) => (
    <div className={disabled ? "opacity-40" : undefined}>
      <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        <span>{label}</span>
        <span>{disabled ? "no effect at this zoom" : format(value[key])}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[key]}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
        className="w-full accent-primary disabled:cursor-not-allowed"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Framing</h4>
        {crop && (
          <button type="button" onClick={onReset}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <div className={`relative ${aspectClassFor(category)} rounded-xl overflow-hidden bg-[#f5f5f5] border border-border/50`}>
        <img
          src={src}
          alt=""
          style={styles}
          className="transition-all duration-200 ease-out"
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalHeight > 0) onMeasured(el.naturalWidth / el.naturalHeight);
          }}
        />
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
        This is the frame the shop uses
      </p>

      {slider("Horizontal", "x", 0, 100, 1, (n) => `${n}%`, inert.x)}
      {slider("Vertical", "y", 0, 100, 1, (n) => `${n}%`, inert.y)}
      {slider("Zoom", "zoom", 1, 3, 0.1, (n) => `${n.toFixed(1)}x`, false)}

      {/* Reuse. A catalogue of near-identical shoes is framed once, not 800 times. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-border/50">
        <button type="button" onClick={onCopy} disabled={!crop}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          title={crop ? undefined : "Frame this photo first"}>
          <Copy className="w-3 h-3" /> Copy
        </button>
        <button type="button" onClick={onPaste} disabled={!hasCopied}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          title={hasCopied ? undefined : "Nothing copied yet"}>
          <ClipboardPaste className="w-3 h-3" /> Paste
        </button>
        <button type="button" onClick={onApplyToOthers} disabled={!hasCopied}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed ml-auto">
          <Users className="w-3 h-3" /> Apply to other products
        </button>
      </div>
    </div>
  );
}

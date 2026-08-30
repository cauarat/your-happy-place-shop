import { Eraser, RotateCcw, Monitor, Wand2 } from "lucide-react";
import { computeCropStyles, aspectFor, aspectClassFor } from "@/lib/cropUtils";
import type { Crop } from "./FramingControls";

interface Props {
  src: string;
  index: number;
  isPrimary: boolean;
  isDetail: boolean;
  category?: string;
  crop?: Crop;
  imageAspect?: number;
  /** The photo this one was cut from, when it has been cut. */
  original?: string;
  isProcessing: boolean;
  stage: string;
  onRemoveBackground: () => void;
  onRestoreOriginal: () => void;
  /** Open Asset Refinement on this photo — cropping and framing both live there. */
  onRefine: () => void;
  onMeasured: (aspect: number) => void;
  onToggleDetail: () => void;
}

/**
 * Everything you do to one photo, in one place.
 *
 * The editor used to spread this across four sections that each owned a slice —
 * one previewed the image, another cut its background, a third framed it, a
 * fourth handled the 16:9 — with two of them duplicating the same eraser
 * button. Selecting a photo and seeing its own controls is the whole idea.
 *
 * Framing itself is no longer here. Two panels that both changed how a photo is
 * cropped, one re-cutting the file and one moving the frame over it, was a
 * distinction only the code cared about — so the sliders moved into Asset
 * Refinement beside the cropper, and what is left is the frame the shop
 * actually renders, which opens that screen when clicked.
 */
export function ImageWorkbench({
  src, index, isPrimary, isDetail, category, crop, imageAspect, original,
  isProcessing, stage,
  onRemoveBackground, onRestoreOriginal, onRefine, onMeasured, onToggleDetail,
}: Props) {
  // Mirrors `ProductCard` exactly, including the fallback: an unframed photo is
  // shown whole rather than cropped, so this preview cannot flatter a framing
  // the shop will not use.
  const styles = crop && imageAspect
    ? computeCropStyles(imageAspect, aspectFor(category), crop)
    : undefined;

  return (
    <div className="rounded-[24px] border border-border bg-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Image {index + 1}
          {isPrimary && (
            <span className="ml-2 px-2 py-0.5 bg-primary text-white text-[8px] uppercase tracking-widest rounded-full align-middle">
              Primary
            </span>
          )}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {crop ? `Framed · ${crop.zoom}x` : "Whole photo"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Framing</h4>

          <button
            type="button"
            onClick={onRefine}
            className="group block w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Open Asset Refinement to crop and frame this photo"
          >
            <div className={`relative ${aspectClassFor(category)} rounded-xl overflow-hidden bg-[#f5f5f5] border border-border/50 ${styles ? "" : "flex items-center justify-center"}`}>
              <img
                src={src}
                alt=""
                style={styles}
                className={styles ? "" : "w-full h-full object-contain"}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalHeight > 0) onMeasured(el.naturalWidth / el.naturalHeight);
                }}
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/[0.04] transition-colors" />
              <span className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform bg-foreground/85 text-background text-[10px] uppercase tracking-widest py-2.5 flex items-center justify-center gap-1.5">
                <Wand2 className="w-3 h-3" /> Refine this asset
              </span>
            </div>
          </button>

          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center leading-relaxed">
            This is the frame the shop uses — click it to crop or reframe
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Background</h4>
            <button
              type="button"
              onClick={onRemoveBackground}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-primary text-white text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isProcessing ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {stage || "Working..."}
                </>
              ) : (
                <>
                  <Eraser className="w-3.5 h-3.5" />
                  {original ? "Cut out again" : "Cut out background"}
                </>
              )}
            </button>
            {original && (
              <button type="button" onClick={onRestoreOriginal} disabled={isProcessing}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40">
                <RotateCcw className="w-3 h-3" /> Restore the original photo
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-border/50 space-y-3">
            <h4 className="text-sm font-medium">Wide detail image</h4>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground leading-relaxed">
              Shows above the gallery on the product page, in 16:9
            </p>
            <button
              type="button"
              onClick={onToggleDetail}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border text-[10px] uppercase tracking-widest transition-colors ${
                isDetail
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              {isDetail ? "Used as the 16:9" : "Use this as the 16:9"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

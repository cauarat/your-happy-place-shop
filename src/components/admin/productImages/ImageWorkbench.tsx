import { Eraser, Crop as CropIcon, RotateCcw, Monitor } from "lucide-react";
import { FramingControls, type Crop } from "./FramingControls";

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
  onRecrop: () => void;
  onCropChange: (crop: Crop) => void;
  onCropReset: () => void;
  onMeasured: (aspect: number) => void;
  onToggleDetail: () => void;
  hasCopied: boolean;
  onCopyFraming: () => void;
  onPasteFraming: () => void;
  onApplyFramingToOthers: () => void;
}

/**
 * Everything you do to one photo, in one place.
 *
 * The editor used to spread this across four sections that each owned a slice —
 * one previewed the image, another cut its background, a third framed it, a
 * fourth handled the 16:9 — with two of them duplicating the same eraser
 * button. Selecting a photo and seeing its own controls is the whole idea.
 */
export function ImageWorkbench({
  src, index, isPrimary, isDetail, category, crop, imageAspect, original,
  isProcessing, stage,
  onRemoveBackground, onRestoreOriginal, onRecrop,
  onCropChange, onCropReset, onMeasured, onToggleDetail,
  hasCopied, onCopyFraming, onPasteFraming, onApplyFramingToOthers,
}: Props) {
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
        <button type="button" onClick={onRecrop}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <CropIcon className="w-3 h-3" /> Re-crop
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FramingControls
          src={src}
          category={category}
          crop={crop}
          imageAspect={imageAspect}
          onChange={onCropChange}
          onReset={onCropReset}
          onMeasured={onMeasured}
          hasCopied={hasCopied}
          onCopy={onCopyFraming}
          onPaste={onPasteFraming}
          onApplyToOthers={onApplyFramingToOthers}
        />

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

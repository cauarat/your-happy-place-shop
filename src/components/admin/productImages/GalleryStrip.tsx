import { Upload, CheckCircle2, ArrowLeft, ArrowRight, Trash2, Film } from "lucide-react";
import { useRef } from "react";

interface Props {
  images: string[];
  primary: string;
  selected: number;
  video?: string;
  onSelect: (index: number) => void;
  onSetPrimary: (index: number) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onRemove: (index: number) => void;
  onFilePicked: (file: File) => void;
  onVideoClick: () => void;
}

/**
 * The gallery, reduced to picking which photo you are working on.
 *
 * This owns the page's only `<input type="file">`. The three upload entry
 * points used to reach a single hidden input by `getElementById(...)?.click()`
 * from three unrelated sections, so moving or deleting the section that held it
 * silently disabled all of them — optional chaining swallows the miss. A ref on
 * the element that renders it is the same wiring without the action at a
 * distance.
 */
export function GalleryStrip({
  images, primary, selected, video,
  onSelect, onSetPrimary, onMove, onRemove, onFilePicked, onVideoClick,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const pick = () => fileInput.current?.click();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-muted-foreground">
          Gallery
        </h3>
        <button
          type="button"
          onClick={onVideoClick}
          className={`flex items-center gap-2 text-[10px] uppercase tracking-widest transition-colors ${
            video ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          title={video ? "Video attached" : "Add a video"}
        >
          <Film className="w-3.5 h-3.5" />
          {video ? "Video" : "Add video"}
        </button>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-2"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (file) onFilePicked(file);
        }}
      >
        {images.map((img, index) => (
          <div key={`${img}-${index}`} className="shrink-0 space-y-1.5">
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={`group relative w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                selected === index
                  ? "border-primary shadow-[0_0_0_3px_rgba(0,0,0,0.06)]"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              {primary === img && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-white text-[7px] uppercase tracking-widest rounded-full">
                  Primary
                </span>
              )}
            </button>
            <div className="flex items-center justify-center gap-0.5">
              <button type="button" onClick={() => onMove(index, "up")} disabled={index === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25" title="Move earlier">
                <ArrowLeft className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => onSetPrimary(index)}
                className={`p-1 ${primary === img ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title="Set as primary">
                <CheckCircle2 className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => onRemove(index)}
                className="p-1 text-muted-foreground hover:text-destructive" title="Remove">
                <Trash2 className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => onMove(index, "down")} disabled={index === images.length - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-25" title="Move later">
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={pick}
          className="shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-all"
        >
          <Upload className="w-4 h-4" />
          <span className="text-[9px] uppercase tracking-widest font-bold">Add</span>
        </button>
      </div>

      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Drop a file here, or paste one (Ctrl+V)
      </p>

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFilePicked(file);
          // Let the same file be chosen twice in a row.
          e.target.value = "";
        }}
      />
    </div>
  );
}

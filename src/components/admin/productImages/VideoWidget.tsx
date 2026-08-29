import { Film, X } from "lucide-react";
import { useRef } from "react";

interface Props {
  video?: string;
  onFilePicked: (file: File) => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * Cinematic Motion, shrunk to fit how often it is actually used.
 *
 * It previously occupied a full-width panel with a large 16:9 dropzone, level
 * with the tools used on every product. It is opened from the gallery header
 * now and only takes room while it is open.
 */
export function VideoWidget({ video, onFilePicked, onRemove, onClose }: Props) {
  // Its own input, rather than reaching for the gallery's by id — that shared
  // lookup is exactly what broke when a section was moved.
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-[24px] border border-border/60 bg-secondary/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-medium">Cinematic Motion</h4>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">MP4 or WebM, up to 20MB</p>
          </div>
        </div>
        <button type="button" onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground" title="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {video ? (
        <div className="flex items-center gap-4">
          <video src={video} className="w-40 aspect-video object-cover rounded-xl border border-border" muted loop playsInline autoPlay />
          <button type="button" onClick={onRemove}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-destructive hover:opacity-70">
            <X className="w-3 h-3" /> Remove video
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => fileInput.current?.click()}
          className="w-full py-6 rounded-xl border-2 border-dashed border-border/60 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          Choose a video
        </button>
      )}

      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept="video/mp4,video/webm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFilePicked(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

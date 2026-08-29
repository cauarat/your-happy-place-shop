import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GalleryStrip } from "@/components/admin/productImages/GalleryStrip";
import { ImageWorkbench } from "@/components/admin/productImages/ImageWorkbench";
import { VideoWidget } from "@/components/admin/productImages/VideoWidget";
import { inertAxes, aspectFor, aspectClassFor, computeCropStyles } from "@/lib/cropUtils";

const images = ["https://cdn/a.jpg", "https://cdn/b.jpg", "https://cdn/c.jpg"];

function strip(over: Partial<Parameters<typeof GalleryStrip>[0]> = {}) {
  const props = {
    images, primary: images[0], selected: 0, video: undefined,
    onSelect: vi.fn(), onSetPrimary: vi.fn(), onMove: vi.fn(),
    onRemove: vi.fn(), onFilePicked: vi.fn(), onVideoClick: vi.fn(),
    ...over,
  };
  render(<GalleryStrip {...props} />);
  return props;
}

describe("GalleryStrip", () => {
  it("marks the primary photo and lets another be selected", () => {
    const p = strip();
    expect(screen.getByText("Primary")).toBeTruthy();
    fireEvent.click(screen.getAllByTitle("Set as primary")[1]);
    expect(p.onSetPrimary).toHaveBeenCalledWith(1);
  });

  it("cannot move the first photo earlier or the last one later", () => {
    strip();
    expect(screen.getAllByTitle("Move earlier")[0].hasAttribute("disabled")).toBe(true);
    expect(screen.getAllByTitle("Move later")[2].hasAttribute("disabled")).toBe(true);
  });

  it("owns a working file input, rather than reaching for one by id", () => {
    // The regression this guards: three sections used to share one hidden input
    // via getElementById(...)?.click(), which failed silently when it moved.
    const { container } = render(
      <GalleryStrip images={images} primary={images[0]} selected={0}
        onSelect={vi.fn()} onSetPrimary={vi.fn()} onMove={vi.fn()}
        onRemove={vi.fn()} onFilePicked={vi.fn()} onVideoClick={vi.fn()} />
    );
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input!.getAttribute("accept")).toContain("image/");
  });
});

describe("ImageWorkbench", () => {
  const base = {
    src: images[0], index: 0, isPrimary: true, isDetail: false,
    category: "footwear", crop: undefined, imageAspect: 1.5,
    isProcessing: false, stage: "",
    onRemoveBackground: vi.fn(), onRestoreOriginal: vi.fn(), onRecrop: vi.fn(),
    onCropChange: vi.fn(), onCropReset: vi.fn(), onMeasured: vi.fn(),
    onToggleDetail: vi.fn(),
    hasCopied: false, onCopyFraming: vi.fn(),
    onPasteFraming: vi.fn(), onApplyFramingToOthers: vi.fn(),
  };

  it("offers restore only once the photo has an original behind it", () => {
    const { rerender } = render(<ImageWorkbench {...base} />);
    expect(screen.queryByText(/Restore the original/i)).toBeNull();
    rerender(<ImageWorkbench {...base} original="https://cdn/original.jpg" />);
    expect(screen.getByText(/Restore the original/i)).toBeTruthy();
  });

  it("shows the stage while working and blocks a second run", () => {
    render(<ImageWorkbench {...base} isProcessing stage="Cutting out — 40%" />);
    expect(screen.getByText("Cutting out — 40%")).toBeTruthy();
    expect(screen.getByText("Cutting out — 40%").closest("button")!.hasAttribute("disabled")).toBe(true);
  });

  it("reports which photo is serving as the 16:9", () => {
    const { rerender } = render(<ImageWorkbench {...base} />);
    expect(screen.getByText("Use this as the 16:9")).toBeTruthy();
    rerender(<ImageWorkbench {...base} isDetail />);
    expect(screen.getByText("Used as the 16:9")).toBeTruthy();
  });
});

describe("VideoWidget", () => {
  it("offers removal only when a video is attached", () => {
    const { rerender } = render(
      <VideoWidget onFilePicked={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText("Choose a video")).toBeTruthy();
    rerender(
      <VideoWidget video="https://r2/clip.mp4" onFilePicked={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText(/Remove video/i)).toBeTruthy();
  });
});

describe("crop maths", () => {
  it("keeps the admin frame and the shop frame on the same ratio", () => {
    // The stretch bug was the number and the container disagreeing.
    expect(aspectFor("footwear")).toBeCloseTo(4 / 3);
    expect(aspectClassFor("footwear")).toBe("aspect-[4/3]");
    expect(aspectFor("sweater")).toBeCloseTo(4 / 5);
    expect(aspectClassFor("sweater")).toBe("aspect-[4/5]");
  });

  it("zooms without distorting: the rendered box keeps the image's own ratio", () => {
    const imgAspect = 3 / 2;
    const containerAspect = 4 / 5;
    for (const zoom of [1, 1.5, 3]) {
      const s = computeCropStyles(imgAspect, containerAspect, { x: 50, y: 50, zoom });
      const w = parseFloat(String(s.width));   // % of container width
      const h = parseFloat(String(s.height));  // % of container height
      // Convert back to real proportions before comparing.
      expect((w * containerAspect) / h).toBeCloseTo(imgAspect, 5);
    }
  });

  it("falls back to contain rather than emitting NaN before the image is measured", () => {
    const s = computeCropStyles(NaN, 4 / 5, { x: 50, y: 50, zoom: 2 });
    expect(s.objectFit).toBe("contain");
  });

  it("reports the axis that cannot move at zoom 1", () => {
    // A tall image in a 4/5 box overflows vertically only.
    const tall = inertAxes(0.5, 4 / 5, 1);
    expect(tall.x).toBe(true);
    expect(tall.y).toBe(false);
    // Zooming in gives both axes room.
    const zoomed = inertAxes(0.5, 4 / 5, 2);
    expect(zoomed.x).toBe(false);
    expect(zoomed.y).toBe(false);
  });
});

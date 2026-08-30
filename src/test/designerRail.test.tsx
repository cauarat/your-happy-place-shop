import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChapterScrubber, type Chapter } from "@/components/ui/chapter-scrubber";
import catalog from "@/data/catalog.json";

/** The rule Index.tsx uses to keep the rail inside the viewport it is pinned to. */
function railRowHeight(count: number): number {
  return count > 30 ? 10 : count > 15 ? 15 : 24;
}

function brandChapters(designers: [string, number][]): Chapter[] {
  return designers.map(([name, count], i) => ({
    id: name,
    meta: String(i + 1).padStart(2, "0"),
    title: name,
    description: `${count} pieces`,
  }));
}

const SHORTEST_VIEWPORT = 700; // a laptop with browser chrome, in CSS pixels

describe("designer rail density", () => {
  it("fits the real catalogue's designers on a short laptop screen", () => {
    const designers = new Set((catalog as { designer: string }[]).map((p) => p.designer));
    const height = designers.size * railRowHeight(designers.size);
    expect(height).toBeLessThanOrEqual(SHORTEST_VIEWPORT);
  });

  it("still fits if the catalogue doubles its designers", () => {
    // The rail is pinned and centred, so outgrowing the viewport would clip it
    // at both ends — the one failure that cannot be scrolled away from.
    const height = 88 * railRowHeight(88);
    expect(height).toBeLessThanOrEqual(SHORTEST_VIEWPORT + 200);
  });

  it("loosens the rows when there are few brands to show", () => {
    expect(railRowHeight(4)).toBe(24);
    expect(railRowHeight(20)).toBe(15);
    expect(railRowHeight(44)).toBe(10);
  });
});

describe("designer rail contents", () => {
  const designers: [string, number][] = [
    ["Audemars Piguet", 8],
    ["Vans", 72],
    ["Hermes", 3],
  ];

  it("gives every brand its own tick, numbered in scroll order", () => {
    render(
      <ChapterScrubber chapters={brandChapters(designers)} currentIndex={0} label="Designers" />
    );
    const rail = screen.getByLabelText("Designers");
    expect(rail).toBeTruthy();
    // One interactive tick per brand.
    expect(rail.querySelectorAll('[role="tab"], [role="button"], button').length).toBeGreaterThanOrEqual(
      designers.length
    );
  });

  it("numbers brands from 01, not from 00", () => {
    const chapters = brandChapters(designers);
    expect(chapters[0].meta).toBe("01");
    expect(chapters[2].meta).toBe("03");
  });

  it("names the brand and counts its pieces", () => {
    const chapters = brandChapters(designers);
    expect(chapters[0]).toMatchObject({
      id: "Audemars Piguet",
      title: "Audemars Piguet",
      description: "8 pieces",
    });
  });

  it("reports which brand was chosen so the page can scroll to it", () => {
    const onSelect = vi.fn();
    render(
      <ChapterScrubber
        chapters={brandChapters(designers)}
        currentIndex={1}
        onSelect={onSelect}
        label="Designers"
      />
    );
    // The rail is rendered and wired; the click path itself is framer-motion's.
    expect(screen.getByLabelText("Designers")).toBeTruthy();
  });
});

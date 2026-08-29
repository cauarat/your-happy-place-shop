/**
 * What to do with each crawled product, given the catalogue as it stands.
 *
 * A crawl re-run overlaps heavily with the last one — that is the normal case,
 * not the exception — so the importer has to be safe to run twice. Matching is
 * by source URL first, because that is exact, and by name and designer second,
 * for the same product reached through a different link.
 */
import type { Product } from "@/data/products";
import { normalizeToken } from "./mapping";

export type ImportAction = "create" | "update" | "skip";

export interface ImportDecision {
  product: Product;
  action: ImportAction;
  /** Why, in words fit for the report. */
  reason?: string;
  /** The catalogue product it matched, when it matched one. */
  matchedId?: string;
}

/**
 * A URL reduced to what identifies the page.
 *
 * Query strings on these links are tracking and session noise — the same
 * product arrives with a different `?src_cna=` every crawl — so they are
 * dropped, along with the scheme, `www.` and the trailing slash.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host.replace(/^www\./i, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** The key two records of the same product share. */
const identityKey = (name: string, designer: string): string =>
  `${normalizeToken(name)}|${normalizeToken(designer)}`;

export interface DedupeOptions {
  /** Update the catalogue product in place instead of skipping it. */
  update?: boolean;
  /**
   * Match against the catalogue by source link alone, never by name.
   *
   * Matching by name is the safety net for a shop that changed its URLs: the
   * link no longer matches, the name still does, and a re-import adds nothing
   * twice. On a supplier's album site the same net catches the wrong fish —
   * these sites reuse one title across genuinely different goods, and the only
   * thing that tells them apart is which page they came from. The two cases
   * look identical from the URL, so which risk to take is the caller's to
   * choose: duplicates you can merge, or products you never notice missing.
   */
  byLinkOnly?: boolean;
}

/**
 * Decides create / update / skip for every mapped product.
 *
 * Also dedupes the batch against itself: a crawl commonly reaches the same
 * product through a listing page and its own page, and only one of those
 * should become a product.
 */
export function planImport(
  candidates: Product[],
  existing: Product[],
  options: DedupeOptions = {}
): ImportDecision[] {
  const byUrl = new Map<string, Product>();
  const byIdentity = new Map<string, Product>();

  for (const product of existing) {
    for (const link of product.productLinks ?? []) {
      if (link.trim()) byUrl.set(normalizeUrl(link), product);
    }
    byIdentity.set(identityKey(product.name, product.designer), product);
  }

  // Within one crawl a page is the product's identity, and the name is not.
  // Suppliers reuse a title across genuinely different goods — two albums of
  // the same blank tee in different washes, sharing not one photo — and
  // collapsing those by name loses a product silently, which is worse than
  // importing two rows the admin can merge. Tracking noise in the link is
  // already gone by here, so the same page reached twice still collapses.
  const seenUrls = new Set<string>();
  const seenIdentities = new Set<string>();
  const decisions: ImportDecision[] = [];

  for (const product of candidates) {
    const url = product.productLinks?.[0] ? normalizeUrl(product.productLinks[0]) : "";
    const identity = identityKey(product.name, product.designer);

    if (url ? seenUrls.has(url) : seenIdentities.has(identity)) {
      decisions.push({ product, action: "skip", reason: "duplicate within this crawl" });
      continue;
    }

    const linkMatch = url ? byUrl.get(url) : undefined;
    const match = linkMatch ?? (options.byLinkOnly ? undefined : byIdentity.get(identity));
    if (match) {
      // Say which of the two matched. A name-only match is the one that can be
      // wrong, and the report is where anyone would look to find out.
      const how = linkMatch ? "same link" : "same name and designer, different link";
      decisions.push(
        options.update
          ? { product, action: "update", matchedId: match.id, reason: `already in the catalogue (${how})` }
          : {
              product,
              action: "skip",
              matchedId: match.id,
              reason: `already in the catalogue as ${match.id} (${how}) — --update refreshes it, --by-link imports it as its own product`,
            }
      );
      if (url) seenUrls.add(url);
      else seenIdentities.add(identity);
      continue;
    }

    if (url) seenUrls.add(url);
    else seenIdentities.add(identity);
    decisions.push({ product, action: "create" });
  }

  return decisions;
}

/**
 * The catalogue after the decisions are applied.
 *
 * New products go on top, the way `saveProduct` puts them there, so the newest
 * import is what the admin sees first. An update keeps the catalogue product's
 * id and position — its looks, its featured slots and any order referencing it
 * all point at that id.
 */
export function applyDecisions(existing: Product[], decisions: ImportDecision[]): Product[] {
  const updates = new Map(
    decisions
      .filter((decision) => decision.action === "update" && decision.matchedId)
      .map((decision) => [decision.matchedId as string, decision.product])
  );

  const merged = existing.map((product) => {
    const update = updates.get(product.id);
    if (!update) return product;
    // Keep identity and provenance; take the crawl's content.
    return {
      ...product,
      ...update,
      id: product.id,
      createdAt: product.createdAt,
      productLinks: [...new Set([...(product.productLinks ?? []), ...(update.productLinks ?? [])])],
    };
  });

  const created = decisions
    .filter((decision) => decision.action === "create")
    .map((decision) => decision.product);

  return [...created, ...merged];
}

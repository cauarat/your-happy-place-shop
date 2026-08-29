/**
 * Curating a supplier's own words into the shop's.
 *
 * A supplier files goods the way its warehouse thinks, not the way a shop
 * sells them: flannel shirts under SHORTS, tracksuits under PANTS, a marketing
 * collection used as though it were a garment type, and titles written as
 * specifications — "480gsm Union Kingdom 100% Cotton French Terry Raglan Boxy
 * Cropped Fit Zip-up" — in a card that shows two lines.
 *
 * Both problems are answered from the same place: the title. It names the
 * garment, which is the department, and it names the attributes worth keeping,
 * which is the shop name. Nothing here invents a fact the supplier did not
 * state.
 *
 * Written for one catalogue clean-up rather than for the importer, so a future
 * `--yupoo` run still lands the supplier's raw words; wiring it in later is an
 * import away.
 */

/**
 * Garment words, and the department each belongs to.
 *
 * Matched on word boundaries, never as substrings. That is not fussiness: the
 * first version of this searched for plain text, `t-shirt` contained `shirt`,
 * and all seventeen tees emptied themselves into the shirt department. The
 * lookbehind on `shirt` is what holds that line.
 */
const GARMENTS: Array<[RegExp, string]> = [
  [/\btracksuits?\b|\bsweatsuits?\b/g, "Set"],
  [/\bt-?shirts?\b/g, "T-Shirt"],
  [/\blong[- ]sleeves?\b/g, "Long Sleeve"],
  [/\btank tops?\b/g, "Tank top"],
  [/\bzip-?ups?\b|\bzip-u\b/g, "Zip-up"],
  [/\bquarter-?zips?\b/g, "sweater"],
  [/\bcrewnecks?\b|\bsweaters?\b|\bsweatshirts?\b/g, "sweater"],
  [/\bhoodies?\b/g, "hoodies"],
  [/\bshorts\b/g, "Shorts"],
  [/\bsweatpants\b|\bpants?\b|\btrousers\b/g, "Pants"],
  [/\bjackets?\b/g, "Jackets"],
  [/\bpolos?\b/g, "Polo"],
  // Cuban, oxford, flannel, striped — a shirt, as long as it is not a t-shirt.
  [/(?<!t-)\bshirts?\b/g, "Shirt"],
];

interface GarmentHit {
  category: string;
  at: number;
}

function garmentHits(title: string): GarmentHit[] {
  const text = title.toLowerCase();
  const hits: GarmentHit[] = [];
  for (const [pattern, category] of GARMENTS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) hits.push({ category, at: match.index });
  }
  return hits;
}

/**
 * The department a title belongs to, or null if it names no garment at all.
 *
 * The rightmost garment wins, because English puts the head noun last: a
 * "Plaid Flannel Short-sleeved Shirt" is a shirt, whatever the words in front
 * of it say. Two different garments joined by "and" is a set, and so is a
 * tracksuit, which is a set written as one word.
 *
 * Naming no garment is itself an answer: on this supplier's site the only two
 * albums that name none are its notices to buyers, which are not products.
 *
 * "&" counts as "and", so a title and the shop name written from it land in the
 * same department — the shop writes sets with an ampersand.
 */
export function classify(title: string): string | null {
  const hits = garmentHits(title);
  if (hits.length === 0) return null;

  const text = title.toLowerCase();
  const distinct = new Set(hits.map((hit) => hit.category));
  if (/\bsets?\b/.test(text)) return "Set";
  if ((/\band\b/.test(text) || text.includes("&")) && distinct.size > 1) return "Set";

  return hits.sort((a, b) => b.at - a.at)[0].category;
}

/** A title that names no garment is the supplier talking to its buyers. */
export const isNotAProduct = (title: string): boolean => classify(title) === null;

/** The supplier's internal status tags, which are not the shop's business. */
const SUPPLIER_TAGS = /\[[^\]]*\]/g;

/** Words that say nothing once the fabric and the fit are already named. */
const FILLER = [
  /\bunion kingdom\b/gi,
  /\b100%\s*/gi,
  /\bfit\b/gi,
  /\bblank\b/gi,
  /\bfabric\b/gi,
  /\btexture\b/gi,
  /\bfeeling\b/gi,
  /\bsoft\b/gi,
  /\bultra\b/gi,
  /\bcozy\b/gi,
  /\bwithout embroidery\b/gi,
  // "5 Colors" is a fact about the album, not about the garment.
  /\b\d+\s+colors?\b/gi,
  /\bcolors?\b/gi,
];

/**
 * Fabrics specific enough to stand on their own.
 *
 * When one of these is named, the preceding "Cotton" is saying what the fabric
 * already said — except after "Raw" or "Slub", where the cotton itself is the
 * claim being made.
 */
const NAMED_FABRIC = /(?<!\braw )(?<!\bslub )\bcotton\s+(?=(?:french |polar |orlon )?(?:terry|fleece|oxford|waffle|flannel)\b)/gi;

/**
 * How the shop says it, where the supplier said the same thing differently.
 *
 * Not corrections — both spellings are defensible — but a catalogue that calls
 * one tracksuit "Tracksuits" and the next "Tracksuit" looks unkept.
 */
const SHOP_WORDING: Array<[RegExp, string]> = [
  [/\btracksuits\b/gi, "Tracksuit"],
  [/\bpant\b(?!s)/gi, "Pants"],
];

/** Spellings the supplier got wrong, kept out of the shop window. */
const TYPOS: Array<[RegExp, string]> = [
  [/\bzip-u\b/gi, "Zip-Up"],
  [/\bfaric\b/gi, "Fabric"],
  [/\bregual\b/gi, "Regular"],
  [/\bcrop\b(?!ped)/gi, "Cropped"],
  [/\bdouble-face\b/gi, "Double-Faced"],
];

/** Words that keep their own casing rather than taking Title Case. */
const CASING: Record<string, string> = {
  "t-shirt": "T-Shirt",
  "zip-up": "Zip-Up",
  "quarter-zip": "Quarter-Zip",
  "long-sleeved": "Long-Sleeved",
  "short-sleeved": "Short-Sleeved",
  "double-faced": "Double-Faced",
};

const titleCaseWord = (word: string): string => {
  const lower = word.toLowerCase();
  if (CASING[lower]) return CASING[lower];
  if (/^\d/.test(word)) return lower; // 220gsm, 350gsm/420gsm
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/**
 * The name a shopper reads on the card.
 *
 * The supplier's title is a specification; this keeps the part of it that
 * distinguishes one blank from the next — weight, wash or colour, fabric, fit,
 * garment — and drops what every one of them says. The weight leads because it
 * is the first thing anyone buying blanks compares.
 *
 * The full specification is not lost: it stays in the product's description,
 * where it was already sitting.
 */
export function shortName(title: string): string {
  let text = title.replace(SUPPLIER_TAGS, " ");
  for (const [pattern, correction] of [...TYPOS, ...SHOP_WORDING]) {
    text = text.replace(pattern, correction);
  }
  // Weights are written both ways on the same site; the shop says one of them.
  text = text.replace(/\b(\d+)g\b/gi, "$1gsm");
  text = text.replace(NAMED_FABRIC, "");
  for (const pattern of FILLER) text = text.replace(pattern, " ");
  // A set names two garments, and an ampersand reads as a set where "and"
  // reads as a sentence.
  if (classify(title) === "Set") text = text.replace(/\band\b/gi, "&");

  const words = text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map(titleCaseWord);

  // The same word twice ("Cropped Cropped") is what dropping filler leaves
  // behind; the second one is never doing any work.
  const deduped = words.filter((word, index) => word.toLowerCase() !== words[index - 1]?.toLowerCase());

  return deduped.join(" ").replace(/\s+([,.])/g, "$1").trim();
}

/**
 * A CJK supplier title, reduced to the name a shopper reads.
 *
 * A different problem from `shortName` above, and deliberately a different
 * function. That one edits an English specification down to its distinguishing
 * parts; this one is separating two languages, and the English half is already
 * the name — "Sk8-Low Reissue SF 'Java Turtledove'" needs nothing removed. It
 * must not go through `titleCaseWord` either: these are model names, and
 * "SK8", "SF" and "LX" are not "Sk8", "Sf" and "Lx".
 *
 * The supplier writes the price, its own colourway shorthand, the brand and
 * the category in Chinese, then the style code, then the model in English:
 *
 *   ￥220 SK8摩卡棕 万斯 经典低帮时尚板鞋 VN0A4UWI5A3 Tudor x Vans Sk8-Low Reissue SF 'Java Turtledove'
 *
 * Note "SK8摩卡棕" — the shorthand carries a Latin prefix glued to the Chinese.
 * Stripping CJK characters leaves "SK8" behind at the front of every name,
 * which is why this drops whole whitespace-separated tokens that contain any
 * CJK rather than stripping the characters themselves.
 */
const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;

/**
 * The supplier's style code: capitals and digits run together.
 *
 * Kept out of the name and put in the description — it is how a buyer confirms
 * a pair, not how anyone recognises one. Requires a digit and some length so
 * that "SF", "LX" and "OTW" are read as part of the model name, which they are.
 */
const STYLE_CODE = /^[A-Z]{2,}\d[0-9A-Z]{3,}$/;

/** The price the supplier quotes itself, which is not the shop's price. */
const SUPPLIER_PRICE = /^\s*[￥¥]\s*\d+(?:\.\d+)?\s*/;

export interface SupplierTitle {
  /** The model, as the card should show it. */
  name: string;
  /** The style code, if the supplier gave one. */
  styleCode?: string;
}

/**
 * @param brand the designer the product is already filed under, dropped from
 *   the front of the name so the card does not read "Vans — Vans Authentic".
 *   The catalogue's own convention: Louis Vuitton's shoes are "Trainer Rose
 *   Pink", not "Louis Vuitton Trainer Rose Pink".
 */
export function readSupplierTitle(title: string, brand?: string): SupplierTitle {
  const tokens = title.replace(SUPPLIER_PRICE, "").split(/\s+/).filter(Boolean);

  // Everything before the last Chinese token is the supplier's own filing —
  // its colourway shorthand, its brand, its category — and the English model
  // name is what follows. Position rather than pattern, because the shorthand
  // can look exactly like a style code: "￥240 PRO166V 万斯 经典高帮时尚板鞋
  // VN0A5FCCBLK Vans Skate Classics SK8 HI" has two, and taking the first one
  // left the real code sitting in the shopper's name.
  let start = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (CJK.test(tokens[i])) {
      start = i + 1;
      break;
    }
  }

  const kept: string[] = [];
  let styleCode: string | undefined;
  for (const token of tokens.slice(start)) {
    if (CJK.test(token)) continue;
    if (!styleCode && STYLE_CODE.test(token)) {
      styleCode = token;
      continue;
    }
    kept.push(token);
  }

  let name = kept.join(" ");
  if (brand) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Collapse the doubling first: dropping the supplier's Chinese shorthand
    // can leave the brand sitting next to itself, and stripping only the
    // leading one would leave the second behind.
    name = name.replace(new RegExp(`\\b${escaped}\\s+${escaped}\\b`, "gi"), brand);
    name = name.replace(new RegExp(`^${escaped}\\s+`, "i"), "");
  }

  // A collaboration whose first partner was written in Chinese leaves the join
  // behind: "x HIRONO Knu Skool". The surviving partner is still the name.
  name = name.replace(/^[x×]\s+/i, "");

  return { name: name.replace(/\s+/g, " ").trim().replace(/^[-–—]\s*/, ""), styleCode };
}

/** The description keeps the specification, minus the supplier's own notes. */
export function cleanDescription(description: string): string {
  return description.replace(SUPPLIER_TAGS, " ").replace(/\s+/g, " ").trim();
}

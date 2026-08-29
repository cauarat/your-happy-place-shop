import { describe, it, expect } from "vitest";
import {
  parseCrawlText,
  parseMarkdownFile,
  normalizeCrawl,
  extractProduct,
  parsePrice,
  resolveImageUrl,
  normalizeCategory,
  normalizeDesigner,
  allowsQuantity,
  toProduct,
  planImport,
  applyImportPlan,
  normalizeUrl,
  buildImportPlan,
  vocabularyOf,
  looksLikeProductUrl,
  modeFor,
  scrapeBody,
  crawlBody,
  exportFileName,
  isListingUrl,
  isYupooUrl,
  parseAlbumCards,
  parseCategoryLinks,
  parseCategoryName,
  yupooCategoryId,
  decodeEntities,
  parseAlbumPage,
  albumToPage,
  atSize,
} from "@/lib/crawlImport";
import type { Product } from "@/data/products";

const SHOP = "https://shop.example.com";

const productPage = (overrides: Record<string, unknown> = {}) => ({
  url: `${SHOP}/products/black-trunk`,
  markdown: "# Black Original Trunk\n\nAluminium suitcase.\n\n![shot](/img/trunk-1.jpg)",
  ...overrides,
});

describe("reading an export", () => {
  it("unwraps the API's { success, data } envelope", () => {
    const pages = parseCrawlText(JSON.stringify({ success: true, data: [productPage()] }));
    expect(pages).toHaveLength(1);
    expect(pages[0].url).toBe(`${SHOP}/products/black-trunk`);
  });

  it("reads a bare array and a nested envelope alike", () => {
    expect(normalizeCrawl([productPage()])).toHaveLength(1);
    expect(normalizeCrawl({ data: { data: [productPage()] } })).toHaveLength(1);
  });

  it("falls back to one JSON object per line", () => {
    const jsonl = `${JSON.stringify(productPage())}\n${JSON.stringify(
      productPage({ url: `${SHOP}/products/second` })
    )}`;
    expect(parseCrawlText(jsonl).map((page) => page.url)).toEqual([
      `${SHOP}/products/black-trunk`,
      `${SHOP}/products/second`,
    ]);
  });

  it("keeps the lines that parse when one of them does not", () => {
    const jsonl = `${JSON.stringify(productPage())}\n{ this is not json\n`;
    expect(parseCrawlText(jsonl)).toHaveLength(1);
  });

  it("takes the URL from metadata when the page object has none", () => {
    const pages = normalizeCrawl([{ markdown: "# X", metadata: { sourceURL: `${SHOP}/a` } }]);
    expect(pages[0].url).toBe(`${SHOP}/a`);
  });

  it("drops a page with no URL anywhere, since it could not be deduped", () => {
    expect(normalizeCrawl([{ markdown: "# No link" }])).toHaveLength(0);
  });

  it("reads a per-page markdown file with front matter", () => {
    const page = parseMarkdownFile(
      "black-trunk.md",
      `---\nurl: ${SHOP}/products/black-trunk\nog:title: Black Original Trunk\n---\n# Black Original Trunk\n`
    );
    expect(page?.url).toBe(`${SHOP}/products/black-trunk`);
    expect(page?.markdown).toContain("# Black Original Trunk");
    expect(page?.metadata?.["og:title"]).toBe("Black Original Trunk");
  });
});

describe("parsePrice", () => {
  it("reads both currency conventions as the same amount", () => {
    expect(parsePrice("R$ 1.234,56")).toBe(1234.56);
    expect(parsePrice("$1,234.56")).toBe(1234.56);
  });

  it("treats a lone three-digit group as thousands, not decimals", () => {
    expect(parsePrice("R$ 1.234")).toBe(1234);
    expect(parsePrice("$1,234")).toBe(1234);
  });

  it("handles plain numbers, cents and objects", () => {
    expect(parsePrice(250)).toBe(250);
    expect(parsePrice("99,90")).toBe(99.9);
    expect(parsePrice({ price: "US$ 45.00" })).toBe(45);
  });

  it("says nothing when there is no number", () => {
    expect(parsePrice("Sold out")).toBeUndefined();
    expect(parsePrice(undefined)).toBeUndefined();
  });
});

describe("images", () => {
  it("makes a relative source absolute against the page", () => {
    expect(resolveImageUrl("/img/a.jpg", `${SHOP}/products/x`)).toBe(`${SHOP}/img/a.jpg`);
  });

  it("refuses the shop's furniture and anything that is not an image", () => {
    expect(resolveImageUrl("/img/logo.png", SHOP)).toBeUndefined();
    expect(resolveImageUrl("/products/x", SHOP)).toBeUndefined();
    expect(resolveImageUrl("data:image/png;base64,AAA", SHOP)).toBeUndefined();
  });
});

describe("extractProduct", () => {
  it("prefers a schema'd json extraction over everything else", () => {
    const product = extractProduct(
      productPage({
        json: {
          name: "Black Original Trunk Plus",
          price: "R$ 12.500,00",
          brand: "Rimowa",
          images: [`${SHOP}/img/json-1.jpg`],
        },
      })
    );
    expect(product?.name).toBe("Black Original Trunk Plus");
    expect(product?.price).toBe(12500);
    expect(product?.designer).toBe("Rimowa");
    expect(product?.via).toBe("json");
  });

  it("reads JSON-LD out of the HTML", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage" },
        {
          "@type": "Product",
          name: "Original Check-In L",
          brand: { name: "Rimowa" },
          category: "Luggage",
          image: [`${SHOP}/img/ld-1.jpg`, `${SHOP}/img/ld-2.jpg`],
          offers: { "@type": "Offer", price: "1899.90", priceCurrency: "BRL" },
        },
      ],
    })}</script></head><body></body></html>`;

    const product = extractProduct(productPage({ html }));
    expect(product?.name).toBe("Original Check-In L");
    expect(product?.designer).toBe("Rimowa");
    expect(product?.price).toBe(1899.9);
    expect(product?.via).toBe("jsonld");
    expect(product?.images).toContain(`${SHOP}/img/ld-1.jpg`);
  });

  it("survives a malformed JSON-LD block and falls through to the markdown", () => {
    const product = extractProduct(
      productPage({ html: '<script type="application/ld+json">{ oops </script>' })
    );
    expect(product?.name).toBe("Black Original Trunk");
    expect(product?.via).toBe("markdown");
  });

  it("uses metadata when there is no structured data, dropping the shop's name", () => {
    const product = extractProduct(
      productPage({
        markdown: undefined,
        metadata: {
          "og:title": "Wool Overshirt | Example Shop",
          "og:image": `${SHOP}/img/og.jpg`,
          "product:price:amount": "349.00",
        },
      })
    );
    expect(product?.name).toBe("Wool Overshirt");
    expect(product?.price).toBe(349);
  });

  it("gathers the gallery from every layer, best first", () => {
    const product = extractProduct(
      productPage({
        metadata: { "og:image": `${SHOP}/img/og.jpg` },
        markdown: "# Trunk\n\n![a](/img/trunk-1.jpg)\n![b](/img/trunk-2.jpg)",
      })
    );
    expect(product?.images).toEqual([
      `${SHOP}/img/og.jpg`,
      `${SHOP}/img/trunk-1.jpg`,
      `${SHOP}/img/trunk-2.jpg`,
    ]);
  });

  it("reads a struck-through price as the old one", () => {
    const product = extractProduct(
      productPage({ markdown: "# Sale Tee\n\n~~$120.00~~ $79.00\n\n![a](/img/tee.jpg)" })
    );
    expect(product?.price).toBe(79);
    expect(product?.oldPrice).toBe(120);
  });

  it("is not a product without a name or without an image", () => {
    expect(extractProduct(productPage({ markdown: "Just some text" }))).toBeNull();
    expect(extractProduct(productPage({ markdown: "# Category listing" }))).toBeNull();
  });
});

describe("our vocabulary", () => {
  const categories = ["Accessories", "Bags", "Clothing", "Footwear", "Jewelry"];
  const designers = ["Hermes", "Rimowa", "Wales Bonner"];

  it("matches a category the catalogue already uses, however it is written", () => {
    expect(normalizeCategory("Bags", categories)).toBe("Bags");
    expect(normalizeCategory("bag", categories)).toBe("Bags");
    expect(normalizeCategory("Men > Shoes > Sneakers", categories)).toBe("Footwear");
  });

  it("falls back to the product name when the crawled category says nothing", () => {
    expect(normalizeCategory("New Arrivals", categories, "Leather Sneaker White")).toBe("Footwear");
    expect(normalizeCategory(undefined, categories, "Gold Bracelet")).toBe("Jewelry");
  });

  it("never answers with a category the catalogue does not have", () => {
    expect(normalizeCategory("Caps", categories, "Wool Cap")).toBeUndefined();
  });

  it("recognises a designer through its spellings and inside a longer name", () => {
    expect(normalizeDesigner("Hermès", designers)).toBe("Hermes");
    expect(normalizeDesigner(undefined, designers, "Rimowa Original Cabin")).toBe("Rimowa");
  });

  it("keeps a brand the catalogue has never carried rather than losing it", () => {
    expect(normalizeDesigner("bottega veneta", designers)).toBe("Bottega Veneta");
  });

  it("allows quantities only where the catalogue already does", () => {
    expect(allowsQuantity("Bags")).toBe(true);
    expect(allowsQuantity("accessories")).toBe(true);
    expect(allowsQuantity("Footwear")).toBe(false);
  });
});

describe("toProduct", () => {
  const options = { categories: ["Bags", "Footwear"], designers: ["Rimowa"], now: 1_700_000_000_000 };

  const raw = {
    name: "  Original  Trunk Plus ",
    price: 12500,
    images: [`${SHOP}/img/a.jpg`, `${SHOP}/img/b.jpg`],
    designer: "Rimowa",
    category: "Luggage",
    sourceUrl: `${SHOP}/products/trunk`,
    via: "json" as const,
  };

  it("writes the record the catalogue stores", () => {
    const { product } = toProduct(raw, options);
    expect(product).toMatchObject({
      id: "1700000000000",
      name: "Original Trunk Plus",
      category: "Bags",
      designer: "Rimowa",
      designers: ["Rimowa"],
      price: 12500,
      rating: 5,
      allowQuantity: true,
      image: `${SHOP}/img/a.jpg`,
      productLinks: [`${SHOP}/products/trunk`],
    });
  });

  it("keeps ids apart within one run", () => {
    const first = toProduct(raw, { ...options, index: 0 }).product;
    const second = toProduct(raw, { ...options, index: 1 }).product;
    expect(first.id).not.toBe(second.id);
  });

  it("flags what the admin has to finish by hand", () => {
    const { product, warnings } = toProduct(
      { ...raw, price: undefined, category: "Homeware", designer: undefined, name: "Ceramic Vase" },
      options
    );
    expect(product.price).toBe(0);
    expect(warnings.join(" ")).toMatch(/no price/);
    expect(warnings.join(" ")).toMatch(/no designer/);
  });

  it("keeps a category the catalogue has never used rather than filing nothing", () => {
    const { product, warnings } = toProduct({ ...raw, category: "Homeware", name: "Ceramic Vase" }, options);
    expect(product.category).toBe("Homeware");
    expect(warnings.join(" ")).toMatch(/new category "Homeware"/);
  });

  it("says nothing about a category when --category decided it", () => {
    const { product, warnings } = toProduct(
      { ...raw, category: "Homeware", name: "Ceramic Vase" },
      { ...options, defaultCategory: "Bags" }
    );
    expect(product.category).toBe("Bags");
    expect(warnings.join(" ")).not.toMatch(/category/);
  });

  it("takes the --category and --designer fallbacks when nothing matches", () => {
    const { product } = toProduct(
      { ...raw, category: "Homeware", designer: undefined, name: "Ceramic Vase" },
      { ...options, defaultCategory: "Bags", defaultDesigner: "Rimowa" }
    );
    expect(product.category).toBe("Bags");
    expect(product.designer).toBe("Rimowa");
  });

  it("only keeps an old price that is actually higher", () => {
    expect(toProduct({ ...raw, oldPrice: 15000 }, options).product.oldPrice).toBe(15000);
    expect(toProduct({ ...raw, oldPrice: 10000 }, options).product.oldPrice).toBeUndefined();
  });
});

describe("dedupe", () => {
  const existing: Product[] = [
    {
      id: "1783878253962",
      name: "Black Original Trunk Plus",
      category: "Bags",
      designer: "Rimowa",
      price: 0,
      image: "https://cdn.example.com/a.jpg",
      createdAt: 1,
      rating: 5,
      productLinks: [`${SHOP}/products/trunk?ref=tracking`],
    },
  ];

  const candidate = (overrides: Partial<Product> = {}): Product => ({
    id: "1900000000000",
    name: "Black Original Trunk Plus",
    category: "Bags",
    designer: "Rimowa",
    price: 12500,
    image: `${SHOP}/img/a.jpg`,
    createdAt: 1_900_000_000_000,
    rating: 5,
    images: [`${SHOP}/img/a.jpg`],
    productLinks: [`${SHOP}/products/trunk`],
    ...overrides,
  });

  it("ignores tracking noise when comparing links", () => {
    expect(normalizeUrl(`${SHOP}/products/trunk?ref=x#gallery`)).toBe(
      normalizeUrl("https://www.shop.example.com/products/trunk/")
    );
  });

  it("skips a product already in the catalogue, by link", () => {
    const [decision] = planImport([candidate()], existing);
    expect(decision.action).toBe("skip");
    expect(decision.matchedId).toBe("1783878253962");
  });

  it("skips it by name and designer when the link is different", () => {
    const [decision] = planImport([candidate({ productLinks: [`${SHOP}/p/other-path`] })], existing);
    expect(decision.action).toBe("skip");
  });

  it("says which of the two matches it made, since one of them can be wrong", () => {
    const [byLink] = planImport([candidate()], existing);
    expect(byLink.reason).toContain("same link");

    const [byName] = planImport([candidate({ productLinks: [`${SHOP}/p/other-path`] })], existing);
    expect(byName.reason).toContain("same name and designer, different link");
  });

  it("--by-link treats two pages as two products, whatever they are called", () => {
    const sameName = candidate({ productLinks: [`${SHOP}/albums/222`] });

    expect(planImport([sameName], existing)[0].action).toBe("skip");
    expect(planImport([sameName], existing, { byLinkOnly: true })[0].action).toBe("create");
    // A product genuinely already known by its link is still skipped.
    expect(planImport([candidate()], existing, { byLinkOnly: true })[0].action).toBe("skip");
  });

  it("updates instead of skipping when asked", () => {
    const [decision] = planImport([candidate()], existing, { update: true });
    expect(decision.action).toBe("update");
  });

  it("keeps two products a supplier gave the same name, when the pages differ", () => {
    // Real case: two albums of the same blank tee, different washes, sharing
    // no photo. Collapsing them by name loses one silently.
    const decisions = planImport(
      [
        candidate({ name: "Blank Tee", productLinks: [`${SHOP}/albums/111`] }),
        candidate({ name: "Blank Tee", productLinks: [`${SHOP}/albums/222`] }),
      ],
      []
    );
    expect(decisions.map((decision) => decision.action)).toEqual(["create", "create"]);
  });

  it("drops a product the crawl reached twice", () => {
    const decisions = planImport(
      [candidate({ name: "Wool Coat", productLinks: [`${SHOP}/p/coat`] }),
       candidate({ name: "Wool Coat", productLinks: [`${SHOP}/p/coat?variant=2`] })],
      existing
    );
    expect(decisions.map((decision) => decision.action)).toEqual(["create", "skip"]);
  });

  it("puts new products on top and keeps an updated one in place", () => {
    const decisions = planImport([candidate({ name: "Wool Coat", productLinks: [`${SHOP}/p/coat`] }), candidate()], existing, { update: true });
    const merged = applyImportPlan(existing, decisions);

    expect(merged[0].name).toBe("Wool Coat");
    expect(merged).toHaveLength(2);
    // The catalogue's own id survives, so looks and orders still point at it.
    expect(merged[1].id).toBe("1783878253962");
    expect(merged[1].price).toBe(12500);
    expect(merged[1].productLinks).toContain(`${SHOP}/products/trunk?ref=tracking`);
  });
});

describe("buildImportPlan", () => {
  const catalogue: Product[] = [
    {
      id: "1",
      name: "Existing Sneaker",
      category: "Footwear",
      designer: "Rimowa",
      price: 100,
      image: "https://cdn.example.com/a.jpg",
      createdAt: 1,
      rating: 5,
      productLinks: [`${SHOP}/products/existing`],
    },
  ];

  it("reads the vocabulary off the catalogue itself", () => {
    expect(vocabularyOf(catalogue)).toEqual({ categories: ["Footwear"], designers: ["Rimowa"] });
  });

  it("turns pages into decisions and reports the pages that were not products", () => {
    const plan = buildImportPlan(
      [
        productPage({ url: `${SHOP}/products/sneaker`, markdown: "# Suede Sneaker\n\n![a](/img/s.jpg)" }),
        productPage({ url: `${SHOP}/collections/all`, markdown: "# All products" }),
      ],
      catalogue
    );

    expect(plan.decisions).toHaveLength(1);
    expect(plan.decisions[0].action).toBe("create");
    expect(plan.decisions[0].product.category).toBe("Footwear");
    expect(plan.skippedPages).toEqual([
      { url: `${SHOP}/collections/all`, reason: "no product name or no image on the page" },
    ]);
  });

  it("stops at --limit", () => {
    const pages = Array.from({ length: 5 }, (_, index) =>
      productPage({ url: `${SHOP}/products/p${index}`, markdown: `# Product ${index}\n\n![a](/img/${index}.jpg)` })
    );
    expect(buildImportPlan(pages, catalogue, { limit: 2 }).decisions).toHaveLength(2);
  });
});

describe("Firecrawl's product format", () => {
  // The shape a real /v2/scrape answered with, trimmed to two variants.
  const product = {
    title: "Men's Tree Runner - Mist (White Sole)",
    brand: "Allbirds",
    category: "Shoes",
    url: "https://www.allbirds.com/products/mens-tree-runners-mist",
    description: "A breathable and lightweight sneaker.",
    variants: [
      {
        sku: "TR3MMST080",
        title: "8",
        values: { size: "8", color: "Mist" },
        price: { amount: 100, currency: "USD", formatted: "$100.00" },
        availability: { inStock: true },
        images: [{ url: "https://cdn.shopify.com/s/files/shoe-left.png" }],
      },
      {
        sku: "TR3MMST090",
        title: "9",
        values: { size: "9", color: "Mist" },
        price: { amount: 80, currency: "USD", formatted: "$80.00" },
        compareAtPrice: { amount: 140, currency: "USD" },
        availability: { inStock: false },
        images: [
          { url: "https://cdn.shopify.com/s/files/shoe-left.png" },
          { url: "https://cdn.shopify.com/s/files/shoe-top.png" },
        ],
      },
    ],
  };

  const page = { url: product.url, product };

  it("reads the fields the shop published", () => {
    const extracted = extractProduct(page);
    expect(extracted?.name).toBe("Men's Tree Runner - Mist (White Sole)");
    expect(extracted?.designer).toBe("Allbirds");
    expect(extracted?.category).toBe("Shoes");
    expect(extracted?.description).toBe("A breathable and lightweight sneaker.");
    expect(extracted?.via).toBe("product");
  });

  it("folds the variants into one product: lowest price, every image, all sizes", () => {
    const extracted = extractProduct(page);
    expect(extracted?.price).toBe(80);
    expect(extracted?.oldPrice).toBe(140);
    expect(extracted?.images).toEqual([
      "https://cdn.shopify.com/s/files/shoe-left.png",
      "https://cdn.shopify.com/s/files/shoe-top.png",
    ]);
    expect(extracted?.sizes).toEqual(["8", "9"]);
    expect(extracted?.colors).toEqual(["Mist"]);
  });

  it("outranks the page's own markdown", () => {
    const extracted = extractProduct({
      ...page,
      markdown: "# Some Other Heading\n\n$999\n\n![a](/img/other.jpg)",
    });
    expect(extracted?.name).toBe("Men's Tree Runner - Mist (White Sole)");
    expect(extracted?.price).toBe(80);
  });

  it("becomes a catalogue product in our own words", () => {
    const extracted = extractProduct(page);
    const { product: mapped } = toProduct(extracted!, {
      categories: ["Bags", "Footwear"],
      designers: ["Rimowa"],
      now: 1_700_000_000_000,
    });
    expect(mapped.category).toBe("Footwear");
    expect(mapped.designer).toBe("Allbirds");
    expect(mapped.sizes).toEqual(["8", "9"]);
    expect(mapped.price).toBe(80);
    expect(mapped.oldPrice).toBe(140);
  });
});

describe("asking Firecrawl", () => {
  it("recognises a single product page from its link", () => {
    expect(looksLikeProductUrl("https://shop.com/products/black-trunk")).toBe(true);
    expect(looksLikeProductUrl("https://loja.com.br/produto/bolsa-preta")).toBe(true);
    expect(looksLikeProductUrl("https://m.1688.com/offer/1052489529293.html")).toBe(true);
    expect(looksLikeProductUrl("https://shop.com/item?id=99")).toBe(true);

    expect(looksLikeProductUrl("https://shop.com/collections/mens")).toBe(false);
    expect(looksLikeProductUrl("https://shop.com")).toBe(false);
  });

  it("scrapes a product page and crawls anything else, unless told otherwise", () => {
    expect(modeFor("https://shop.com/products/x")).toBe("scrape");
    expect(modeFor("https://shop.com/collections/mens")).toBe("crawl");
    expect(modeFor("https://shop.com/products/x", "crawl")).toBe("crawl");
  });

  it("always asks for the product format first, and for HTML only on request", () => {
    expect(scrapeBody("https://shop.com/products/x")).toEqual({
      url: "https://shop.com/products/x",
      formats: [{ type: "product" }, "markdown"],
    });
    expect(scrapeBody("https://shop.com/products/x", { withHtml: true }).formats).toContain("html");
  });

  it("puts a page limit on every crawl, so a run cannot cost what nobody meant", () => {
    expect(crawlBody("https://shop.com", 25)).toEqual({
      url: "https://shop.com",
      limit: 25,
      scrapeOptions: { formats: [{ type: "product" }, "markdown"] },
    });
  });

  it("names the saved export after the shop and the hour", () => {
    expect(exportFileName("https://www.shop.com/collections/mens", new Date("2026-08-27T09:30:00Z"))).toBe(
      "shop.com-202608270930.json"
    );
  });
});

describe("listing pages", () => {
  it("knows a category page from a product page", () => {
    expect(isListingUrl("https://shop.com/collections/mens")).toBe(true);
    expect(isListingUrl("https://loja.com.br/categoria/bolsas")).toBe(true);
    expect(isListingUrl("https://shop.com")).toBe(true);

    expect(isListingUrl("https://shop.com/products/black-trunk")).toBe(false);
    // Shopify puts products under a collection; the product half wins.
    expect(isListingUrl("https://shop.com/collections/mens/products/runner")).toBe(false);
  });

  it("drops a category page the guessing layers mistook for a product", () => {
    const plan = buildImportPlan(
      [
        {
          url: "https://shop.com/collections/mens",
          metadata: { "og:title": "Men's Shoes | Example Shop", "og:image": "https://shop.com/img/grid.jpg" },
          markdown: "# Men's Shoes\n\n$100\n\n![tile](/img/tile-1.jpg)",
        },
      ],
      []
    );

    expect(plan.decisions).toHaveLength(0);
    expect(plan.skippedPages[0].reason).toMatch(/listing page/);
  });

  it("keeps a product the shop itself declared, wherever it lives", () => {
    const plan = buildImportPlan(
      [
        {
          url: "https://shop.com/collections/mens",
          product: {
            title: "Wool Runner",
            brand: "Allbirds",
            variants: [{ price: { amount: 100 }, images: [{ url: "https://shop.com/img/a.jpg" }] }],
          },
        },
      ],
      []
    );

    expect(plan.decisions).toHaveLength(1);
    expect(plan.decisions[0].product.name).toBe("Wool Runner");
  });
});

describe("Yupoo album sites", () => {
  const SITE = "https://supplier.x.yupoo.com";

  // The index writes a card on one line with an absolute href.
  const indexCard = `<a class="album__main album1__main" title="220gsm washed black blank t-shirt" href="${SITE}/albums/243659479?uid=1">
      <img class="album__img autocover" src="https://photo.yupoo.com/supplier/ea4af78481/medium.jpg"></a>`;

  // The category pages spread the same card over several lines, relative href.
  const categoryCard = `<a
        class="album__main"
            title="Heavyweight hoodie"
            href="/albums/9911?uid=1&isSubCate=true&referrercate=370889"
        ><div class="album__imgwrap"></div></a>`;

  it("reads a card from either page's markup", () => {
    expect(parseAlbumCards(indexCard, SITE)).toEqual([
      { id: "243659479", url: `${SITE}/albums/243659479?uid=1`, title: "220gsm washed black blank t-shirt" },
    ]);
    expect(parseAlbumCards(categoryCard, SITE)[0]).toMatchObject({
      id: "9911",
      title: "Heavyweight hoodie",
    });
    expect(parseAlbumCards(categoryCard, SITE)[0].url).toContain(`${SITE}/albums/9911`);
  });

  it("counts an album once however many times the page repeats it", () => {
    expect(parseAlbumCards(indexCard + indexCard, SITE)).toHaveLength(1);
  });

  it("decodes the entities a title arrives with, named and numeric", () => {
    // This supplier writes every apostrophe in hex.
    expect(decodeEntities("Vans Sk8-Low &#x27;Contrast Black White&#x27;")).toBe(
      "Vans Sk8-Low 'Contrast Black White'"
    );
    expect(decodeEntities("Tee &#39;Washed&#39; &amp; Loose")).toBe("Tee 'Washed' & Loose");
    expect(decodeEntities("&quot;Big&quot;&nbsp;Logo")).toBe('"Big" Logo');
    // Not a code point anyone meant — left as written rather than guessed at.
    expect(decodeEntities("Style &#xZZ; 36")).toBe("Style &#xZZ; 36");
  });

  it("tells a category URL from the whole site, and from one album", () => {
    expect(yupooCategoryId(`${SITE}/categories/5287790`)).toBe("5287790");
    expect(yupooCategoryId(`${SITE}/categories/5287790?page=2`)).toBe("5287790");
    expect(yupooCategoryId(`${SITE}/albums`)).toBeUndefined();
    // An album is one product, not a shelf: it says nothing about filing.
    expect(yupooCategoryId(`${SITE}/albums/9911?referrercate=5287790`)).toBeUndefined();
    expect(yupooCategoryId("not a url")).toBeUndefined();
  });

  it("reads a category's own name for itself, without the site's furniture", () => {
    const head = `<meta property="og:title" content="Vans | 分类 | BoostMaster(BMLin) | Supplier Product Catalog | 又拍图片管家">`;
    expect(parseCategoryName(head)).toBe("Vans");
    expect(parseCategoryName(`<meta property="og:title" content="T-SHIRT &amp; POLO | 分类">`)).toBe(
      "T-SHIRT & POLO"
    );
    expect(parseCategoryName("<html></html>")).toBeUndefined();
  });

  it("reads the site's own categories", () => {
    const nav = `<a href="/categories/370887?isSubCate=true"><li>T-SHIRT</li></a>
                 <a href="/categories/370889?isSubCate=true"><li>HOODIE</li></a>`;
    expect(parseCategoryLinks(nav, SITE)).toEqual([
      { url: `${SITE}/categories/370887?isSubCate=true`, name: "T-SHIRT" },
      { url: `${SITE}/categories/370889?isSubCate=true`, name: "HOODIE" },
    ]);
  });

  const albumHtml = `<meta name="description" itemprop="description" content="https://supplierclo.com/products/washed-tee - Supplier Product Catalog">
    <div class="showalbumheader__gallerytitle">220gsm washed black blank t-shirt</div>
    <img alt="logo" src="https://s.yupoo.com/website/logo.png">
    <img alt="696A1326.jpg" data-width="1200" data-height="1600"
         data-src="https://photo.yupoo.com/supplier/ea4af78481/big.jpg"
         data-origin-src="https://photo.yupoo.com/supplier/ea4af78481/f3d2eaf0.jpg">
    <img alt="696A1333.jpg"
         data-src="https://photo.yupoo.com/supplier/a87080adfd/big.jpg">`;

  it("takes the lazy-loaded photos, never the placeholder or the site's logo", () => {
    const album = parseAlbumPage(albumHtml, `${SITE}/albums/243659479`);
    expect(album?.title).toBe("220gsm washed black blank t-shirt");
    expect(album?.images).toEqual([
      "https://photo.yupoo.com/supplier/ea4af78481/big.jpg",
      "https://photo.yupoo.com/supplier/a87080adfd/big.jpg",
    ]);
  });

  it("finds the supplier's real shop, which albums hide in their meta description", () => {
    expect(parseAlbumPage(albumHtml, SITE)?.shopUrl).toBe("https://supplierclo.com/products/washed-tee");
  });

  it("is not an album when it has no photos", () => {
    expect(parseAlbumPage('<div class="showalbumheader__gallerytitle">Empty</div>', SITE)).toBeNull();
  });

  it("asks for the 1200px rendering, whichever size the page linked", () => {
    expect(atSize("https://photo.yupoo.com/s/ea4af78481/medium.jpg")).toBe(
      "https://photo.yupoo.com/s/ea4af78481/big.jpg"
    );
    expect(atSize("https://photo.yupoo.com/s/ea4af78481/f3d2eaf0.jpg")).toBe(
      "https://photo.yupoo.com/s/ea4af78481/big.jpg"
    );
    // A PNG upload is rendered as big.png; asking for big.jpg gets nothing.
    expect(atSize("https://photo.yupoo.com/s/850b52c787/square.png")).toBe(
      "https://photo.yupoo.com/s/850b52c787/big.png"
    );
  });

  it("counts a photo once, not once per rendering the page wrote", () => {
    // The real page writes every picture three times: the gallery big, a
    // medium copy and a square thumbnail. Only the gallery carries an album id.
    const thrice = `<div class="showalbumheader__gallerytitle">Tee</div>
      <img alt="cover" src="https://photo.yupoo.com/s/aaa111/medium.jpg">
      <img alt="1.jpg" data-album-id="99" data-src="https://photo.yupoo.com/s/aaa111/big.jpg">
      <img alt="1.jpg" data-src="https://photo.yupoo.com/s/aaa111/medium.jpg">
      <img data-src="https://photo.yupoo.com/s/aaa111/square.jpg">
      <img alt="2.jpg" data-album-id="99" data-src="https://photo.yupoo.com/s/bbb222/big.jpg">`;

    expect(parseAlbumPage(thrice, SITE)?.images).toEqual([
      "https://photo.yupoo.com/s/aaa111/big.jpg",
      "https://photo.yupoo.com/s/bbb222/big.jpg",
    ]);
  });

  it("hands the album to the importer as a product page", () => {
    const album = parseAlbumPage(albumHtml, `${SITE}/albums/243659479`)!;
    const page = albumToPage(album, `${SITE}/albums/243659479`, { category: "T-SHIRT", brand: "Union Kingdom" });
    const extracted = extractProduct(page);

    expect(extracted?.via).toBe("product");
    expect(extracted?.name).toBe("220gsm washed black blank t-shirt");
    expect(extracted?.designer).toBe("Union Kingdom");
    expect(extracted?.images).toHaveLength(2);
    // The title is the only prose the site has, so that is the description.
    expect(extracted?.description).toBe("220gsm washed black blank t-shirt");
    // The supplier's own shop rides along as a second reference link.
    expect(extracted?.links).toEqual(["https://supplierclo.com/products/washed-tee"]);
  });

  it("keeps both the album and the supplier's shop as reference links", () => {
    const album = parseAlbumPage(albumHtml, `${SITE}/albums/243659479`)!;
    const page = albumToPage(album, `${SITE}/albums/243659479`);
    const { product } = toProduct(extractProduct(page)!, { categories: [], designers: [] });

    expect(product.productLinks).toEqual([
      `${SITE}/albums/243659479`,
      "https://supplierclo.com/products/washed-tee",
    ]);
  });

  it("knows a Yupoo site from any other", () => {
    expect(isYupooUrl(`${SITE}/albums`)).toBe(true);
    expect(isYupooUrl("https://photo.yupoo.com/x/y/big.jpg")).toBe(true);
    expect(isYupooUrl("https://shop.com/products/x")).toBe(false);
  });
});

describe("toProduct display crops", () => {
  const raw = {
    name: "Sk8-Low",
    category: "Footwear",
    designer: "Vans",
    images: ["https://example.com/a.jpg"],
    sourceUrl: "https://example.com/p",
  };
  const options = { categories: ["Footwear", "Bags"], designers: ["Vans"] };

  it("gives imported footwear the crop the rest of the catalogue's shoes use", () => {
    // Without this the tile falls back to object-contain and letterboxes, which
    // is how 72 Vans arrived looking nothing like the rest of the grid.
    const { product } = toProduct(raw, options);
    expect(product.displayCrops).toEqual({ 0: { x: 50, y: 100, zoom: 1 } });
  });

  it("leaves everything else uncropped, as the catalogue has it", () => {
    const { product } = toProduct({ ...raw, category: "Bags" }, options);
    expect(product.displayCrops).toBeUndefined();
  });

  it("matches the category however the shop capitalised it", () => {
    const { product } = toProduct({ ...raw, category: "footwear" }, options);
    expect(product.displayCrops).toEqual({ 0: { x: 50, y: 100, zoom: 1 } });
  });
});

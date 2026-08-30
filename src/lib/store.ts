// Only the small lists and the types: the module's 672-product array is a
// duplicate of catalog.json below, and importing it here shipped the whole
// catalogue twice.
import { Product, categories as defaultCategories, designers as defaultDesigners } from "@/data/products";
// Imported as raw text, not as a module. As a JSON module the bundler turns it
// into a JavaScript object literal that the engine builds into 672 live objects
// on every single page load — heap and parse time spent whether or not the
// catalogue needs seeding, which is most of the time. As text it is one string
// the engine keeps as-is, parsed only on the visit that actually seeds.
import catalogSeedRaw from "@/data/catalog.json?raw";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_VOICE_ID } from "@/lib/voiceLines";

// Keys
const PRODUCTS_KEY = "villaoro_products";
const DESIGN_KEY = "villaoro_design";
const AI_KEY = "villaoro_ai_config";
const LOOKS_KEY = "villaoro_looks";
const CATEGORIES_KEY = "villaoro_categories";
const DESIGNERS_KEY = "villaoro_designers";
const CATALOG_VERSION_KEY = "villaoro_catalog_version";
// Which ids the previous seed contained. Seed ids and admin-created ids are
// both `Date.now().toString()`, so this ledger is the only way to tell a
// product the catalogue deliberately dropped from one the admin added here.
const SEED_IDS_KEY = "villaoro_seed_ids";
const CATALOG_VERSION = "v31";
/**
 * A one-off correction, kept because a seed edit alone cannot undo it.
 *
 * The seven Swatch x Audemars Piguet watches were imported with the standard
 * centred display crop. Their photographs are 3:2 landscape, and covering a 4:5
 * tile with one renders the image at 187% width and slices 44% off each side —
 * so the tile showed a strap end or a corner of the case, never the watch. They
 * are right with no crop at all: `ProductCard` then falls back to
 * `object-contain` and the whole photograph sits in proportion on the tile.
 *
 * They are now framed by `autoFrame`, which reads where the watch actually sits
 * and centres the tile on it.
 *
 * `displayCrops` is ADMIN_OWNED, so `mergeSeed` keeps whatever a browser has
 * already stored no matter what the seed says. Correcting `catalog.json`
 * therefore reaches first-time visitors only; for these seven, and once, the
 * catalogue's framing is allowed to win over the stored one.
 */
const CROP_RESET_KEY = "villaoro_crop_reset";
const CROP_RESET_VERSION = "ap-landscape-v1";
const CROP_RESET_IDS = new Set([
  "1788030948540",
  "1788030948541",
  "1788030948542",
  "1788030948543",
  "1788030948544",
  "1788030948545",
  "1788030948546",
]);
const DESIGN_VERSION_KEY = "villaoro_design_version";
const DESIGN_VERSION = "v2";

// Types
export interface DesignSettings {
  minimalMode: boolean;
  borderRadius: string;
  buttonColor: string;
  musicUrl?: string;
  enableNewsPage?: boolean;
  enableSalePage?: boolean;
  defaultCategory?: string;
  showPrices?: boolean;
  alwaysShowTourEmail?: string;
  /** Master switch for the spoken assistant. Off here means nobody hears it. */
  assistantEnabled?: boolean;
  /** ElevenLabs voice id. Changing it invalidates nothing — clips are cached per voice. */
  assistantVoiceId?: string;
  /** Playback volume for the assistant, 0–1. */
  assistantVolume?: number;
}

export interface AiConfig {
  suggestions: string[];
  tone: string;
  featuredIds: string[];
}

export interface Look {
  id: string;
  name: string;
  modelImage: string;
  productIds: string[];
}

/**
 * What the admin owns on a product, and the seed therefore must not overwrite.
 *
 * Everything else — name, price, category, designer — belongs to the catalogue
 * import and should move forward with each new seed.
 */
const ADMIN_OWNED = [
  "image",
  "images",
  "originalImage",
  "removeBackground",
  "detailImage",
  "displayCrops",
  "video",
] as const;

/**
 * Fold a new catalogue seed into what is already stored, keeping admin work.
 *
 * This used to be a straight overwrite, and it is why cut-outs and 16:9 detail
 * images kept vanishing: every bump of CATALOG_VERSION threw away every edit,
 * and `catalog.json` carries no `detailImage` at all, so there was nothing to
 * restore them from. A product is matched by id; a stored product that is in
 * neither the new seed nor the previous one was created in the admin and is
 * kept; one that was in the previous seed but not this one was dropped by the
 * catalogue on purpose and is allowed to go.
 */
export function mergeSeed(seedRaw: string, storedRaw: string | null, priorSeedIds: Set<string>): string {
  if (!storedRaw) return seedRaw;

  let stored: Product[];
  try {
    stored = JSON.parse(storedRaw) as Product[];
  } catch {
    // Unreadable storage is worse than a stale one; start clean.
    return seedRaw;
  }

  const seeded = JSON.parse(seedRaw) as Product[];
  const seedIds = new Set(seeded.map((p) => p.id));
  const byId = new Map(stored.map((p) => [p.id, p]));

  const merged = seeded.map((fresh) => {
    const prior = byId.get(fresh.id);
    if (!prior) return fresh;
    const kept: Partial<Product> = {};
    for (const field of ADMIN_OWNED) {
      if (prior[field] !== undefined) (kept as Record<string, unknown>)[field] = prior[field];
    }
    return { ...fresh, ...kept };
  });

  // Admin-created products keep their place at the front, which is where
  // `saveProduct` unshifts them.
  const localOnly = stored.filter((p) => !seedIds.has(p.id) && !priorSeedIds.has(p.id));
  return JSON.stringify([...localOnly, ...merged]);
}

function readSeedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

// Initialization
const initStore = () => {
  const currentVersion = localStorage.getItem(CATALOG_VERSION_KEY);
  if (currentVersion !== CATALOG_VERSION) {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    localStorage.setItem(PRODUCTS_KEY, mergeSeed(catalogSeedRaw, stored, readSeedIds()));
    const seeded = JSON.parse(catalogSeedRaw) as Product[];
    localStorage.setItem(SEED_IDS_KEY, JSON.stringify(seeded.map((p) => p.id)));
    const cats = Array.from(new Set(seeded.map(p => p.category))).sort();
    const dess = Array.from(new Set(seeded.map(p => p.designer))).sort();
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
    localStorage.setItem(DESIGNERS_KEY, JSON.stringify(dess));
    localStorage.removeItem(LOOKS_KEY); // Force looks reseed
    localStorage.setItem(CATALOG_VERSION_KEY, CATALOG_VERSION);
  } else if (!localStorage.getItem(PRODUCTS_KEY)) {
    localStorage.setItem(PRODUCTS_KEY, catalogSeedRaw);
    const seeded = JSON.parse(catalogSeedRaw) as Product[];
    localStorage.setItem(SEED_IDS_KEY, JSON.stringify(seeded.map((p) => p.id)));
  }
  if (localStorage.getItem(CROP_RESET_KEY) !== CROP_RESET_VERSION) {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) {
      try {
        const products = JSON.parse(raw) as Product[];
        const fromSeed = new Map(
          (JSON.parse(catalogSeedRaw) as Product[])
            .filter((p) => CROP_RESET_IDS.has(p.id))
            .map((p) => [p.id, p.displayCrops]),
        );
        let changed = false;
        for (const product of products) {
          if (!CROP_RESET_IDS.has(product.id)) continue;
          const seeded = fromSeed.get(product.id);
          if (seeded) {
            product.displayCrops = seeded;
            changed = true;
          } else if (product.displayCrops) {
            delete product.displayCrops;
            changed = true;
          }
        }
        if (changed) localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      } catch {
        // Unreadable storage is already handled by the seed path above.
      }
    }
    localStorage.setItem(CROP_RESET_KEY, CROP_RESET_VERSION);
  }

  if (localStorage.getItem(DESIGN_VERSION_KEY) !== DESIGN_VERSION) {
    localStorage.removeItem(DESIGN_KEY);
    localStorage.setItem(DESIGN_VERSION_KEY, DESIGN_VERSION);
  }
  if (!localStorage.getItem(DESIGN_KEY)) {
    localStorage.setItem(
      DESIGN_KEY,
      JSON.stringify({ minimalMode: true, borderRadius: "0px", buttonColor: "hsl(var(--primary))", musicUrl: "https://www.youtube.com/watch?v=bk6Xst6euQk", enableNewsPage: true, enableSalePage: false, showPrices: false })
    );
  }
  if (!localStorage.getItem(AI_KEY)) {
    localStorage.setItem(
      AI_KEY,
      JSON.stringify({
        suggestions: [
          "Show me all products",
          "I need a full outfit",
          "What footwear do you have?",
          "Show me something under $100",
          "What are your bestsellers?",
          "Style me for a dinner",
        ],
        tone: "luxury",
        featuredIds: [],
      })
    );
  }
  if (!localStorage.getItem(LOOKS_KEY)) {
    localStorage.setItem(
      LOOKS_KEY,
      JSON.stringify([
        {
          id: "look-1",
          name: "Minimalist Look 1",
          modelImage: "/images/fashion_model_minimal_look_1776798867177.png",
          productIds: ["1778433652573", "1800000000001", "1780164035819"], 
        },
        {
          id: "look-2",
          name: "Minimalist Look 2",
          modelImage: "/images/media__1776798670043.png",
          productIds: ["1780155796617", "1778433408141", "1800000000002", "1800000000003"],
        },
        {
          id: "look-3",
          name: "Minimalist Look 3",
          modelImage: "/images/media__1776798653612.png", 
          productIds: ["1780178615436", "1778447161445", "1780164146319"],
        }
      ])
    );
  }
  if (!localStorage.getItem(CATEGORIES_KEY)) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
  }
  if (!localStorage.getItem(DESIGNERS_KEY)) {
    localStorage.setItem(DESIGNERS_KEY, JSON.stringify(defaultDesigners));
  }
  
  // Migration: only Bags, Caps, and Accessories should have allowQuantity = true
  if (!localStorage.getItem('villaoro_qty_migrated_v2')) {
    const data = localStorage.getItem(PRODUCTS_KEY);
    if (data) {
      try {
        const products = JSON.parse(data);
        let changed = false;
        const allowedCats = ['bags', 'caps', 'accessories'];
        const updated = products.map((p: Product) => {
          const cat = p.category ? p.category.toLowerCase() : '';
          const shouldAllow = allowedCats.includes(cat);
          if (p.allowQuantity !== shouldAllow) {
            changed = true;
            return { ...p, allowQuantity: shouldAllow };
          }
          return p;
        });
        if (changed) {
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
        }
      } catch (e) {}
    }
    localStorage.setItem('villaoro_qty_migrated_v2', 'true');
  }
};

// Product CRUD

// The catalogue is ~470KB of JSON in localStorage, and every page that shows
// products asks for it two or three times as it mounts. Parsing it each time
// costs both the parse and a fresh graph of 672 objects for the collector to
// clean up afterwards — enough, on an older phone, to show as a stall between
// screens. The parse is kept until the stored text itself changes, so a write
// anywhere (this tab or another) is still picked up on the next read.
let parsedProductsRaw: string | null = null;
let parsedProducts: Product[] = [];

export function getProducts(): Product[] {
  const data = localStorage.getItem(PRODUCTS_KEY);
  if (!data) return [];
  if (data !== parsedProductsRaw) {
    parsedProducts = JSON.parse(data);
    parsedProductsRaw = data;
  }
  // A copy of the list, so callers that reorder or splice what they get back
  // (saveProduct does) can't reach into the cache — exactly as they could not
  // reach into a freshly parsed array before.
  return parsedProducts.slice();
}

/**
 * Write the catalogue back, or explain precisely why it would not fit.
 *
 * A quota failure rejects the whole `setItem`, so a single oversized product
 * stops every *other* edit from saving too. That reads as "nothing saves any
 * more" rather than as anything to do with images, which is why the message
 * names the cause: the fix is to get uploads working, and no amount of using
 * "slightly smaller images" — what this used to advise — would reach it.
 *
 * Measured against the real catalogue: 747 products serialise to 592KB, and a
 * cut-out kept as a data URL adds about 105KB each, so the 45th one crosses the
 * 5MB origin limit and every save after it fails.
 */
function writeProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event('products-updated'));
  } catch (e) {
    console.error("Storage quota exceeded", e);
    const inline = products.filter((p) => typeof p.image === "string" && p.image.startsWith("data:"));
    if (inline.length === 0) {
      throw new Error("The browser's storage is full, so this change was not saved.");
    }
    const megabytes = (
      inline.reduce((total, p) => total + p.image.length, 0) / 1048576
    ).toFixed(1);
    throw new Error(
      `Storage is full: ${inline.length} product${inline.length === 1 ? "" : "s"} ` +
        `hold an image kept in this browser (${megabytes}MB) because the upload ` +
        `service was unavailable. Deploy the r2-upload-url function, or remove ` +
        `those images, and saving will work again.`
    );
  }
}

export function saveProduct(product: Product) {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.unshift(product);
  }
  writeProducts(products);
}

/**
 * Apply many product changes in one write.
 *
 * `saveProduct` re-serialises all 672 products per call, so applying a few
 * hundred edits one at a time is quadratic and slow enough to look frozen. The
 * image studio's batch run needs exactly this.
 */
export function saveProductsBulk(updates: Product[]): void {
  if (updates.length === 0) return;
  const byId = new Map(updates.map((p) => [p.id, p]));
  const products = getProducts().map((p) => byId.get(p.id) ?? p);
  writeProducts(products);
}

export function deleteProduct(id: string) {
  const products = getProducts().filter((p) => p.id !== id);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function updateProductsList(newOrder: Product[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(newOrder));
}

// Settings getters/setters
export function getDesignSettings(): DesignSettings {
  const data = localStorage.getItem(DESIGN_KEY);
  const parsed = data ? JSON.parse(data) : {};
  const defaultMusic = "https://www.youtube.com/watch?v=bk6Xst6euQk";
  
  return {
    minimalMode: true,
    borderRadius: "0px",
    buttonColor: "hsl(var(--primary))",
    enableNewsPage: true,
    enableSalePage: false,
    defaultCategory: "Footwear",
    showPrices: false,
    alwaysShowTourEmail: "",
    assistantEnabled: true,
    assistantVoiceId: DEFAULT_VOICE_ID,
    assistantVolume: 1,
    ...parsed,
    musicUrl: parsed.musicUrl || defaultMusic,
  };
}

export const saveLooks = (looks: Look[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('villaoro_looks', JSON.stringify(looks));
  // Dispatch custom event to notify listeners (e.g. other tabs/components)
  window.dispatchEvent(new Event('looksUpdated'));
};

// --- Orders State ---

export interface OrderItem {
  id: string; // Cart item ID
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  image?: string;
  designer?: string;
}

export type OrderStatus = "Pending" | "Paid" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

export interface Order {
  id: string;
  createdAt: number;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  customerInfo: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await (supabase as any)
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Failed to fetch orders", error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    createdAt: row.created_at,
    status: row.status as OrderStatus,
    total: row.total,
    items: row.items as OrderItem[],
    customerInfo: row.customer_info as Order['customerInfo']
  }));
};

export const saveOrder = async (order: Order): Promise<void> => {
  const { error } = await (supabase as any)
    .from('orders')
    .upsert({
      id: order.id,
      created_at: order.createdAt,
      status: order.status,
      total: order.total,
      items: order.items,
      customer_info: order.customerInfo
    });

  if (error) {
    console.error("Failed to save order", error);
    throw error;
  }
  
  window.dispatchEvent(new Event('ordersUpdated'));
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<void> => {
  const { error } = await (supabase as any)
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    console.error("Failed to update order status", error);
    throw error;
  }
  
  window.dispatchEvent(new Event('ordersUpdated'));
};

export function saveDesignSettings(settings: DesignSettings) {
  localStorage.setItem(DESIGN_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('design-settings-updated'));
}

export function getAiConfig(): AiConfig {
  const data = localStorage.getItem(AI_KEY);
  return data ? JSON.parse(data) : { suggestions: [], tone: "luxury", featuredIds: [] };
}

export function saveAiConfig(config: AiConfig) {
  localStorage.setItem(AI_KEY, JSON.stringify(config));
}

export function getLooks(): Look[] {
  const data = localStorage.getItem(LOOKS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveLook(look: Look) {
  const looks = getLooks();
  const index = looks.findIndex((l) => l.id === look.id);
  if (index >= 0) {
    looks[index] = look;
  } else {
    looks.unshift(look);
  }
  localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
}

export function deleteLook(id: string) {
  const looks = getLooks().filter((l) => l.id !== id);
  localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
}

// Categories & Designers CRUD
export function getCategories(): string[] {
  const data = localStorage.getItem(CATEGORIES_KEY);
  const storedCategories = data ? JSON.parse(data) : [];
  const productCategories = getProducts().map(p => p.category).filter(Boolean);
  const uniqueCategories = Array.from(new Set([...storedCategories, ...productCategories]));
  
  // Custom strategic order
  const priorityOrder = [
    "Footwear",   // Calçados
    "T-Shirt",    // Camisetas
    "Tank top",   // Regatas
  ];

  return uniqueCategories.sort((a, b) => {
    const indexA = priorityOrder.indexOf(a);
    const indexB = priorityOrder.indexOf(b);
    
    // Both in priority list: sort by priority order
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // Only A is in priority list: A comes first
    if (indexA !== -1) return -1;
    // Only B is in priority list: B comes first
    if (indexB !== -1) return 1;
    
    // Neither in priority list: sort alphabetically
    return a.localeCompare(b);
  });
}

export function saveCategories(categories: string[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function getDesigners(): string[] {
  const data = localStorage.getItem(DESIGNERS_KEY);
  const storedDesigners = data ? JSON.parse(data) : [];
  const productDesigners = getProducts().flatMap(p => p.designers || [p.designer]).filter(Boolean);
  return Array.from(new Set([...storedDesigners, ...productDesigners])).sort();
}

export function saveDesigners(designers: string[]) {
  localStorage.setItem(DESIGNERS_KEY, JSON.stringify(designers));
}

// Data Export/Import
export function exportDatabase() {
  const data = {
    products: getProducts(),
    categories: getCategories(),
    designers: getDesigners(),
    design: getDesignSettings(),
    ai: getAiConfig(),
    looks: getLooks()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `villaoro_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importDatabase(jsonData: any) {
  // Check if it's a direct array of products (like the catalog file)
  if (Array.isArray(jsonData)) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(jsonData));
    toast.success("Products imported successfully");
  } else {
    // It's a full backup object
    if (jsonData.products) localStorage.setItem(PRODUCTS_KEY, JSON.stringify(jsonData.products));
    if (jsonData.categories) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(jsonData.categories));
    if (jsonData.designers) localStorage.setItem(DESIGNERS_KEY, JSON.stringify(jsonData.designers));
    if (jsonData.design) localStorage.setItem(DESIGN_KEY, JSON.stringify(jsonData.design));
    if (jsonData.ai) localStorage.setItem(AI_KEY, JSON.stringify(jsonData.ai));
    if (jsonData.looks) localStorage.setItem(LOOKS_KEY, JSON.stringify(jsonData.looks));
    toast.success("Full backup restored successfully");
  }
  
  setTimeout(() => window.location.reload(), 1000);
}

// ========== Customer Suggestions ==========
export interface CustomerSuggestion {
  id: string;
  type: 'product_request' | 'feedback';
  productName?: string;
  productBrand?: string;
  message?: string;
  email?: string;
  searchQuery?: string;
  createdAt: number;
}

const SUGGESTIONS_KEY = 'villaoro_customer_suggestions';

export const getCustomerSuggestions = async (): Promise<CustomerSuggestion[]> => {
  const { data, error } = await (supabase as any)
    .from('customer_suggestions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Failed to fetch suggestions", error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    createdAt: row.created_at,
    type: row.type as 'product_request' | 'feedback',
    productName: row.product_name,
    productBrand: row.product_brand,
    message: row.message,
    email: row.email,
    searchQuery: row.search_query
  }));
};

export const saveCustomerSuggestion = async (suggestion: CustomerSuggestion): Promise<void> => {
  const { error } = await (supabase as any)
    .from('customer_suggestions')
    .upsert({
      id: suggestion.id,
      created_at: suggestion.createdAt,
      type: suggestion.type,
      product_name: suggestion.productName,
      product_brand: suggestion.productBrand,
      message: suggestion.message,
      email: suggestion.email,
      search_query: suggestion.searchQuery
    });

  if (error) {
    console.error("Failed to save suggestion", error);
    throw error;
  }
  
  window.dispatchEvent(new Event('suggestionsUpdated'));
};

initStore();

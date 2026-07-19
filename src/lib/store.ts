import { products as initialProducts, Product, categories as defaultCategories, designers as defaultDesigners } from "@/data/products";
import catalogSeed from "@/data/catalog.json";
import { toast } from "sonner";

// Keys
const PRODUCTS_KEY = "villaoro_products";
const DESIGN_KEY = "villaoro_design";
const AI_KEY = "villaoro_ai_config";
const LOOKS_KEY = "villaoro_looks";
const CATEGORIES_KEY = "villaoro_categories";
const DESIGNERS_KEY = "villaoro_designers";
const CATALOG_VERSION_KEY = "villaoro_catalog_version";
const CATALOG_VERSION = "v14";

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

// Initialization
const initStore = () => {
  const currentVersion = localStorage.getItem(CATALOG_VERSION_KEY);
  if (currentVersion !== CATALOG_VERSION) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(catalogSeed));
    const cats = Array.from(new Set((catalogSeed as Product[]).map(p => p.category))).sort();
    const dess = Array.from(new Set((catalogSeed as Product[]).map(p => p.designer))).sort();
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
    localStorage.setItem(DESIGNERS_KEY, JSON.stringify(dess));
    localStorage.removeItem(LOOKS_KEY); // Force looks reseed
    localStorage.setItem(CATALOG_VERSION_KEY, CATALOG_VERSION);
  } else if (!localStorage.getItem(PRODUCTS_KEY)) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(catalogSeed));
  }
  if (!localStorage.getItem(DESIGN_KEY)) {
    localStorage.setItem(
      DESIGN_KEY,
      JSON.stringify({ minimalMode: true, borderRadius: "0px", buttonColor: "hsl(var(--primary))", musicUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk" })
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
};

// Product CRUD
export function getProducts(): Product[] {
  const data = localStorage.getItem(PRODUCTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveProduct(product: Product) {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    products[index] = product;
  } else {
    products.unshift(product);
  }
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event('products-updated'));
  } catch (e) {
    console.error("Storage quota exceeded", e);
    alert("The site database is full because of high-quality images. Please try to use slightly smaller images or remove some products.");
  }
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
  return { 
    minimalMode: true, 
    borderRadius: "0px", 
    buttonColor: "hsl(var(--primary))", 
    musicUrl: parsed.musicUrl || "https://www.youtube.com/watch?v=jfKfPfyJRdk", 
    enableNewsPage: true,
    enableSalePage: true,
    defaultCategory: "Footwear",
    showPrices: true,
    ...parsed,
    // Ensure musicUrl defaults if it was saved as empty string
    musicUrl: parsed.musicUrl || "https://www.youtube.com/watch?v=jfKfPfyJRdk"
  };
}

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

initStore();

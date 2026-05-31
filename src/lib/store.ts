import { products as initialProducts, Product, categories as defaultCategories, designers as defaultDesigners } from "@/data/products";
import { toast } from "sonner";

// Keys
const PRODUCTS_KEY = "villaoro_products";
const DESIGN_KEY = "villaoro_design";
const AI_KEY = "villaoro_ai_config";
const LOOKS_KEY = "villaoro_looks";
const CATEGORIES_KEY = "villaoro_categories";
const DESIGNERS_KEY = "villaoro_designers";

// Types
export interface DesignSettings {
  minimalMode: boolean;
  borderRadius: string;
  buttonColor: string;
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
  if (!localStorage.getItem(PRODUCTS_KEY)) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
  }
  if (!localStorage.getItem(DESIGN_KEY)) {
    localStorage.setItem(
      DESIGN_KEY,
      JSON.stringify({ minimalMode: true, borderRadius: "0px", buttonColor: "hsl(var(--primary))" })
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
          name: "Minimalist Fall Look",
          modelImage: "/images/fashion_model_minimal_look_1776798867177.png",
          productIds: ["3", "5", "8"], // IDs matching some defaults or to be matched
        },
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
  return data ? JSON.parse(data) : { minimalMode: true, borderRadius: "0px", buttonColor: "hsl(var(--primary))" };
}

export function saveDesignSettings(settings: DesignSettings) {
  localStorage.setItem(DESIGN_KEY, JSON.stringify(settings));
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

// Categories & Designers CRUD
export function getCategories(): string[] {
  const data = localStorage.getItem(CATEGORIES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveCategories(categories: string[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function getDesigners(): string[] {
  const data = localStorage.getItem(DESIGNERS_KEY);
  return data ? JSON.parse(data) : [];
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

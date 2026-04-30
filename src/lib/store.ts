import { products as initialProducts, Product } from "@/data/products";

// Keys
const PRODUCTS_KEY = "villaoro_products";
const DESIGN_KEY = "villaoro_design";
const AI_KEY = "villaoro_ai_config";
const LOOKS_KEY = "villaoro_looks";

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
  const currentProducts = getProducts();
  if (!localStorage.getItem(PRODUCTS_KEY) || currentProducts.length < initialProducts.length) {
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
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
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

initStore();

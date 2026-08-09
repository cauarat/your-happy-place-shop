import { products as initialProducts, Product, categories as defaultCategories, designers as defaultDesigners } from "@/data/products";
import catalogSeed from "@/data/catalog.json";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Keys
const PRODUCTS_KEY = "villaoro_products";
const DESIGN_KEY = "villaoro_design";
const AI_KEY = "villaoro_ai_config";
const LOOKS_KEY = "villaoro_looks";
const CATEGORIES_KEY = "villaoro_categories";
const DESIGNERS_KEY = "villaoro_designers";
const CATALOG_VERSION_KEY = "villaoro_catalog_version";
const CATALOG_VERSION = "v16";
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
  const { data, error } = await supabase
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
  const { error } = await supabase
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
  const { error } = await supabase
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
  const { data, error } = await supabase
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
  const { error } = await supabase
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

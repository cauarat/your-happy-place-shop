import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useRef } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import News from "./pages/News.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import BackgroundMusic, { BackgroundMusicHandle } from "./components/BackgroundMusic.tsx";
import { MusicProvider } from "./contexts/MusicContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SearchProvider } from "./contexts/SearchContext";
import { CartProvider } from "./contexts/CartContext";

// Mock placeholders for now until they are created
const AdminAiControl = () => <div>AI Control placeholder</div>;
const AdminTryTheLook = () => <div>Try The Look placeholder</div>;

import AdminDashboard from "./pages/admin/Dashboard.tsx";
import AdminProducts from "./pages/admin/Products.tsx";
import AdminProductEdit from "./pages/admin/ProductEdit.tsx";
import AdminSettings from "./pages/admin/Settings.tsx";
import AdminCatalog from "./pages/admin/CatalogSettings.tsx";
import Cart from "./pages/Cart.tsx";
import Checkout from "./pages/Checkout.tsx";

const queryClient = new QueryClient();

const App = () => {
  const musicRef = useRef<BackgroundMusicHandle>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <LanguageProvider>
          <SearchProvider>
            <MusicProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <div className="min-h-screen bg-background">
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/news" element={<News />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/admin/login" element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="products/:id" element={<AdminProductEdit />} />
                        <Route path="design" element={<AdminSettings />} />
                        <Route path="ai" element={<AdminAiControl />} />
                        <Route path="catalog" element={<AdminCatalog />} />
                        <Route path="try-the-look" element={<AdminTryTheLook />} />
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </div>
              </TooltipProvider>
            </MusicProvider>
          </SearchProvider>
        </LanguageProvider>
      </CartProvider>
    </QueryClientProvider>
  );
};

export default App;

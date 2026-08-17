import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BackgroundMusic, { BackgroundMusicHandle } from "./components/BackgroundMusic.tsx";
import { MusicProvider } from "./contexts/MusicContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SearchProvider } from "./contexts/SearchContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";

// Every page is loaded on demand rather than bundled into one file. Before
// this, opening the shop downloaded and compiled the admin app too — the
// dashboard's charts, the 3D viewer, the background-removal runtime — which on
// an older iPad is seconds of parsing and a memory spike big enough to end the
// tab. Each route now arrives as its own small chunk.
//
// The pages a shopper actually visits are warmed in the background once the
// first screen is idle (see `warmShopperRoutes`), so navigation stays instant.
const Index = lazy(() => import("./pages/Index.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const News = lazy(() => import("./pages/News.tsx"));
const CommunityLooks = lazy(() => import("./pages/CommunityLooks.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Cart = lazy(() => import("./pages/Cart.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Success = lazy(() => import("./pages/Success.tsx"));

const AdminLayout = lazy(() => import("./layouts/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard.tsx"));
const AdminProducts = lazy(() => import("./pages/admin/Products.tsx"));
const AdminProductEdit = lazy(() => import("./pages/admin/ProductEdit.tsx"));
const AdminLooks = lazy(() => import("./pages/admin/Looks.tsx"));
const AdminLookEdit = lazy(() => import("./pages/admin/LookEdit.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/Settings.tsx"));
const AdminCatalog = lazy(() => import("./pages/admin/CatalogSettings.tsx"));
const AdminAiControl = lazy(() => import("./pages/admin/AiControl.tsx"));
const AdminTryTheLook = lazy(() => import("./pages/admin/TryTheLookControl.tsx"));
const AdminOrders = lazy(() => import("./pages/admin/Orders.tsx"));
const AdminSuggestions = lazy(() => import("./pages/admin/Suggestions.tsx"));

/**
 * Fetches the chunks for the pages someone is likely to open next, once the
 * browser has nothing better to do. The download is what a route split costs;
 * paying for it during idle time means the split is free at the moment it
 * matters — a tap still opens the page immediately.
 */
const warmShopperRoutes = () => {
  const warm = () => {
    void import("./pages/Index.tsx");
    void import("./pages/ProductDetail.tsx");
    void import("./pages/Onboarding.tsx");
  };
  const idle = (window as typeof window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (idle) idle(warm, { timeout: 4000 });
  else setTimeout(warm, 2500);
};

/**
 * What fills the screen while a route's chunk is in flight. Deliberately just
 * the page's own background: the routes it stands in for paint their own
 * content within a frame or two of arriving, and a spinner that flashes for
 * 80ms reads as a stutter where nothing reads as nothing.
 */
const RouteFallback = () => <div className="min-h-screen bg-background" />;

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }
  
  if (!session) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  const musicRef = useRef<BackgroundMusicHandle>(null);

  useEffect(warmShopperRoutes, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingProvider>
        <CartProvider>
          <LanguageProvider>
          <SearchProvider>
            <MusicProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <div className="min-h-screen bg-background">
                  <BrowserRouter>
                    <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
                      <Route path="/community" element={<ProtectedRoute><CommunityLooks /></ProtectedRoute>} />
                      <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                      <Route path="/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />
                      <Route path="/product/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
                      <Route path="/admin/login" element={<Navigate to="/admin/dashboard" replace />} />
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="products/:id" element={<AdminProductEdit />} />
                        <Route path="design" element={<AdminSettings />} />
                        <Route path="looks" element={<AdminLooks />} />
                        <Route path="looks/new" element={<AdminLookEdit />} />
                        <Route path="looks/:id" element={<AdminLookEdit />} />
                        <Route path="ai" element={<AdminAiControl />} />
                        <Route path="catalog" element={<AdminCatalog />} />
                        <Route path="try-the-look" element={<AdminTryTheLook />} />
                        <Route path="suggestions" element={<AdminSuggestions />} />
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </Suspense>
                  </BrowserRouter>
                </div>
              </TooltipProvider>
            </MusicProvider>
          </SearchProvider>
        </LanguageProvider>
      </CartProvider>
      </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

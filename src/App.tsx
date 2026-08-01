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
import CommunityLooks from "./pages/CommunityLooks.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Login from "./pages/Login.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import BackgroundMusic, { BackgroundMusicHandle } from "./components/BackgroundMusic.tsx";
import { MusicProvider } from "./contexts/MusicContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SearchProvider } from "./contexts/SearchContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";


import AdminDashboard from "./pages/admin/Dashboard.tsx";
import AdminProducts from "./pages/admin/Products.tsx";
import AdminProductEdit from "./pages/admin/ProductEdit.tsx";
import AdminLooks from "./pages/admin/Looks.tsx";
import AdminLookEdit from "./pages/admin/LookEdit.tsx";
import AdminSettings from "./pages/admin/Settings.tsx";
import AdminCatalog from "./pages/admin/CatalogSettings.tsx";
import AdminAiControl from "./pages/admin/AiControl.tsx";
import AdminTryTheLook from "./pages/admin/TryTheLookControl.tsx";
import AdminOrders from "./pages/admin/Orders.tsx";
import Cart from "./pages/Cart.tsx";
import Checkout from "./pages/Checkout.tsx";
import Success from "./pages/Success.tsx";

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
      </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

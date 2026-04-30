import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/Login.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import OpeningExperience from "./components/OpeningExperience.tsx";
import BackgroundMusic, { BackgroundMusicHandle } from "./components/BackgroundMusic.tsx";
import { LanguageProvider } from "./contexts/LanguageContext";

// Mock placeholders for now until they are created
const AdminDesign = () => <div>Design placeholder</div>;
const AdminAiControl = () => <div>AI Control placeholder</div>;
const AdminCatalog = () => <div>Catalog placeholder</div>;
const AdminTryTheLook = () => <div>Try The Look placeholder</div>;

import AdminDashboard from "./pages/admin/Dashboard.tsx";
import AdminProducts from "./pages/admin/Products.tsx";
import AdminProductEdit from "./pages/admin/ProductEdit.tsx";

const queryClient = new QueryClient();

const App = () => {
  const [showIntro, setShowIntro] = useState(true);
  const musicRef = useRef<BackgroundMusicHandle>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BackgroundMusic ref={musicRef} />
          <AnimatePresence>
            {showIntro ? (
              <OpeningExperience 
                key="intro" 
                onComplete={() => setShowIntro(false)} 
                musicControl={musicRef}
              />
            ) : (
              <motion.div
                key="main-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                className="min-h-screen bg-background"
              >
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="products/:id" element={<AdminProductEdit />} />
                      <Route path="design" element={<AdminDesign />} />
                      <Route path="ai" element={<AdminAiControl />} />
                      <Route path="catalog" element={<AdminCatalog />} />
                      <Route path="try-the-look" element={<AdminTryTheLook />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </motion.div>
            )}
          </AnimatePresence>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;

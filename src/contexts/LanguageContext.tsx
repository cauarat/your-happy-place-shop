import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "EN" | "PT" | "ES";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  EN: {
    search: "Search",
    login: "Login",
    bag: "Bag",
    categories: "Categories",
    designers: "Designers",
    sort: "Sort",
    all_products: "All Products",
    no_products: "No products found.",
    latest: "Latest Arrivals",
    price_asc: "Price: Low to High",
    price_desc: "Price: High to Low",
    rated: "Top Rated",
    footer_tagline: "Curated luxury. Timeless pieces for the considered wardrobe.",
    shop: "Shop",
    help: "Help",
    newsletter: "Newsletter",
    newsletter_desc: "Receive our editorial monthly.",
    join: "Join",
    admin_portal: "Admin Portal",
    made_with_care: "Made with care",
    enter_catalog: "Enter Catalog",
    click_to_begin: "Click to Begin",
    side_a: "Side A",
    clothing: "Clothing",
    accessories: "Accessories",
    footwear: "Footwear",
    bags: "Bags",
    jewelry: "Jewelry",
    product: "Product",
    products: "Products"
  },
  PT: {
    search: "Pesquisar",
    login: "Entrar",
    bag: "Sacola",
    categories: "Categorias",
    designers: "Designers",
    sort: "Ordenar",
    all_products: "Todos os Produtos",
    no_products: "Nenhum produto encontrado.",
    latest: "Novidades",
    price_asc: "Preço: Menor para Maior",
    price_desc: "Preço: Maior para Menor",
    rated: "Mais Avaliados",
    footer_tagline: "Luxo curado. Peças atemporais para o guarda-roupa ponderado.",
    shop: "Loja",
    help: "Ajuda",
    newsletter: "Newsletter",
    newsletter_desc: "Receba nosso editorial mensal.",
    join: "Assinar",
    admin_portal: "Portal Admin",
    made_with_care: "Feito com cuidado",
    enter_catalog: "Entrar no Catálogo",
    click_to_begin: "Clique para Começar",
    side_a: "Lado A",
    clothing: "Vestuário",
    accessories: "Acessórios",
    footwear: "Calçados",
    bags: "Bolsas",
    jewelry: "Joalheria",
    product: "Produto",
    products: "Produtos"
  },
  ES: {
    search: "Buscar",
    login: "Acceder",
    bag: "Bolsa",
    categories: "Categorías",
    designers: "Diseñadores",
    sort: "Ordenar",
    all_products: "Todos los Productos",
    no_products: "No se encontraron productos.",
    latest: "Novedades",
    price_asc: "Precio: Menor a Mayor",
    price_desc: "Precio: Mayor a Menor",
    rated: "Más Valorados",
    footer_tagline: "Lujo curado. Piezas atemporales para el armario considerado.",
    shop: "Tienda",
    help: "Ayuda",
    newsletter: "Boletín",
    newsletter_desc: "Reciba nuestro editorial mensual.",
    join: "Unirse",
    admin_portal: "Portal Admin",
    made_with_care: "Hecho con cuidado",
    enter_catalog: "Entrar al Catálogo",
    click_to_begin: "Haz clic para comenzar",
    side_a: "Lado A",
    clothing: "Ropa",
    accessories: "Accesorios",
    footwear: "Calzado",
    bags: "Bolsos",
    jewelry: "Joyería",
    product: "Producto",
    products: "Productos"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("villaoro_lang");
    if (saved === "PT" || saved === "ES" || saved === "EN") return saved;
    
    // Auto-detect browser language
    const browserLang = navigator.language.split("-")[0].toUpperCase();
    if (browserLang === "PT") return "PT";
    if (browserLang === "ES") return "ES";
    return "EN";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("villaoro_lang", lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div className="transition-opacity duration-500 ease-in-out">
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};

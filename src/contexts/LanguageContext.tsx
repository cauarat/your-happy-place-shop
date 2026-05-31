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
    products: "Products",
    back_to_catalog: "Back to Catalog",
    description: "Description",
    default_description: "The {product} reflects the essence of {designer}'s minimalist design philosophy. Crafted with premium materials and a focus on essential details, it offers both timeless style and exceptional comfort.",
    select_size: "Select a Size",
    quantity: "Quantity",
    add_to_bag: "Add to Bag",
    free_shipping: "Free shipping on orders over $100.",
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
    price_asc: "Preço: Menor",
    price_desc: "Preço: Maior",
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
    products: "Produtos",
    "adidas Originals Edition Chavarria Superstar Sneakers": "Tênis adidas Originals Edição Chavarria Superstar",
    "adidas Originals Edition Karintha OG Sneakers": "Tênis adidas Originals Edição Karintha OG",
    "Salomon Edition XA Pro 3D Sneakers": "Tênis Salomon Edição XA Pro 3D",
    "Navy Croc-Embossed Ankle Boots": "Botas de Cano Curto Azul Marinho com Relevo de Crocodilo",
    "Brunello Cucinelle Brown Slides with buckles": "Chinelos Brunello Cucinelli Marrom com Fivelas",
    "Brunello Cucinelle Slides with buckles": "Chinelos Brunello Cucinelli com Fivelas",
    "Zegna Blackout Triple Stitch Sneakers": "Tênis Zegna Blackout Triple Stitch",
    "Zegna Brown Triple Stitch Sneakers": "Tênis Zegna Marrom Triple Stitch",
    "Cashmere Crewneck Sweater": "Suéter de Cashmere Gola Careca",
    "Soft Leather Tote Bag": "Bolsa Tote de Couro Macio",
    "Gold Curb Chain Bracelet": "Pulseira de Corrente de Elos em Ouro",
    "Classic Leather Belt": "Cinto de Couro Clássico",
    back_to_catalog: "Voltar ao Catálogo",
    description: "Descrição",
    default_description: "O {product} reflete a essência da filosofia de design minimalista de {designer}. Criado com materiais premium e foco em detalhes essenciais, oferece estilo atemporal e conforto excepcional.",
    select_size: "Selecione um Tamanho",
    quantity: "Quantidade",
    add_to_bag: "Adicionar à Sacola",
    free_shipping: "Frete grátis em pedidos acima de $100.",
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
    price_asc: "Precio: Menor",
    price_desc: "Precio: Mayor",
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
    products: "Productos",
    "adidas Originals Edition Chavarria Superstar Sneakers": "Zapatillas adidas Originals Edición Chavarria Superstar",
    "adidas Originals Edition Karintha OG Sneakers": "Zapatillas adidas Originals Edición Karintha OG",
    "Salomon Edition XA Pro 3D Sneakers": "Zapatillas Salomon Edición XA Pro 3D",
    "Navy Croc-Embossed Ankle Boots": "Botines Azul Marino con Relieve de Cocodrilo",
    "Brunello Cucinelle Brown Slides with buckles": "Sandalias Brunello Cucinelli Marrones con Hebillas",
    "Brunello Cucinelle Slides with buckles": "Sandalias Brunello Cucinelli con Hebillas",
    "Zegna Blackout Triple Stitch Sneakers": "Zapatillas Zegna Blackout Triple Stitch",
    "Zegna Brown Triple Stitch Sneakers": "Zapatillas Zegna Marrones Triple Stitch",
    "Cashmere Crewneck Sweater": "Suéter de Cachemira de Cuello Redondo",
    "Soft Leather Tote Bag": "Bolso Tote de Cuero Suave",
    "Gold Curb Chain Bracelet": "Pulsera de Cadena de Eslabones de Oro",
    "Classic Leather Belt": "Cinturón de Cuero Clásico",
    back_to_catalog: "Volver al Catálogo",
    description: "Descripción",
    default_description: "El {product} refleja la esencia de la filosofía de diseño minimalista de {designer}. Creado con materiales de primera calidad y un enfoque en los detalles esenciales, ofrece un estilo atemporal y una comodidad excepcional.",
    select_size: "Seleccione un Tamaño",
    quantity: "Cantidad",
    add_to_bag: "Añadir a la Bolsa",
    free_shipping: "Envío gratis en pedidos superiores a $100.",
  }
};

const commonTerms: Record<string, Record<string, string>> = {
  PT: {
    retro: "retrô",
    khaki: "caqui",
    black: "preto",
    white: "branco",
    brown: "marrom",
    blue: "azul",
    green: "verde",
    red: "vermelho",
    navy: "marinho",
    grey: "cinza",
    gray: "cinza",
    leather: "couro",
    suede: "camurça",
    cotton: "algodão",
    silk: "seda",
    wool: "lã",
    cashmere: "cashmere",
    sneakers: "tênis",
    shoes: "sapatos",
    boots: "botas",
    slides: "chinelos",
    sandals: "sandálias",
    bag: "bolsa",
    tote: "tote",
    belt: "cinto",
    hat: "chapéu",
    cap: "boné",
    bracelet: "pulseira",
    necklace: "colar",
    ring: "anel",
    gold: "ouro",
    silver: "prata",
    edition: "edição",
    original: "original",
    originals: "originals",
    classic: "clássico",
    with: "com",
    buckles: "fivelas",
    stitch: "stitch",
    triple: "triplo",
    soft: "macio",
    embossed: "relevo",
    croc: "crocodilo",
    ankle: "cano curto",
    crewneck: "gola careca",
    sweater: "suéter"
  },
  ES: {
    retro: "retro",
    khaki: "caqui",
    black: "negro",
    white: "blanco",
    brown: "marrón",
    blue: "azul",
    green: "verde",
    red: "rojo",
    navy: "marino",
    grey: "gris",
    gray: "gris",
    leather: "cuero",
    suede: "gamuza",
    cotton: "algodón",
    silk: "seda",
    wool: "lana",
    cashmere: "cachemira",
    sneakers: "zapatillas",
    shoes: "zapatos",
    boots: "botas",
    slides: "sandalias",
    sandals: "sandalias",
    bag: "bolso",
    tote: "tote",
    belt: "cinturón",
    hat: "sombrero",
    cap: "gorra",
    bracelet: "pulsera",
    necklace: "collar",
    ring: "anillo",
    gold: "oro",
    silver: "plata",
    edition: "edición",
    original: "original",
    originals: "originals",
    classic: "clásico",
    with: "con",
    buckles: "hebillas",
    stitch: "stitch",
    triple: "triple",
    soft: "suave",
    embossed: "relieve",
    croc: "cocodrilo",
    ankle: "botín",
    crewneck: "cuello redondo",
    sweater: "suéter"
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
    // 1. Check for exact match in full dictionary
    if (translations[language][key]) {
      return translations[language][key];
    }

    // 2. Smart Translate Fallback: Translate common words if no exact match
    if (language !== "EN" && key && typeof key === 'string' && key.includes(" ")) {
      const words = key.split(" ");
      const translatedWords = words.map(word => {
        const lowerWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
        const translated = commonTerms[language][lowerWord];
        
        if (translated) {
          // Preserve capitalization if original word was capitalized
          if (word.length > 0 && word[0] === word[0].toUpperCase()) {
            return translated.charAt(0).toUpperCase() + translated.slice(1);
          }
          return translated;
        }
        return word;
      });
      
      return translatedWords.join(" ");
    }

    return key;
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

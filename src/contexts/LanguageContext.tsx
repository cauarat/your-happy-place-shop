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
    items: "Items",
    brands: "Brands",
    designers: "Designers",
    sort: "Sort",
    sale: "Sale",
    clear_all: "Clear All",
    apply: "Apply",
    close: "Close",
    all_products: "All Products",
    no_products: "No products found.",
    latest: "Latest Arrivals",
    price_asc: "Price: Low to High",
    price_desc: "Price: High to Low",
    rated: "Top Rated",
    footer_tagline: "Curated luxury. Timeless pieces for the considered wardrobe.",
    shop: "Shop",
    help: "Help",
    news: "News",
    news_desc: "Receive our editorial monthly.",
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
    caps: "Caps",
    jackets: "Jackets",
    objects: "Objects",
    pants: "Pants",
    polo: "Polo",
    set: "Set",
    shorts: "Shorts",
    "t-shirt": "T-Shirt",
    "tank top": "Tank Top",
    hoodies: "Hoodies",
    vest: "Vest",
    product: "Product",
    products: "Products",
    back_to_catalog: "Back to Catalog",
    description: "Description",
    default_description: "The {product} reflects the essence of {designer}'s minimalist design philosophy. Crafted with premium materials and a focus on essential details, it offers both timeless style and exceptional comfort.",
    select_size: "Select a Size",
    quantity: "Quantity",
    add_to_bag: "Add to Bag",
    proceed_to_checkout: "Proceed to Checkout",
    free_shipping: "Free shipping on orders over $100.",
  },
  PT: {
    search: "Pesquisar",
    login: "Entrar",
    bag: "Sacola",
    categories: "Categorias",
    items: "Itens",
    brands: "Marcas",
    designers: "Designers",
    sort: "Ordenar",
    sale: "Promoção",
    clear_all: "Limpar Tudo",
    apply: "Aplicar",
    close: "Fechar",
    all_products: "Todos os Produtos",
    no_products: "Nenhum produto encontrado.",
    latest: "Novidades",
    price_asc: "Preço: Menor",
    price_desc: "Preço: Maior",
    rated: "Mais Avaliados",
    footer_tagline: "Luxo curado. Peças atemporais para o guarda-roupa ponderado.",
    shop: "Loja",
    help: "Ajuda",
    news: "News",
    news_desc: "Receba nosso editorial mensal.",
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
    caps: "Bonés",
    jackets: "Jaquetas",
    objects: "Objetos",
    pants: "Calças",
    polo: "Polo",
    set: "Conjuntos",
    shorts: "Shorts",
    "t-shirt": "Camisetas",
    "tank top": "Regatas",
    hoodies: "Moletons",
    vest: "Coletes",
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
    "Black Cotton Polo": "Polo de Algodão Preta",
    "White Cotton Polo": "Polo de Algodão Branca",
    "White Bonded nylon reversible outerwear jacket": "Jaqueta Reversível de Nylon Colado Branca",
    "Brown Flight Jacket shearling-trimmed cashmere blouson": "Blusão de Cashmere Aviador Marrom com Acabamento em Pele de Carneiro",
    back_to_catalog: "Voltar ao Catálogo",
    description: "Descrição",
    default_description: "O {product} reflete a essência da filosofia de design minimalista de {designer}. Criado com materiais premium e foco em detalhes essenciais, oferece estilo atemporal e conforto excepcional.",
    select_size: "Selecione um Tamanho",
    quantity: "Quantidade",
    add_to_bag: "Adicionar à Sacola",
    proceed_to_checkout: "Proceder para o Checkout",
    free_shipping: "Frete grátis em pedidos acima de $100.",
  },
  ES: {
    search: "Buscar",
    login: "Acceder",
    bag: "Bolsa",
    categories: "Categorías",
    items: "Artículos",
    brands: "Marcas",
    designers: "Diseñadores",
    sort: "Ordenar",
    sale: "Rebajas",
    clear_all: "Limpiar Todo",
    apply: "Aplicar",
    close: "Cerrar",
    all_products: "Todos los Productos",
    no_products: "No se encontraron productos.",
    latest: "Novedades",
    price_asc: "Precio: Menor",
    price_desc: "Precio: Mayor",
    rated: "Más Valorados",
    footer_tagline: "Lujo curado. Piezas atemporales para el armario considerado.",
    shop: "Tienda",
    help: "Ayuda",
    news: "notícias",
    news_desc: "Reciba nuestro editorial mensual.",
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
    caps: "Gorras",
    jackets: "Chaquetas",
    objects: "Objetos",
    pants: "Pantalones",
    polo: "Polo",
    set: "Conjuntos",
    shorts: "Pantalones Cortos",
    "t-shirt": "Camisetas",
    "tank top": "Camisetas sin mangas",
    hoodies: "Sudaderas",
    vest: "Chalecos",
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
    "Black Cotton Polo": "Polo de Algodón Negro",
    "White Cotton Polo": "Polo de Algodón Blanco",
    "White Bonded nylon reversible outerwear jacket": "Chaqueta Reversible de Nailon Unido Blanca",
    "Brown Flight Jacket shearling-trimmed cashmere blouson": "Cazadora de Cachemira Aviador Marrón con Ribete de Piel de Oveja",
    back_to_catalog: "Volver al Catálogo",
    description: "Descripción",
    default_description: "El {product} refleja la esencia de la filosofía de design minimalista de {designer}. Creado con materiales de primera calidad y un enfoque en los detalles esenciales, ofrece un estilo atemporal y una comodidad excepcional.",
    select_size: "Seleccione un Tamaño",
    quantity: "Cantidad",
    add_to_bag: "Añadir a la Bolsa",
    proceed_to_checkout: "Proceder al Checkout",
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
    sweater: "suéter",
    polo: "polo",
    jacket: "jaqueta",
    flight: "aviador",
    shearling: "pele de carneiro",
    trimmed: "com acabamento",
    blouson: "blusão",
    reversible: "reversível",
    outerwear: "agasalho",
    bonded: "colado",
    nylon: "nylon"
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
    sweater: "suéter",
    polo: "polo",
    jacket: "chaqueta",
    flight: "aviador",
    shearling: "piel de oveja",
    trimmed: "con ribete",
    blouson: "cazadora",
    reversible: "reversible",
    outerwear: "ropa de abrigo",
    bonded: "unido",
    nylon: "nailon"
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
      // For Romance languages (PT, ES), the noun usually comes before the adjective.
      // E.g., "Black Cotton Polo" -> "Polo Cotton Black".
      // This simple reversal heuristic significantly improves the readability of untranslated products.
      let words = key.split(" ");
      if (language === "PT" || language === "ES") {
        words = words.reverse();
      }

      const translatedWords = words.map(word => {
        // Extract leading and trailing punctuation
        const match = word.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/);
        if (!match) return word;

        const [, prefix, coreWord, suffix] = match;
        const lowerWord = coreWord.toLowerCase();
        const translated = commonTerms[language][lowerWord];

        if (translated) {
          // Preserve capitalization if original word was capitalized
          let finalTranslated = translated;
          if (coreWord.length > 0 && coreWord[0] === coreWord[0].toUpperCase()) {
            finalTranslated = translated.charAt(0).toUpperCase() + translated.slice(1);
          }
          return `${prefix}${finalTranslated}${suffix}`;
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

import slidesBrown from "@/assets/product-slides-brown.jpg";
import slidesGrey from "@/assets/product-slides-grey.jpg";
import sneakerBlack from "@/assets/product-sneaker-black.jpg";
import sneakerBrown from "@/assets/product-sneaker-brown.jpg";
import sweaterBeige from "@/assets/product-sweater-beige.jpg";
import bagBrown from "@/assets/product-bag-brown.jpg";
import braceletGold from "@/assets/product-bracelet-gold.jpg";
import beltBlack from "@/assets/product-belt-black.jpg";

export type Category = "Footwear" | "Clothing" | "Accessories" | "Bags" | "Jewelry";
export type Designer =
  | "Brunello"
  | "Zegna"
  | "Hermes"
  | "Maison"
  | "Golden"
  | "Adidas"
  | "Creed"
  | "Rimowa"
  | "Van"
  | "Versace"
  | "Willy Chavarria"
  | "Wales Bonner"
  | "Rier"
  | "Fear of God";

export interface Product {
  id: string;
  name: string;
  category: Category;
  designer: Designer;
  price: number;
  oldPrice?: number;
  image: string;
  createdAt: number;
  rating: number;
  removeBackground?: boolean;
  originalImage?: string;
  description?: string;
  images?: string[];
}

export const products: Product[] = [
  {
    id: "9",
    name: "adidas Originals Edition Chavarria Superstar Sneakers",
    category: "Footwear",
    designer: "Willy Chavarria",
    price: 390,
    image: "/images/willy_chavarria.png",
    createdAt: 10,
    rating: 4.9,
    removeBackground: true,
  },
  {
    id: "10",
    name: "adidas Originals Edition Karintha OG Sneakers",
    category: "Footwear",
    designer: "Wales Bonner",
    price: 425,
    image: "/images/wales_bonner.png",
    createdAt: 11,
    rating: 4.8,
    removeBackground: true,
  },
  {
    id: "11",
    name: "Salomon Edition XA Pro 3D Sneakers",
    category: "Footwear",
    designer: "Rier",
    price: 390,
    image: "/images/rier_salomon.png",
    createdAt: 12,
    rating: 4.7,
    removeBackground: true,
  },
  {
    id: "12",
    name: "Navy Croc-Embossed Ankle Boots",
    category: "Footwear",
    designer: "Fear of God",
    price: 1885,
    image: "/images/fear_of_god.png",
    createdAt: 13,
    rating: 5.0,
    removeBackground: true,
  },
  {
    id: "1",
    name: "Brunello Cucinelle Brown Slides with buckles",
    category: "Footwear",
    designer: "Brunello",
    price: 499,
    oldPrice: 599,
    image: slidesBrown,
    createdAt: 8,
    rating: 4.8,
    removeBackground: true,
  },
  {
    id: "2",
    name: "Brunello Cucinelle Slides with buckles",
    category: "Footwear",
    designer: "Brunello",
    price: 499,
    oldPrice: 599,
    image: slidesGrey,
    createdAt: 7,
    rating: 4.6,
    removeBackground: true,
  },
  {
    id: "3",
    name: "Zegna Blackout Triple Stitch Sneakers",
    category: "Footwear",
    designer: "Zegna",
    price: 699,
    oldPrice: 799,
    image: sneakerBlack,
    createdAt: 9,
    rating: 4.9,
    removeBackground: true,
  },
  {
    id: "4",
    name: "Zegna Brown Triple Stitch Sneakers",
    category: "Footwear",
    designer: "Zegna",
    price: 699,
    oldPrice: 799,
    image: sneakerBrown,
    createdAt: 6,
    rating: 4.7,
    removeBackground: true,
  },
  {
    id: "5",
    name: "Cashmere Crewneck Sweater",
    category: "Clothing",
    designer: "Brunello",
    price: 890,
    oldPrice: 1090,
    image: sweaterBeige,
    createdAt: 5,
    rating: 4.5,
    removeBackground: true,
  },
  {
    id: "6",
    name: "Soft Leather Tote Bag",
    category: "Bags",
    designer: "Hermes",
    price: 1290,
    oldPrice: 1490,
    image: bagBrown,
    createdAt: 4,
    rating: 4.9,
    removeBackground: true,
  },
  {
    id: "7",
    name: "Gold Curb Chain Bracelet",
    category: "Jewelry",
    designer: "Versace",
    price: 459,
    image: braceletGold,
    createdAt: 3,
    rating: 4.4,
    removeBackground: true,
  },
  {
    id: "8",
    name: "Classic Leather Belt",
    category: "Accessories",
    designer: "Maison",
    price: 320,
    oldPrice: 380,
    image: beltBlack,
    createdAt: 2,
    rating: 4.6,
    removeBackground: true,
  },
];

export const categories: Category[] = [
  "Clothing",
  "Accessories",
  "Footwear",
  "Bags",
  "Jewelry",
];

export const designers: Designer[] = [
  "Adidas",
  "Brunello",
  "Creed",
  "Fear of God",
  "Golden",
  "Hermes",
  "Maison",
  "Rier",
  "Rimowa",
  "Van",
  "Versace",
  "Wales Bonner",
  "Willy Chavarria",
  "Zegna",
];

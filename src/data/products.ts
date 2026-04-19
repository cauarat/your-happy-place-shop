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
  | "Versace";

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
}

export const products: Product[] = [
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
  },
];

export const categories: ("All" | Category)[] = [
  "All",
  "Clothing",
  "Accessories",
  "Footwear",
  "Bags",
  "Jewelry",
];

export const designers: ("All" | Designer)[] = [
  "All",
  "Adidas",
  "Brunello",
  "Creed",
  "Golden",
  "Hermes",
  "Maison",
  "Rimowa",
  "Van",
  "Versace",
  "Zegna",
];

const fs = require('fs');
const catalogPath = 'src/data/catalog.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const newProducts = [
  {
    id: '1800000000001',
    name: 'White Swimshorts',
    designer: 'Villebrequin',
    category: 'Shorts',
    price: 250,
    images: [],
    colors: ['White'],
    sizes: ['S', 'M', 'L', 'XL'],
    description: 'Classic white swimshorts for a clean summer look.'
  },
  {
    id: '1800000000002',
    name: 'White Pants',
    designer: 'Moncler',
    category: 'Pants',
    price: 650,
    images: [],
    colors: ['White'],
    sizes: ['30', '32', '34', '36'],
    description: 'Crisp white trousers with a tailored fit.'
  },
  {
    id: '1800000000003',
    name: 'Black Slip-ons',
    designer: 'Moncler',
    category: 'Footwear',
    price: 450,
    images: [],
    colors: ['Black'],
    sizes: ['40', '41', '42', '43', '44'],
    description: 'Minimalist black slip-on shoes for effortless style.'
  }
];

catalog.unshift(...newProducts);
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
console.log('Added 3 mock products to catalog.json');

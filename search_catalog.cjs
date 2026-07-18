const fs = require('fs');
const catalog = JSON.parse(fs.readFileSync('src/data/catalog.json', 'utf8'));

const looks = [
  { search: ['moncler', 'white', 'polo'] },
  { search: ['villebrequin', 'white'] },
  { search: ['birkenstock', 'boston', 'sand'] },
  { search: ['moncler', 'puffer', 'black'] },
  { search: ['black', 'polo'] },
  { search: ['white', 'pants'] }, // or trousers
  { search: ['black', 'slip'] },
  { search: ['black', 'sweater'] },
  { search: ['black', 'shorts'] },
  { search: ['black', 'slides'] } // or sandals
];

looks.forEach(look => {
  const matches = catalog.filter(p => {
    const text = (p.name + ' ' + (p.designer || '') + ' ' + (p.category || '')).toLowerCase();
    return look.search.every(term => text.includes(term.toLowerCase()));
  });
  console.log('Search:', look.search.join(' '));
  matches.forEach(m => console.log(`  - [${m.id}] ${m.name} (${m.designer})`));
});

const fs = require('fs');
const catalog = JSON.parse(fs.readFileSync('src/data/catalog.json', 'utf8'));

const keywords = ['swim', 'white shorts', 'white pants', 'trousers', 'slip', 'slides', 'slipper'];
keywords.forEach(kw => {
  console.log('Search:', kw);
  catalog.forEach(m => {
    const text = (m.name + ' ' + (m.designer || '') + ' ' + (m.category || '')).toLowerCase();
    if (text.includes(kw)) {
      console.log(`  - [${m.id}] ${m.name} (${m.designer}) [${m.category}]`);
    }
  });
});

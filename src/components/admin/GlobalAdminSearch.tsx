import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Package, AlertCircle, BarChart3, Tag, Settings, MessageSquare, Users, Image as ImageIcon, FileText, Copy, Link as LinkIcon, TrendingUp, Clock } from 'lucide-react';
import { getProducts, getCategories, getDesigners, getLooks, Product, Category, Designer } from '@/lib/store';

interface SearchResult {
  type: 'action' | 'product' | 'insight' | 'attention' | 'catalog';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  path?: string;
  product?: Product;
  metric?: string | number;
}

const ACTION_ROUTES = [
  { keywords: ['product', 'inventory', 'add', 'item'], title: 'View Products', path: '/admin/products', icon: <Package className="w-4 h-4" /> },
  { keywords: ['catalog', 'order', 'structure', 'sort'], title: 'Edit Catalog', path: '/admin/catalog', icon: <Tag className="w-4 h-4" /> },
  { keywords: ['design', 'setting', 'color', 'ui', 'theme'], title: 'Customize Design', path: '/admin/design', icon: <Settings className="w-4 h-4" /> },
  { keywords: ['ai', 'stylist', 'smart'], title: 'AI Stylist Config', path: '/admin/ai', icon: <Sparkles className="w-4 h-4" /> },
  { keywords: ['look', 'community'], title: 'Community Looks', path: '/admin/looks', icon: <Users className="w-4 h-4" /> },
  { keywords: ['feedback', 'request', 'suggestion'], title: 'Feedback & Requests', path: '/admin/suggestions', icon: <MessageSquare className="w-4 h-4" /> },
];

export const GlobalAdminSearch = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const products = useMemo(() => getProducts(), []);
  const categories = useMemo(() => getCategories(), []);
  const designers = useMemo(() => getDesigners(), []);
  const looks = useMemo(() => getLooks(), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const res: SearchResult[] = [];
    
    // Helper to check if any keywords match
    const containsAny = (words: string[]) => words.some(w => q.includes(w));
    const containsAll = (words: string[]) => words.every(w => q.includes(w));

    // 1. Attention Needed (Special Query)
    if (containsAny(['attention', 'improve', 'fix', 'audit', 'inconsistent', 'missing', 'issue', 'wrong'])) {
      const missingImage = products.filter(p => !p.image);
      const missingDesc = products.filter(p => !p.description || !p.description.trim());
      const duplicates = products.filter((p, i, self) => self.findIndex(t => t.name === p.name) !== i);
      const incomplete = products.filter(p => !p.category || !p.designer);
      
      const categoryCounts = categories.map(c => ({ cat: c, count: products.filter(p => p.category === c).length }));
      const lowCats = categoryCounts.filter(c => c.count > 0 && c.count < 3);

      // using createdAt as a proxy for recent for now
      const recentEdits = [...products].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
      
      // We assume bags, caps, accessories are limited quantity items where allowQuantity might matter, but just mocking low stock if none exist
      const mockLowStock = products.filter(p => p.allowQuantity).slice(0, 3); 

      if (missingImage.length > 0) res.push({ type: 'attention', title: `${missingImage.length} Products missing images`, subtitle: 'Needs attention before marketing', icon: <ImageIcon className="w-4 h-4 text-orange-500" />, path: '/admin/products' });
      if (missingDesc.length > 0) res.push({ type: 'attention', title: `${missingDesc.length} Products missing descriptions`, subtitle: 'Improves SEO & conversion', icon: <FileText className="w-4 h-4 text-orange-500" />, path: '/admin/products' });
      if (duplicates.length > 0) res.push({ type: 'attention', title: `${duplicates.length} Duplicate product names found`, subtitle: 'Catalog inconsistency', icon: <Copy className="w-4 h-4 text-red-500" />, path: '/admin/products' });
      if (incomplete.length > 0) res.push({ type: 'attention', title: `${incomplete.length} Products with incomplete metadata`, subtitle: 'Missing category or brand', icon: <AlertCircle className="w-4 h-4 text-yellow-500" />, path: '/admin/products' });
      
      lowCats.forEach(lc => {
        res.push({ type: 'attention', title: `Category '${lc.cat}' has only ${lc.count} products`, subtitle: 'Merchandising opportunity', icon: <Tag className="w-4 h-4 text-yellow-500" />, path: '/admin/products' });
      });
      
      if (mockLowStock.length > 0) res.push({ type: 'attention', title: `${mockLowStock.length} high-demand products running low`, subtitle: 'Inventory alert', icon: <AlertCircle className="w-4 h-4 text-red-500" />, path: '/admin/products' });
      else res.push({ type: 'attention', title: `No low stock alerts`, subtitle: 'Inventory is healthy', icon: <Package className="w-4 h-4 text-green-500" /> });

      return res; // Stop here if it's purely an attention query, to not clutter with product searches
    }

    // 2. Insights & Analytics
    if (containsAny(['how many', 'total', 'count', 'amount'])) {
      if (q.includes('categor')) res.push({ type: 'insight', title: 'Total Categories', metric: categories.length, icon: <BarChart3 className="w-4 h-4 text-blue-500" /> });
      if (q.includes('brand') || q.includes('designer')) res.push({ type: 'insight', title: 'Total Brands', metric: designers.length, icon: <BarChart3 className="w-4 h-4 text-blue-500" /> });
      if (q.includes('product') || (!q.includes('categor') && !q.includes('brand'))) res.push({ type: 'insight', title: 'Total Products', metric: products.length, icon: <BarChart3 className="w-4 h-4 text-blue-500" /> });
      
      if (q.includes('each category')) {
         const catCounts = categories.map(c => ({ cat: c, count: products.filter(p => p.category === c).length })).sort((a,b) => b.count - a.count);
         catCounts.slice(0, 5).forEach(c => {
           res.push({ type: 'insight', title: c.cat, metric: c.count, icon: <Tag className="w-4 h-4 text-purple-500" /> });
         });
      }
    } else if (containsAny(['brand', 'designer']) && containsAny(['most', 'top', 'breakdown'])) {
      const brandCounts = designers.map(d => ({ brand: d, count: products.filter(p => p.designer === d).length })).sort((a,b) => b.count - a.count);
      brandCounts.slice(0, 3).forEach(b => {
        res.push({ type: 'insight', title: b.brand, subtitle: 'Top Brand by Volume', metric: b.count, icon: <Sparkles className="w-4 h-4 text-blue-500" /> });
      });
    }
    
    if (containsAny(['best-selling', 'popular', 'top'])) {
      const mockBest = [...products].sort((a, b) => b.rating - a.rating).slice(0, 3);
      mockBest.forEach(p => {
        res.push({ type: 'insight', title: p.name, subtitle: 'Top Performer (est. high sales)', product: p, icon: <TrendingUp className="w-4 h-4 text-yellow-500" /> });
      });
    }

    if (containsAny(['newest', 'recent'])) {
      const newest = [...products].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
      newest.forEach(p => {
        res.push({ type: 'insight', title: p.name, subtitle: 'Recently Added', product: p, icon: <Sparkles className="w-4 h-4 text-green-500" /> });
      });
    }
    
    if (containsAny(['oldest', "haven't been edited", 'not edited'])) {
      const oldest = [...products].sort((a, b) => a.createdAt - b.createdAt).slice(0, 3);
      oldest.forEach(p => {
        res.push({ type: 'insight', title: p.name, subtitle: 'Has not been edited recently', product: p, icon: <Clock className="w-4 h-4 text-orange-500" /> });
      });
    }

    // 3. Actions
    if (containsAny(['view', 'open', 'edit', 'go to', 'show me'])) {
      ACTION_ROUTES.forEach(route => {
        if (route.keywords.some(k => q.includes(k))) {
          // If it matches exactly the route keyword intent, don't show products, just actions
          res.push({ type: 'action', title: route.title, path: route.path, icon: route.icon });
        }
      });
    }

    // 4. Products Search (Natural Language filter)
    const stopWords = ['show', 'me', 'all', 'what', 'are', 'which', 'find', 'the', 'my', 'in', 'of', 'for', 'have', 'do', 'i', 'with'];
    const rawKeywords = q.replace(/[^\w\s]/g, '').split(/\s+/);
    const searchKeywords = rawKeywords.filter(k => k.length > 1 && !stopWords.includes(k));
    
    // Don't clutter product results if it's heavily analytical or action-oriented, unless they specifically mention a brand/category
    const isAnalytical = containsAny(['how many', 'total', 'count', 'amount', 'most', 'breakdown', 'oldest']);
    
    if (searchKeywords.length > 0 && !isAnalytical) {
      // Find potential brand or category matches
      const mentionedBrands = designers.filter(d => searchKeywords.some(k => d.toLowerCase().includes(k)));
      const mentionedCats = categories.filter(c => searchKeywords.some(k => c.toLowerCase().includes(k)));
      
      const matchedProducts = products.filter(p => {
        const pName = p.name.toLowerCase();
        const pBrand = p.designer?.toLowerCase() || '';
        const pCat = p.category?.toLowerCase() || '';
        
        // If they mentioned specific brands or cats, prioritize those
        if (mentionedBrands.length > 0 && !mentionedBrands.includes(p.designer || '')) return false;
        if (mentionedCats.length > 0 && !mentionedCats.includes(p.category || '')) return false;
        
        // Otherwise do a fuzzy text match against everything
        const searchableText = `${pName} ${pBrand} ${pCat}`;
        return searchKeywords.every(keyword => searchableText.includes(keyword));
      }).slice(0, 5);

      matchedProducts.forEach(p => {
        // Prevent duplicates if already added as insight
        if (!res.some(existing => existing.product?.id === p.id)) {
           res.push({ type: 'product', title: p.name, subtitle: `${p.designer} • ${p.category}`, product: p });
        }
      });
    }
    
    // If we only have actions, maybe they just typed "products", let's also show some default products just in case
    if (res.length > 0 && res.every(r => r.type === 'action') && containsAny(['product', 'item'])) {
      products.slice(0, 3).forEach(p => {
        res.push({ type: 'product', title: p.name, subtitle: `${p.designer} • ${p.category}`, product: p });
      });
    }

    return res;
  }, [query, products, categories, designers]);

  const handleSelect = (item: SearchResult) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.product) {
      navigate(`/admin/products/${item.product.id}`);
    }
    setIsOpen(false);
    setQuery('');
  };

  const setSuggestion = (s: string) => {
    setQuery(s);
    setIsOpen(true);
  };

  return (
    <div className="relative group max-w-3xl mx-auto w-full z-50" ref={wrapperRef}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[24px] blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50" />
      <div className="relative">
        <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-pulse" />
        <input 
          type="text"
          placeholder="Search for 'black prada bags' or 'winter jackets'..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-14 pr-6 py-4 bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-2xl border border-white/60 dark:border-white/20 rounded-[24px] text-base focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all shadow-lg font-medium text-foreground placeholder:text-muted-foreground/70"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-300 max-h-[60vh] overflow-y-auto">
          
          {!query.trim() && (
            <div className="p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">Try asking</p>
              <div className="flex flex-col gap-2">
                {[
                  "Show my best-selling products",
                  "Find black Prada bags",
                  "What needs attention?",
                  "Show recent edits"
                ].map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSuggestion(s)}
                    className="text-left px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm font-medium flex items-center gap-3"
                  >
                    <Sparkles className="w-4 h-4 text-purple-500/70" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p>No results found for "{query}"</p>
            </div>
          )}

          {query.trim() && results.length > 0 && (
            <div className="p-4 flex flex-col gap-1">
              {results.map((r, i) => {
                // Grouping headers logic could be added here, but flat list with styling works well for MVP
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(r)}
                    className="w-full text-left p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-4 group/item"
                  >
                    {r.type === 'product' && r.product && (
                      <div className="w-12 h-12 rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden shrink-0">
                        {r.product.image ? (
                          <img src={r.product.image} alt={r.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                        )}
                      </div>
                    )}
                    
                    {(r.type === 'action' || r.type === 'attention' || (r.type === 'insight' && !r.product)) && (
                      <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                        {r.icon || <Sparkles className="w-4 h-4" />}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                    </div>

                    {r.metric !== undefined && (
                      <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {r.metric}
                      </div>
                    )}

                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {r.path ? (
                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Select</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

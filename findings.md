# 🔍 Findings — Villa Oro (Your Happy Place Shop)

## Descobertas do Projeto

### Stack Tecnológica
- **Framework:** React + TypeScript (Vite v7.3.3)
- **Styling:** Tailwind CSS + CSS customizado
- **Animações:** Framer Motion
- **3D:** React Three Fiber (Three.js)
- **Estado:** LocalStorage (sem banco de dados externo)
- **Pagamentos:** Stripe (server.js na porta 4242)
- **Dev Server:** Vite na porta 8081

### Estrutura Atual
- `/src/pages/` — Páginas públicas (Index, ProductDetail, News, Cart, CommunityLooks)
- `/src/pages/admin/` — Painel admin (Dashboard, Products, ProductEdit, AiControl, Settings, CatalogSettings, Looks, TryTheLookControl)
- `/src/components/` — Componentes reutilizáveis (Header, Footer, ProductCard, ForzaVistaViewer, MobileBottomDock)
- `/src/contexts/` — Contextos React (Language, Cart, Music)
- `/src/lib/store.ts` — Gerenciamento de estado via LocalStorage
- `/src/data/catalog.json` — Catálogo de produtos (seed data, ~12k linhas)

### Categorias no Catálogo
Accessories, Bags, Caps, Clothing, Footwear, Jackets, Objects, Pants, Polo, Set, Shorts, T-Shirt, Tank top, hoodies, vest

### Restrições Conhecidas
- Dados persistidos apenas em LocalStorage (sem backend/DB real)
- Catálogo versionado (`CATALOG_VERSION = "v13"`) — bump reseta dados locais
- Stripe configurado mas sem backend persistente (server.js encerra após inicializar)

---

## Pesquisas Pendentes
- [ ] Definir se há plano de migração para banco de dados real
- [ ] Definir estratégia de deploy (Vercel? Netlify? AWS?)
- [ ] Definir se o catálogo será gerenciado via CMS ou JSON estático

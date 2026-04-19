const Footer = () => {
  return (
    <footer className="border-t border-border mt-24 bg-background">
      <div className="px-8 lg:px-12 py-16 grid md:grid-cols-4 gap-12">
        <div>
          <h3 className="text-2xl mb-4">Vilaoro</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Curated luxury. Timeless pieces for the considered wardrobe.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-accent">Footwear</a></li>
            <li><a href="#" className="hover:text-accent">Clothing</a></li>
            <li><a href="#" className="hover:text-accent">Bags</a></li>
            <li><a href="#" className="hover:text-accent">Jewelry</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Help</p>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-accent">Shipping</a></li>
            <li><a href="#" className="hover:text-accent">Returns</a></li>
            <li><a href="#" className="hover:text-accent">Contact</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Newsletter</p>
          <p className="text-sm text-muted-foreground mb-3">Receive our editorial monthly.</p>
          <div className="flex border-b border-foreground">
            <input
              type="email"
              placeholder="your@email.com"
              className="bg-transparent flex-1 py-2 text-sm focus:outline-none"
            />
            <button className="text-xs uppercase tracking-[var(--tracking-wide)]">Join</button>
          </div>
        </div>
      </div>
      <div className="px-8 lg:px-12 py-6 border-t border-border text-xs text-muted-foreground flex justify-between">
        <span>© {new Date().getFullYear()} Vilaoro</span>
        <span>Made with care</span>
      </div>
    </footer>
  );
};

export default Footer;

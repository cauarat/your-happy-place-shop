import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border mt-24 bg-background">
      <div className="px-8 lg:px-12 py-16 grid md:grid-cols-4 gap-12">
        <div>
          <h3 className="text-2xl font-bold tracking-tighter mb-4">Villaoro</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('footer_tagline')}
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">{t('shop')}</p>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-accent">{t('footwear')}</a></li>
            <li><a href="#" className="hover:text-accent">{t('clothing')}</a></li>
            <li><a href="#" className="hover:text-accent">{t('bags')}</a></li>
            <li><a href="#" className="hover:text-accent">{t('jewelry')}</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">{t('help')}</p>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-accent">{t('shipping')}</a></li>
            <li><a href="#" className="hover:text-accent">{t('returns')}</a></li>
            <li><a href="#" className="hover:text-accent">{t('contact')}</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">{t('news')}</p>
          <p className="text-sm text-muted-foreground mb-3">{t('news_desc')}</p>
          <div className="flex border-b border-foreground">
            <input
              type="email"
              placeholder="your@email.com"
              className="bg-transparent flex-1 py-2 text-sm focus:outline-none"
            />
            <button className="text-xs uppercase tracking-[var(--tracking-wide)]">{t('join')}</button>
          </div>
        </div>
      </div>
      <div className="px-8 lg:px-12 py-6 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
        <span className="font-medium tracking-tight">© {new Date().getFullYear()} <span className="font-bold tracking-tighter">Villaoro</span></span>
        <div className="flex gap-4">
          <a href="/admin/login" className="hover:text-foreground transition-colors">{t('admin_portal')}</a>
          <span>{t('made_with_care')}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

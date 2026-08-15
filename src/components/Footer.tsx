import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shell, Marquee } from "@/components/system";

/**
 * The close of every page. Three movements, in the order someone actually
 * needs them: the brand statement (who this is), the directory (where to go
 * next), the fine print (what governs it).
 *
 * The wordmark marquee at the top is the one piece of pure expression in the
 * layout — it's what turns the bottom of the page from an appendix into an
 * ending. Everything below it is deliberately quiet.
 */

const FooterColumn = ({
  title,
  links,
}: {
  title: string;
  links: { label: string; to: string }[];
}) => (
  <div>
    <p className="eyebrow mb-5">{title}</p>
    <ul className="flex flex-col gap-3">
      {links.map((link) => (
        <li key={link.label}>
          <Link
            to={link.to}
            className="link-underline text-[13px] text-ink/60 transition-colors duration-base ease-sine hover:text-ink"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const Footer = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const year = new Date().getFullYear();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setJoined(true);
  };

  return (
    <footer className="mt-24 bg-paper hairline-t">
      {/* Wordmark ticker — the sign-off. Slow enough to read as drift rather
          than motion competing with the page. */}
      <div className="overflow-hidden py-10 md:py-14 hairline-b">
        <Marquee speed={48} gap="2.5rem" className="items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="type-display shrink-0 text-[clamp(3rem,10vw,7rem)] leading-none text-ink/[0.10]"
            >
              Villaoro
            </span>
          ))}
        </Marquee>
      </div>

      <Shell className="grid gap-12 py-16 md:grid-cols-12 md:gap-8 md:py-20">
        {/* Statement */}
        <div className="md:col-span-4">
          <p className="type-lead max-w-xs text-ink/70">{t("footer_tagline")}</p>
        </div>

        {/* Directory */}
        <div className="grid grid-cols-2 gap-10 md:col-span-5 md:gap-8">
          <FooterColumn
            title={t("shop")}
            links={[
              { label: t("footwear"), to: "/?category=Footwear" },
              { label: t("clothing"), to: "/?category=Clothing" },
              { label: t("bags"), to: "/?category=Bags" },
              { label: t("jewelry"), to: "/?category=Jewelry" },
            ]}
          />
          <FooterColumn
            title={t("help")}
            links={[
              { label: t("news"), to: "/news" },
              { label: t("community_looks") || "Community", to: "/community" },
              { label: t("shipping"), to: "/news" },
              { label: t("returns"), to: "/news" },
            ]}
          />
        </div>

        {/* Newsletter. Success is shown in place rather than as a toast that
            disappears — the field is where the person is looking. */}
        <div className="md:col-span-3">
          <p className="eyebrow mb-5">{t("news")}</p>
          {joined ? (
            <p className="flex items-start gap-2 text-[13px] text-ink/70">
              <Check size={15} className="mt-0.5 shrink-0 text-ink" strokeWidth={2} />
              <span>{t("news_thanks") || "You're on the list."}</span>
            </p>
          ) : (
            <>
              <p className="mb-5 text-[13px] leading-relaxed text-ink/60">{t("news_desc")}</p>
              <form onSubmit={handleJoin} className="group relative flex items-center">
                <label htmlFor="footer-email" className="sr-only">
                  {t("news")}
                </label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="field pr-10 text-sm"
                />
                <button
                  type="submit"
                  aria-label={t("join")}
                  className="absolute right-0 flex h-8 w-8 items-center justify-center text-ink/40 transition-colors duration-base ease-sine hover:text-ink"
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </Shell>

      {/* Fine print. The bottom padding clears the floating category dock,
          which is fixed to the viewport and would otherwise sit on top of the
          copyright line at every width. */}
      <Shell className="flex flex-col gap-4 pt-7 hairline-t sm:flex-row sm:items-center sm:justify-between"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}>
        <span className="type-label text-ink/40">
          © {year} Villaoro
        </span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            href="/admin/login"
            className="type-label text-ink/40 transition-colors duration-base ease-sine hover:text-ink"
          >
            {t("admin_portal")}
          </a>
          <span className="type-label text-ink/40">{t("made_with_care")}</span>
        </div>
      </Shell>
    </footer>
  );
};

export default Footer;

import React, { useState, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'framer-motion';
import { SlidersHorizontal, Package, MessageSquare, Send, CheckCircle, Smartphone, Fingerprint, RefreshCcw, Bell, Newspaper, Lock, ArrowLeft, Check, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { designers as staticDesigners } from '../data/products';
import { supabase } from '../lib/supabase';
import { getDesigners, getProducts, getDesignSettings } from '../lib/store';
import { Component as LanguageSelectorDropdown, LanguageOption } from '@/components/ui/language-selector-dropdown';
import { ScrollMorphHero, SCROLL_MORPH_REVEAL_OFFSET } from '@/components/ui/scroll-morph-hero';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import CatalogPreview from '@/components/CatalogPreview';
import { DURATION, EASE_SOFT, jumpPageToTop, scrollPageTo, scrollPageToElement } from '@/lib/motion';
import { Shirt, Footprints, ShoppingBag, Gem, Glasses, Box, Layers, Search } from "lucide-react";
import { CapIcon, PantsIcon, ShortsIcon, JacketIcon, HoodieIcon, VestIcon, PoloIcon, TankTopIcon, BagIcon, PufferJacketIcon, SweaterIcon } from "@/components/Icons";
import { GlobeFlights } from '@/components/ui/cobe-globe-flights';
import { AdmitOneTicket, TicketPrinter } from '@/components/ui/admit-one-ticket';
import TestimonialMarquee from '@/components/ui/marquee-01';
import { ChapterScrubber, type Chapter } from '@/components/ui/chapter-scrubber';

const getCategoryIcon = (cat: string) => {
  switch (cat.toUpperCase()) {
    case 'CLOTHING': return Shirt;
    case 'FOOTWEAR': return Footprints;
    case 'BAGS': return BagIcon;
    case 'JEWELRY': return Gem;
    case 'ACCESSORIES': return Glasses;
    case 'CAPS': return CapIcon;
    case 'JACKETS': return JacketIcon;
    case 'PUFFER JACKET': return PufferJacketIcon;
    case 'PUFFER JACKETS': return PufferJacketIcon;
    case 'OBJECTS': return Box;
    case 'PANTS': return PantsIcon;
    case 'POLO': return PoloIcon;
    case 'SET': return Layers;
    case 'SHORTS': return ShortsIcon;
    case 'SWEATER': return SweaterIcon;
    case 'SWEATERS': return SweaterIcon;
    case 'T-SHIRT': return Shirt;
    case 'TANK TOP': return TankTopIcon;
    case 'HOODIES': return HoodieIcon;
    case 'VEST': return VestIcon;
    default: return null;
  }
};

// iOS-style segmented control: a shared layoutId pill glides between options,
// spring-driven, so switching languages feels native rather than a plain fade.
const LanguageSegmentedControl = ({
  languages,
  value,
  onChange,
}: {
  languages: LanguageOption[];
  value: string;
  onChange: (lang: LanguageOption) => void;
}) => (
  <div className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100/90 backdrop-blur-sm p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
    {languages.map((lang) => {
      const active = value === lang.code;
      return (
        <button
          key={lang.code}
          onClick={() => onChange(lang)}
          className="relative rounded-full px-4 py-2 text-sm font-medium transition-colors"
        >
          {active && (
            <motion.span
              layoutId="lang-segment-pill"
              className="absolute inset-0 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            />
          )}
          <span
            className={`relative z-10 flex items-center gap-1.5 ${active ? 'text-black' : 'text-zinc-500'}`}
          >
            <span>{lang.flag}</span>
            <span>{lang.code}</span>
          </span>
        </button>
      );
    })}
  </div>
);

// The quick tour: the page scrolls out of the hero into a device frame that
// unfolds as you keep scrolling, showing the real catalogue home screen —
// what someone gets access to, before being asked for a name and an email.
const CatalogTourSection = React.forwardRef<
  HTMLElement,
  { onContinue: () => void }
>(
  ({ onContinue }, ref) => {
    const { t } = useLanguage();

    // No background of its own: the page paints the surface underneath, and an
    // opaque section here would punch a white rectangle through the fade.
    return (
      <section ref={ref} className="relative w-full">
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center gap-3 px-6">
              <span
                className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 transition-colors duration-500"
              >
                {t('tour_preview_eyebrow')}
              </span>
              <h2
                className="text-[26px] md:text-[42px] font-semibold tracking-tight leading-none text-black transition-colors duration-500"
              >
                {t('tour_preview_title')}
              </h2>
              <p
                className="max-w-sm text-[14px] md:text-[15px] font-light leading-relaxed text-zinc-500 transition-colors duration-500"
              >
                {t('tour_preview_subtitle')}
              </p>
            </div>
          }
        >
          <CatalogPreview />
        </ContainerScroll>

        {/* Pulled up under the flattened device — by the time the frame is
            lying flat, this is the next thing in view. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: DURATION.content, ease: EASE_SOFT }}
          className="w-full max-w-md mx-auto px-6 -mt-24 md:-mt-48 pb-16 flex justify-center relative z-20"
        >
          <button
            onClick={onContinue}
            className="w-full h-[56px] rounded-[20px] font-medium tracking-wide text-[16px] transition-all duration-500 hover:shadow-xl active:scale-[0.98] bg-zinc-900 text-white hover:bg-black hover:shadow-black/20 cursor-pointer relative z-50"
          >
            {t('install_app_continue')}
          </button>
        </motion.div>
      </section>
    );
  }
);
CatalogTourSection.displayName = 'CatalogTourSection';

// What this place actually is, between the hero's buttons and the device tour.
// Someone who has scrolled past "I'm already a member" has been shown a ring of
// clothing icons and a globe and told nothing; the tour that follows shows the
// catalogue without ever saying why it is small or who chose what is in it.
// This is that missing paragraph, and it earns its place by being the only
// section on the page that makes a claim.
//
// The shape is the page's own: a statement carrying the weight on the left, the
// reasoning and the single number worth quoting on the right. The statement is
// split across two tones so the first half reads as the setup and the second as
// the point — one sentence that happens to be typeset as two. On a phone it
// stacks in reading order (picture, statement, reasoning, number) so nothing
// has to be scanned sideways.
//
// No background of its own, for the same reason CatalogTourSection has none.
const AboutSection = React.forwardRef<HTMLElement, { onExplore: () => void }>(
  ({ onExplore }, ref) => {
    const { t, language } = useLanguage();
    const [activeDemoCategory, setActiveDemoCategory] = useState<string>('All');

    // Drag-to-scroll logic
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const isDragging = React.useRef(false);
    const startX = React.useRef(0);
    const scrollLeft = React.useRef(0);
    const isDragClick = React.useRef(false);

    const onMouseDown = (e: React.MouseEvent) => {
      isDragging.current = true;
      isDragClick.current = false;
      if (!scrollContainerRef.current) return;
      startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
      scrollLeft.current = scrollContainerRef.current.scrollLeft;
    };

    const onMouseLeave = () => {
      isDragging.current = false;
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onMouseMove = (e: React.MouseEvent) => {
      if (!isDragging.current || !scrollContainerRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollContainerRef.current.offsetLeft;
      const walk = (x - startX.current) * 1.5;
      if (Math.abs(walk) > 5) {
        isDragClick.current = true;
      }
      scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
    };

  // Both the picture and the count come from the live catalogue: the piece
  // shown is one that is actually for sale, and the figure moves when the shop
  // does. A number typed in by hand here would be a claim we'd have to keep
  // remembering to true up.
  const { cover, pieceCount, categories } = React.useMemo(() => {
    const products = getProducts();
    const cats = new Set<string>();
    products.forEach((p) => cats.add(p.category));
    return {
      cover: products.find((p) => p.image)?.image ?? null,
      pieceCount: products.length,
      categories: Array.from(cats).sort(),
    };
  }, []);

  const locale = language === 'PT' ? 'pt-BR' : language === 'ES' ? 'es-ES' : 'en-GB';

  // One reveal, reused: everything here arrives on the same curve as the rest
  // of the page rather than each block inventing its own.
  const reveal = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: DURATION.content, ease: EASE_SOFT, delay },
  });

  return (
    <section ref={ref} className="relative w-full px-6 py-24 md:px-10 md:py-32 lg:py-40">
      <div className="mx-auto grid w-full max-w-6xl gap-14 lg:grid-cols-2 lg:gap-16">
        {/* Left: the statement split around a piece */}
        <div className="flex flex-col">
          <motion.h2
            {...reveal(0.05)}
            className="text-[clamp(2rem,6.4vw,4rem)] font-semibold uppercase leading-[0.95] tracking-[-0.03em] mb-12 md:mb-16"
          >
            <span className="block text-zinc-400 transition-colors duration-500">
              {t('about_title_muted')}
            </span>
          </motion.h2>

          {cover && (
            <motion.div
              {...reveal()}
              className="w-full max-w-[420px] mx-auto rounded-2xl mb-12 md:mb-16"
            >
              <img
                src={cover}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-auto w-full object-contain mix-blend-multiply"
              />
            </motion.div>
          )}
        </div>

        {/* Right: the reasoning, the way in, and the number */}
        <div className="flex flex-col h-full">
          <motion.h2
            {...reveal(0.05)}
            className="text-[clamp(2rem,6.4vw,4rem)] font-semibold uppercase leading-[0.95] tracking-[-0.03em] mb-8 md:mb-12"
          >
            <span className="block text-black transition-colors duration-500">
              {t('about_title_strong')}
            </span>
          </motion.h2>

          <motion.div {...reveal(0.1)} className="flex flex-col gap-5">
            <p className="max-w-md text-[16px] leading-relaxed text-zinc-600 transition-colors duration-500 md:text-[18px]">
              {t('about_body_1')}
            </p>
            <p className="max-w-md text-[16px] leading-relaxed text-zinc-600 transition-colors duration-500 md:text-[18px]">
              {t('about_body_2')}
            </p>
          </motion.div>

          {/* Category icons — cascading segmented control style */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
            }}
            className="mt-12"
          >
            <div className="bg-[#f2f2f6]/70 backdrop-blur-[32px] saturate-[180%] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] overflow-hidden pointer-events-auto border border-white/20 w-full max-w-md">
              <div 
                ref={scrollContainerRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                className="overflow-x-auto no-scrollbar flex items-center px-1.5 py-1.5 gap-0 select-none cursor-grab active:cursor-grabbing"
              >
                {/* The "Filter" mock button */}
                <motion.button
                  variants={{
                    hidden: { opacity: 0, x: -16, scale: 0.9 },
                    visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }
                  }}
                  onClick={(e) => {
                    if (isDragClick.current) { e.preventDefault(); return; }
                    setActiveDemoCategory('All');
                  }}
                  className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px] outline-none"
                >
                  {activeDemoCategory === 'All' && (
                    <motion.div layoutId="demo-active-dock-bg" className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />
                  )}
                  <motion.span 
                    className="relative z-10 flex flex-col items-center gap-0.5"
                    animate={{ color: activeDemoCategory === 'All' ? '#ffffff' : '#4a4a4d' }}
                  >
                    <SlidersHorizontal size={20} strokeWidth={2} className="mb-0.5" />
                    <span className="text-[9px] font-semibold tracking-wide">All</span>
                  </motion.span>
                </motion.button>

                {/* News */}
                {getDesignSettings().enableNewsPage !== false && (
                  <motion.button
                    variants={{
                      hidden: { opacity: 0, x: -16, scale: 0.9 },
                      visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }
                    }}
                    onClick={(e) => {
                      if (isDragClick.current) { e.preventDefault(); return; }
                      setActiveDemoCategory('News');
                    }}
                    className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px] outline-none hover:bg-black/5 transition-colors"
                  >
                    {activeDemoCategory === 'News' && (
                      <motion.div layoutId="demo-active-dock-bg" className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />
                    )}
                    <motion.span 
                      className="relative z-10 flex flex-col items-center gap-0.5"
                      animate={{ color: activeDemoCategory === 'News' ? '#ffffff' : '#4a4a4d' }}
                    >
                      <Newspaper size={20} strokeWidth={activeDemoCategory === 'News' ? 2 : 1.7} className="mb-0.5" />
                      <span className="text-[9px] font-semibold tracking-wide">{t('news') || 'News'}</span>
                    </motion.span>
                  </motion.button>
                )}

                {/* Sale */}
                {getDesignSettings().enableSalePage !== false && (
                  <motion.button
                    variants={{
                      hidden: { opacity: 0, x: -16, scale: 0.9 },
                      visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }
                    }}
                    onClick={(e) => {
                      if (isDragClick.current) { e.preventDefault(); return; }
                      setActiveDemoCategory('Sale');
                    }}
                    className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px] outline-none hover:bg-black/5 transition-colors"
                  >
                    {activeDemoCategory === 'Sale' && (
                      <motion.div layoutId="demo-active-dock-bg" className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />
                    )}
                    <motion.span 
                      className="relative z-10 flex flex-col items-center gap-0.5"
                      animate={{ color: activeDemoCategory === 'Sale' ? '#ffffff' : '#4a4a4d' }}
                    >
                      <span className="text-[18px] leading-none font-light mb-0.5">%</span>
                      <span className="text-[9px] font-semibold tracking-wide">{t('sale')}</span>
                    </motion.span>
                  </motion.button>
                )}

                {/* Divider */}
                <div className="w-px h-6 bg-black/10 shrink-0 mx-0.5" />

                {/* The rest of the icons */}
                {categories.map((c, i) => {
                  const isActive = activeDemoCategory === c;
                  const Icon = getCategoryIcon(c);
                  return (
                    <motion.button
                      key={i}
                      variants={{
                        hidden: { opacity: 0, x: -16, scale: 0.9 },
                        visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }
                      }}
                      onClick={(e) => {
                        if (isDragClick.current) { e.preventDefault(); return; }
                        setActiveDemoCategory(c);
                      }}
                      className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full shrink-0 min-w-[56px] outline-none hover:bg-black/5 transition-colors"
                    >
                      {isActive && (
                        <motion.div layoutId="demo-active-dock-bg" className="absolute inset-0 rounded-full bg-black z-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]" />
                      )}
                      <motion.span 
                        className="relative z-10 flex flex-col items-center gap-0.5"
                        animate={{ color: isActive ? '#ffffff' : '#4a4a4d' }}
                      >
                        {Icon
                          ? <Icon className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2 : 1.7} />
                          : <span className="w-5 h-5 mb-0.5" />}
                        <span className="text-[9px] font-semibold tracking-wide leading-tight max-w-[48px] text-center">
                          {t(c.toLowerCase()) === c.toLowerCase() ? c : t(c.toLowerCase())}
                        </span>
                      </motion.span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* The number, set the way the statement is: label, rule, figure. */}
          <motion.div {...reveal(0.15)} className="mt-10 lg:mt-12">
            <p className="text-[14px] text-zinc-500 transition-colors duration-500">
              {t('about_stat_label')}
            </p>
            <div className="mt-4 border-t border-black/10 transition-colors duration-500" />
            <p className="mt-8 text-[clamp(3rem,8vw,5.5rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums text-black transition-colors duration-500">
              {pieceCount.toLocaleString(locale)}
            </p>
            <p className="mt-3 text-[15px] text-zinc-500 transition-colors duration-500">
              {t('about_stat_caption')}
            </p>
          </motion.div>

        </div>
      </div>

      <motion.div {...reveal(0.2)} className="w-full flex justify-center -mt-6 lg:-mt-10">
        <button
          onClick={onExplore}
          className="flex flex-col items-center justify-center gap-3 p-4 group"
        >
          <span className="text-sm font-bold tracking-[0.2em] text-zinc-600 uppercase transition-colors group-hover:text-foreground">
            {t('scroll_to_explore')}
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="opacity-80 group-hover:opacity-100 transition-opacity text-zinc-600 group-hover:text-foreground"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </button>
      </motion.div>
    </section>
  );
});
AboutSection.displayName = 'AboutSection';

// The people the section above is describing. Names and cities stay put across
// languages — only what they said is translated, so the same six voices are
// speaking whichever language the site is in.
const TESTIMONIAL_NAMES = [
  'Marina Alves',
  'Tomás Ribeiro',
  'Elena Duarte',
  'Lucas Ferreira',
  'Sofia Marchetti',
  'Diego Navarro',
] as const;

// Directly after the statement about how the catalogue is chosen: other people
// saying the same thing in their own words. It travels on its own rather than
// waiting to be scrolled through, so it reads as a strip of voices instead of
// a list to get past.
const TestimonialsSection = React.forwardRef<HTMLElement>(function TestimonialsSection(_props, ref) {
  const { t, language } = useLanguage();

  const testimonials = React.useMemo(
    () =>
      TESTIMONIAL_NAMES.map((name, i) => ({
        name,
        meta: t(`testimonial_${i + 1}_meta`),
        body: t(`testimonial_${i + 1}_body`),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  const reveal = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: DURATION.content, ease: EASE_SOFT, delay },
  });

  return (
    <section ref={ref} className="relative w-full py-24 md:py-32">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <motion.p
          {...reveal()}
          className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400"
        >
          {t('testimonials_eyebrow')}
        </motion.p>
        <motion.h2
          {...reveal(0.05)}
          className="mt-4 max-w-2xl text-[clamp(1.75rem,4.6vw,3rem)] font-semibold uppercase leading-[0.98] tracking-[-0.03em]"
        >
          {t('testimonials_title')}
        </motion.h2>
      </div>

      <motion.div {...reveal(0.1)}>
        <TestimonialMarquee testimonials={testimonials} className="mt-12 md:mt-16" />
      </motion.div>
    </section>
  );
});
TestimonialsSection.displayName = 'TestimonialsSection';

// The scattered resting layout for the hero icons. Two rules shape it:
//
// 1. The middle third of the screen is left completely empty. The greeting and
//    the language segmented control sit there, and on a phone that stack is as
//    wide as the screen — anything placed at mid-height (the shoes and glasses
//    used to be) lands on top of it. So the rows go 6% / 21% above it and
//    24% / 10% from the bottom below it, and nothing is placed between.
// 2. Rows alternate three icons and two, each offset into the gaps of the row
//    before it, so it reads as a scatter rather than a grid — and the empty
//    middle already has the shape of the ring the icons gather into on scroll.
//
// Top to bottom it also runs head to toe: cap and glasses highest, outerwear on
// the shoulder line, tops, then trousers and bag along the floor. The bottom
// row's middle slot is left open on purpose — that's where the globe rises,
// so the two floor icons flank it rather than sitting on it.
// Positions with no left/right are centered exactly (see the hero's parser),
// which a percentage can't do. The order of the array is the clockwise order of
// these spots around the center, which is also the order of the ring slots, so
// the icons gather without flying across each other.
//
// `labelKey` is the catalogue's own category key, so tapping an icon names the
// piece in whatever language the visitor has chosen — and names it with the
// same word the shop uses for that department rather than a synonym invented
// here.
const onboardingHeroIcons = [
  { id: 1, icon: HoodieIcon, className: 'bottom-[24%] right-[9%]', labelKey: 'hoodies' },
  { id: 2, icon: BagIcon, className: 'bottom-[10%] right-[5%]', labelKey: 'bags' },
  { id: 3, icon: PantsIcon, className: 'bottom-[10%] left-[5%]', labelKey: 'pants' },
  { id: 4, icon: Shirt, className: 'bottom-[24%] left-[9%]', labelKey: 't-shirt' },
  { id: 5, icon: JacketIcon, className: 'top-[21%] left-[18%]', labelKey: 'jackets' },
  { id: 6, icon: CapIcon, className: 'top-[6%] left-[4%]', labelKey: 'caps' },
  { id: 7, icon: Glasses, className: 'top-[6%]', labelKey: 'accessories' },
  { id: 8, icon: SweaterIcon, className: 'top-[6%] right-[4%]', labelKey: 'sweater' },
  { id: 9, icon: PufferJacketIcon, className: 'top-[21%] right-[18%]', labelKey: 'puffer jacket' },
];

// The routes on the globe behind the hero. Villaoro's own map rather than the
// component's default airports: the houses it carries, and São Paulo on the
// receiving end of them. Module-level constants on purpose — the globe rebuilds
// itself whenever these change identity, so they must not be rebuilt per render.
// Each route carries a piece rather than a plane: the arcs are the catalogue
// travelling, so the mark riding one is a garment from the same icon set as the
// tiles scattered around the hero. Five routes, five different pieces, none of
// them repeating one already sitting still on the screen edge nearby.
const villaoroRoutes = [
  { id: 'milan-paris', from: [45.46, 9.19] as [number, number], to: [48.86, 2.35] as [number, number], icon: BagIcon },
  { id: 'paris-newyork', from: [48.86, 2.35] as [number, number], to: [40.64, -73.78] as [number, number], icon: JacketIcon },
  { id: 'newyork-saopaulo', from: [40.64, -73.78] as [number, number], to: [-23.55, -46.63] as [number, number], icon: SweaterIcon },
  { id: 'tokyo-milan', from: [35.68, 139.76] as [number, number], to: [45.46, 9.19] as [number, number], icon: CapIcon },
  { id: 'london-dubai', from: [51.51, -0.13] as [number, number], to: [25.2, 55.27] as [number, number], icon: PufferJacketIcon },
];

const villaoroCities = [
  { id: 'city-milan', location: [45.46, 9.19] as [number, number] },
  { id: 'city-paris', location: [48.86, 2.35] as [number, number] },
  { id: 'city-newyork', location: [40.64, -73.78] as [number, number] },
  { id: 'city-saopaulo', location: [-23.55, -46.63] as [number, number] },
  { id: 'city-tokyo', location: [35.68, 139.76] as [number, number] },
  { id: 'city-london', location: [51.51, -0.13] as [number, number] },
  { id: 'city-dubai', location: [25.2, 55.27] as [number, number] },
  { id: 'city-losangeles', location: [34.05, -118.24] as [number, number] },
];

/**
 * How long the pass takes to clear the printer's slot, in seconds. The account
 * is usually created faster than that, so the success screen waits for the
 * print to finish rather than cutting a half-printed ticket off mid-feed.
 */
const TICKET_PRINT_S = 3.1;

/** Locale to format the ticket's date in, per app language. */
const TICKET_LOCALE: Record<string, string> = { EN: 'en-GB', PT: 'pt-BR', ES: 'es-ES' };

const Onboarding = () => {
  const location = useLocation();
  // Scroll-based flow: sections reveal progressively as the user completes each one.
  // Terminal states (loading, approved, verify) overlay on top.
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set(['hero']));
  const [terminalStep, setTerminalStep] = useState<number | null>(null);
  const { firstName, setFirstName } = useOnboarding();
  const [gender, setGender] = useState('');
  const [category, setCategory] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingText, setLoadingText] = useState('');
  const [authError, setAuthError] = useState('');
  // Section refs for scroll targeting
  const tourSectionRef = React.useRef<HTMLElement>(null);
  const aboutSectionRef = React.useRef<HTMLElement>(null);
  const installRef = React.useRef<HTMLElement>(null);
  const nameRef = React.useRef<HTMLElement>(null);
  const genderRef = React.useRef<HTMLElement>(null);
  const categoryRef = React.useRef<HTMLElement>(null);
  const brandsRef = React.useRef<HTMLElement>(null);
  const emailRef = React.useRef<HTMLElement>(null);
  const { language, setLanguage, t } = useLanguage();

  // Helper: reveal a section and smooth-scroll to it
  const revealSection = React.useCallback((key: string, ref: React.RefObject<HTMLElement | null>) => {
    setRevealedSections(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    // Wait for the section to mount, then scroll to it
    setTimeout(() => {
      if (ref.current) scrollPageToElement(ref.current);
    }, 120);
  }, []);

  // The names are resolved once per language rather than on every render. The
  // hero derives each icon's entrance geometry from this array and recomputes
  // whenever its identity changes, so handing it a freshly-built array each
  // render would have it re-deriving the whole flight continuously.
  const heroIcons = React.useMemo(
    () => onboardingHeroIcons.map((item) => ({ ...item, label: t(item.labelKey) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  // The hero already drops its entrance flight for anyone who asked their OS
  // for less motion; the globe's idle spin is the same kind of thing, so it
  // stops too and the sphere simply sits there.
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  // ─── Chapter rail ───────────────────────────────────────────────────────
  // Five places on this page, in the order they are met. The rail says which
  // one you are in and carries you to any of the others on the site's own
  // scroll curve, so using it feels like the page moving rather than a jump.
  const heroTopRef = React.useRef<HTMLDivElement>(null);
  const testimonialsRef = React.useRef<HTMLElement>(null);
  const [currentChapter, setCurrentChapter] = useState(0);

  // Measured on demand rather than stored: the sections' positions move as
  // images load and later sections are revealed, and a cached number would
  // send someone to where a section used to be.
  const chapterTargets = React.useCallback(() => {
    const topOf = (el: Element | null) =>
      el ? el.getBoundingClientRect().top + window.scrollY : 0;
    const heroTop = topOf(heroTopRef.current);
    return [
      heroTop,
      // The hero is a runway with a sticky stage: the revealed state — the one
      // holding the "already a member" button — lives at a scroll offset into
      // it, not at an element you can aim at.
      heroTop + SCROLL_MORPH_REVEAL_OFFSET,
      topOf(aboutSectionRef.current),
      topOf(testimonialsRef.current),
      topOf(tourSectionRef.current),
    ];
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // A chapter counts as the one you're in once its top has passed a third
      // of the way up the screen — where the eye is when a section arrives.
      const probe = window.scrollY + window.innerHeight * 0.34;
      const targets = chapterTargets();
      let next = 0;
      targets.forEach((y, i) => {
        if (probe >= y) next = i;
      });
      setCurrentChapter(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [chapterTargets]);

  const chapters: Chapter[] = React.useMemo(
    () =>
      (['welcome', 'member', 'about', 'reviews', 'catalog'] as const).map((key, i) => ({
        id: key,
        meta: String(i + 1).padStart(2, '0'),
        title: t(`chapter_${key}_title`),
        description: t(`chapter_${key}_desc`),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  const goToChapter = React.useCallback(
    (_chapter: Chapter, index: number) => {
      const targets = chapterTargets();
      scrollPageTo(targets[index] ?? 0);
    },
    [chapterTargets]
  );

  // What gets printed on the pass. Resolved once per language rather than on
  // every render, so the ticket never re-renders mid-feed.
  const ticketYear = React.useMemo(() => String(new Date().getFullYear()), []);
  const ticketDate = React.useMemo(
    () =>
      new Date()
        .toLocaleDateString(TICKET_LOCALE[language] ?? 'en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .replace(/\./g, '')
        .toUpperCase(),
    [language]
  );

  useEffect(() => {
    if (terminalStep === 9) setLoadingText(t('onboarding_analyzing'));
  }, [terminalStep, t]);

  // Handle terminal step 9: Real Supabase Auth
  useEffect(() => {
    if (terminalStep === 9) {
      const startedAt = Date.now();
      // The pass finishes printing before anything replaces this screen. Signup
      // often resolves in well under a second, and a ticket yanked out of the
      // printer half-fed is worse than the extra beat of waiting.
      const waitForPrintToFinish = async () => {
        const remaining = TICKET_PRINT_S * 1000 + 500 - (Date.now() - startedAt);
        if (remaining > 0) {
          setLoadingText(t('onboarding_printing'));
          await new Promise(resolve => setTimeout(resolve, remaining));
        }
      };

      const performSignUp = async () => {
        setLoadingText(t('onboarding_analyzing'));

        try {
          // 1. Simulate the luxury curation delay (1s)
          await new Promise(resolve => setTimeout(resolve, 1000));
          setLoadingText(t('onboarding_curating'));

          // 2. Perform real Supabase Auth Sign Up
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                first_name: firstName,
                gender,
                category,
                selected_brands: selectedBrands
              }
            }
          });

          if (error) throw error;

          // 3. Let the pass finish printing before the screen changes
          await waitForPrintToFinish();

          if (!data.session) {
            // Email confirmation is required
            setAuthError('Account created! Please check your email to verify your account before logging in.');
            setTerminalStep(11);
          } else {
            // 4. Move to success screen
            setTerminalStep(10);
          }
        } catch (error: any) {
          console.error('Signup error:', error);
          setAuthError(error.message || 'Failed to create account');
          // Dismiss overlay and scroll back to email section
          setTerminalStep(null);
          setTimeout(() => {
            if (emailRef.current) scrollPageToElement(emailRef.current);
          }, 200);
        }
      };

      performSignUp();
    }
  }, [terminalStep, email, password, firstName, gender, category, selectedBrands, t]);

  // Handle terminal step 10: redirect (Success)
  useEffect(() => {
    if (terminalStep === 10) {
      const tId = setTimeout(() => {
        localStorage.setItem('villaoro_onboarding_done', 'true');
        navigate('/');
      }, 2500);

      return () => clearTimeout(tId);
    }
  }, [terminalStep, navigate]);

  // Handle terminal step 11: redirect (Email verification required)
  useEffect(() => {
    if (terminalStep === 11) {
      const tId = setTimeout(() => {
        navigate('/login');
      }, 4000);

      return () => clearTimeout(tId);
    }
  }, [terminalStep, navigate]);

  // Time-of-day greetings for the roulette
  const getGreetings = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return [
        { text: 'Good morning!', code: 'EN' },
        { text: 'Bom dia!', code: 'PT' },
        { text: '¡Buenos días!', code: 'ES' },
      ];
    } else if (hour >= 12 && hour < 18) {
      return [
        { text: 'Good afternoon!', code: 'EN' },
        { text: 'Boa tarde!', code: 'PT' },
        { text: '¡Buenas tardes!', code: 'ES' },
      ];
    } else {
      return [
        { text: 'Good evening!', code: 'EN' },
        { text: 'Boa noite!', code: 'PT' },
        { text: '¡Buenas noches!', code: 'ES' },
      ];
    }
  };

  // A shortcut for the same journey scrolling already makes: the tour is
  // right there in the page, this just glides to it on the site's curve.
  const startTour = () => {
    if (tourSectionRef.current) scrollPageToElement(tourSectionRef.current);
  };

  const scrollToAbout = () => {
    if (aboutSectionRef.current) scrollPageToElement(aboutSectionRef.current);
  };

  // Leaving the tour: reveal the install section below and scroll to it.
  const finishTour = () => revealSection('install', installRef);

  // Roulette index state for Step 1
  const [greetingIndex, setGreetingIndex] = useState(0);
  // Starts on the auto-detected language so both language pickers below show
  // a real selection immediately, instead of an empty "choose one" state.
  const [localLang, setLocalLang] = useState(language);

  useEffect(() => {
    if (terminalStep !== null) return;
    const interval = setInterval(() => {
      setGreetingIndex(prev => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, [terminalStep]);

  // Screen 0: one continuous scroll-driven experience — catalog icons scatter
  // into a circle with a welcome message, then as the user keeps scrolling
  // (in either direction, fully reversible) they spread into their final
  // layout while the logo/greeting/language-picker fade in in the same spot.
  // There's no hand-off between two separate screens; it's a single surface.
  const renderStep0 = () => {
    const greetings = getGreetings();
    const appLanguages: LanguageOption[] = [
      { code: 'EN', label: 'English', flag: '🇺🇸' },
      { code: 'PT', label: 'Português', flag: '🇧🇷' },
      { code: 'ES', label: 'Español', flag: '🇪🇸' },
    ];

    // Shared by both language pickers (the segmented control on the resting
    // circle and the dropdown in the revealed content) so either one updates
    // the site's language immediately and keeps the other in sync.
    const handleSelectLanguage = (lang: LanguageOption) => {
      setLocalLang(lang.code as any);
      setLanguage(lang.code as any);
    };

    const greetingRoulette = (
      <AnimatePresence mode="wait">
        <motion.span
          key={greetingIndex}
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -28, opacity: 0 }}
          transition={{ duration: DURATION.content, ease: EASE_SOFT }}
          className="inline-block"
        >
          {greetings[greetingIndex].text}
        </motion.span>
      </AnimatePresence>
    );

    return (
      <motion.div
        key="step0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: DURATION.screen, ease: EASE_SOFT }}
        className="relative w-full h-full min-h-screen bg-white text-black select-none"
      >
        {/* Zero-size marker for where the hero runway begins, so the chapter
            rail can aim at a scroll offset into it without assuming the hero
            starts at the very top of the document. */}
        <div ref={heroTopRef} aria-hidden="true" className="absolute left-0 top-0 h-0 w-0" />

        <ScrollMorphHero
          icons={heroIcons}
          // The stage has to let the surface through, or the page would stay
          // white for the whole runway and only turn black once the hero had
          // scrolled clear of the viewport.
          stageClassName="bg-transparent"
          // Rises out of the bottom edge where the shoes icon used to sit: half
          // a globe at rest, the whole of it once the ring has closed.
          backdrop={
            <GlobeFlights
              arcs={villaoroRoutes}
              markers={villaoroCities}
              speed={reduceMotion ? 0 : 0.0025}
            />
          }
          scrollHint={t('scroll_to_explore')}
          introTitle={greetingRoulette}
          introSubtitle={
            <LanguageSegmentedControl
              languages={appLanguages}
              value={localLang}
              onChange={handleSelectLanguage}
            />
          }
          revealTitle={
            <div
              className="font-serif text-[48px] md:text-[56px] leading-none flex items-center justify-center tracking-tight select-none font-light transition-colors duration-500 text-foreground"
            >
              <span>V</span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="font-extralight -ml-[1px]"
              >
                |
              </motion.span>
            </div>
          }
          bottomRevealContent={
            <button
              onClick={scrollToAbout}
              className="flex flex-col items-center justify-center gap-2 group"
            >
              <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase transition-colors group-hover:text-foreground">
                {t('scroll_to_explore')}
              </span>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="opacity-70 group-hover:opacity-100 transition-opacity text-muted-foreground"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
          }
        >
          <div className="flex flex-col items-center justify-center w-full">
            <button
              onClick={() => {
                navigate('/login');
              }}
              className="w-[220px] sm:w-[240px] flex items-center justify-center h-[50px] rounded-full hover:scale-[1.02] transition-all duration-500 active:scale-95 shadow-xl bg-foreground text-background shadow-black/10"
            >
              <span className="font-medium tracking-wide text-[15px]">
                {t('onboarding_already_member')}
              </span>
            </button>
          </div>
        </ScrollMorphHero>

        {/* Between the hero and the tour: the ring closes, and the next thing
            you meet says what this is before the device shows it to you. Its
            own button carries on to the tour, so the section is a step in the
            same journey rather than a detour off it. */}
        <AboutSection ref={aboutSectionRef} onExplore={startTour} />

        {/* The same claim, from the people it was made to. */}
        <TestimonialsSection ref={testimonialsRef} />

        {/* Always in the document, directly below the hero's runway: carrying
            on scrolling arrives here with nothing to trigger or wait for, and
            scrolling back up unwinds the ring exactly as it was built. */}
        <CatalogTourSection ref={tourSectionRef} onContinue={finishTour} />

        {/* ─── Install App Section ─── */}
        {revealedSections.has('install') && (
          <motion.section
            ref={installRef}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
            className="relative w-full min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] text-black select-none px-6"
          >
            <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">

              {/* Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: 0.2, duration: DURATION.content, ease: EASE_SOFT }}
                className="mb-6 mt-4"
              >
                <div
                  className="relative w-[80px] h-[80px] rounded-[22px] flex items-center justify-center bg-white"
                  style={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 2px rgba(255,255,255,0.9)',
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="absolute inset-0 rounded-[22px] bg-gradient-to-tr from-zinc-50 to-white opacity-80" />
                  <span className="relative text-[38px] leading-none drop-shadow-sm">📲</span>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35, duration: DURATION.content, ease: EASE_SOFT }}
                className="text-[24px] font-semibold text-zinc-900 tracking-tight text-center mb-2.5"
              >
                {t('install_app_title')}
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45, duration: DURATION.content, ease: EASE_SOFT }}
                className="text-[15px] text-zinc-500 font-light text-center leading-relaxed mb-8 max-w-[300px]"
              >
                {t('install_app_subtitle')}
              </motion.p>

              {/* Steps Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.55, duration: DURATION.content, ease: EASE_SOFT }}
                className="w-full bg-white rounded-3xl p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-zinc-100 flex flex-col gap-0 relative"
              >
                {/* Step 1 */}
                <div className="flex items-center gap-4 py-3 group">
                  <div className="flex-1">
                    <p className="text-[13px] md:text-[14.5px] font-semibold text-zinc-800 mb-0.5 tracking-tight">{t('install_step1_title')}</p>
                    <p className="text-[11.5px] md:text-[13px] text-zinc-500 leading-relaxed pr-2">{t('install_step1_desc')}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 mt-1 bg-zinc-50/80 px-2.5 py-1.5 rounded-xl border border-zinc-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                    <div className="w-px h-4 bg-zinc-200" />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                    </svg>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-100 to-transparent my-1" />

                {/* Step 2 */}
                <div className="flex items-center gap-4 py-3 group">
                  <div className="flex-1">
                    <p className="text-[13px] md:text-[14.5px] font-semibold text-zinc-800 mb-0.5 tracking-tight">{t('install_step2_title')}</p>
                    <p className="text-[11.5px] md:text-[13px] text-zinc-500 leading-relaxed pr-2">{t('install_step2_desc')}</p>
                  </div>
                  <div className="shrink-0 mt-1 bg-zinc-50/80 p-2 rounded-xl border border-zinc-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <path d="M12 8v8" />
                      <path d="M8 12h8" />
                    </svg>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-100 to-transparent my-1" />

                {/* Step 3 */}
                <div className="flex items-center gap-3 md:gap-4 py-3 group">
                  <div className="flex-1">
                    <p className="text-[13px] md:text-[14.5px] font-semibold text-zinc-800 mb-0.5 tracking-tight">{t('install_step3_title')}</p>
                    <p className="text-[11.5px] md:text-[13px] text-zinc-500 leading-relaxed pr-2">{t('install_step3_desc')}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3 mt-1">
                    <div className="flex flex-col items-center">
                      <img src="/apple-touch-icon.png" alt="Villaoro" className="w-10 h-10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/5" />
                    </div>
                    <div className="bg-green-50 p-2 rounded-xl border border-green-100/50 text-green-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Continue button */}
              <motion.div
                className="w-full pt-8 pb-10"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.75, duration: DURATION.content, ease: EASE_SOFT }}
              >
                <button
                  onClick={() => revealSection('name', nameRef)}
                  className="w-full py-4 px-6 rounded-[20px] bg-zinc-900 text-white font-medium tracking-wide text-[16px] transition-all duration-300 hover:bg-black hover:shadow-xl hover:shadow-black/20 active:scale-[0.98]"
                >
                  {t('install_app_continue')}
                </button>
              </motion.div>
            </div>
          </motion.section>
        )}

        {/* ─── First Name Section ─── */}
        {revealedSections.has('name') && (
          <motion.section
            ref={nameRef}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
            className="relative w-full min-h-screen flex flex-col items-center justify-center bg-white text-black px-6"
          >
            <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: DURATION.content, ease: EASE_SOFT }}
                className="w-full text-center"
              >
                <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
                  {t('onboarding_first_name_title')}
                </h2>
                <p className="text-[13px] text-zinc-400 font-light mb-12">
                  {t('onboarding_first_name_desc')}
                </p>

                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('onboarding_first_name_placeholder')}
                  className="w-full text-center text-4xl md:text-5xl font-serif text-black placeholder:text-zinc-200 outline-none bg-transparent caret-amber-500"
                />
              </motion.div>

              <motion.div
                className="w-full mt-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: DURATION.content, ease: EASE_SOFT }}
              >
                <button
                  onClick={() => {
                    if (firstName.trim().length > 1) {
                      revealSection('gender', genderRef);
                    }
                  }}
                  disabled={firstName.trim().length < 2}
                  className={`group relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
                    firstName.trim().length >= 2
                      ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10'
                      : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  }`}
                >
                  <span className="font-medium tracking-wide text-sm">{t('onboarding_continue')}</span>
                </button>
              </motion.div>
            </div>
          </motion.section>
        )}

        {/* ─── Gender Section ─── */}
        {revealedSections.has('gender') && (() => {
          const options = [
            { id: 'masculino', label: t('onboarding_male'), icon: '👱‍♂️' },
            { id: 'feminino', label: t('onboarding_female'), icon: '👩' }
          ];
          return (
            <motion.section
              ref={genderRef}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
              className="relative w-full min-h-screen flex flex-col items-center justify-center bg-white text-black px-6"
            >
              <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: DURATION.content, ease: EASE_SOFT }}
                  className="w-full text-center mb-10"
                >
                  <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
                    {t('onboarding_style_title')}
                  </h2>
                  <p className="text-[13px] text-zinc-400 font-light">
                    {t('onboarding_style_desc').replace('{name}', firstName.trim())}
                  </p>
                </motion.div>

                <div className="flex flex-col gap-3 w-full max-w-[280px]">
                  {options.map((opt, index) => (
                    <motion.button
                      key={opt.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + (index * 0.1), duration: DURATION.content, ease: EASE_SOFT }}
                      onClick={() => {
                        setGender(opt.id);
                        setTimeout(() => revealSection('category', categoryRef), 200);
                      }}
                      className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 ${
                        gender === opt.id
                          ? 'border-black bg-black text-white shadow-md'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{opt.icon}</span>
                        <span className="font-serif text-lg">{opt.label}</span>
                      </div>
                      {gender === opt.id && <Check className="w-4 h-4" />}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.section>
          );
        })()}

        {/* ─── Category Section ─── */}
        {revealedSections.has('category') && (() => {
          const categoryOptions = [
            { id: 'Footwear', icon: '👟' },
            { id: 'Clothing', icon: '👕' },
            { id: 'Bags', icon: '👜' },
            { id: 'Jewelry', icon: '💍' },
            { id: 'Accessories', icon: '🕶️' }
          ];
          return (
            <motion.section
              ref={categoryRef}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
              className="relative w-full min-h-screen flex flex-col items-center justify-center bg-white text-black px-6"
            >
              <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: DURATION.content, ease: EASE_SOFT }}
                  className="w-full text-center mb-10"
                >
                  <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
                    {t('onboarding_hunt_title')}
                  </h2>
                  <p className="text-[13px] text-zinc-400 font-light">
                    {t('onboarding_hunt_desc').replace('{name}', firstName.trim())}
                  </p>
                </motion.div>

                <div className="flex flex-col gap-3 w-full max-w-[280px]">
                  {categoryOptions.map((cat, index) => (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + (index * 0.1), duration: DURATION.content, ease: EASE_SOFT }}
                      onClick={() => {
                        setCategory(cat.id);
                        setTimeout(() => revealSection('brands', brandsRef), 200);
                      }}
                      className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 ${
                        category === cat.id
                          ? 'border-black bg-black text-white shadow-md'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="font-serif text-lg">{t(cat.id.toLowerCase())}</span>
                      </div>
                      {category === cat.id && <Check className="w-4 h-4" />}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.section>
          );
        })()}

        {/* ─── Brands Section ─── */}
        {revealedSections.has('brands') && (() => {
          const allBrands = Array.from(new Set([...staticDesigners, ...getDesigners()])).sort();

          const toggleBrand = (brand: string) => {
            if (selectedBrands.includes(brand)) {
              setSelectedBrands(selectedBrands.filter(b => b !== brand));
            } else {
              if (selectedBrands.length < 3) {
                setSelectedBrands([...selectedBrands, brand]);
              }
            }
          };

          return (
            <motion.section
              ref={brandsRef}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
              className="relative w-full min-h-screen flex flex-col bg-white text-black px-6"
            >
              <div className="flex flex-col items-center flex-1 w-full max-w-md mx-auto py-16">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: DURATION.content, ease: EASE_SOFT }}
                  className="w-full text-center mb-6"
                >
                  <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
                    {t('onboarding_brand_title')}
                  </h2>
                  <p className="text-[13px] text-zinc-400 font-light">
                    {t('onboarding_brand_desc')}
                  </p>
                </motion.div>

                <div className="flex flex-wrap justify-center gap-2 w-full px-2 mb-8">
                  {allBrands.map((brand, index) => {
                    const isSelected = selectedBrands.includes(brand);
                    return (
                      <motion.button
                        key={brand}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 + (index * 0.02), duration: DURATION.control, ease: EASE_SOFT }}
                        onClick={() => toggleBrand(brand)}
                        className={`px-4 py-2 rounded-full border text-sm transition-all duration-300 ${
                          isSelected
                            ? 'border-black bg-black text-white shadow-md'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        {brand}
                      </motion.button>
                    );
                  })}
                </div>

                <motion.div
                  className="w-full mt-auto"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6, duration: DURATION.content, ease: EASE_SOFT }}
                >
                  <button
                    onClick={() => revealSection('email', emailRef)}
                    disabled={selectedBrands.length === 0}
                    className={`group relative w-full flex items-center justify-between gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
                      selectedBrands.length > 0
                        ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10'
                        : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="font-medium tracking-wide text-sm">{t('onboarding_continue')}</span>
                    <span className="text-xs font-mono opacity-60">{selectedBrands.length} / 3</span>
                  </button>
                </motion.div>
              </div>
            </motion.section>
          );
        })()}

        {/* ─── Email / Password Section ─── */}
        {revealedSections.has('email') && (() => {
          const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
          return (
            <motion.section
              ref={emailRef}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1 }}
              className="relative w-full min-h-screen flex flex-col items-center justify-center bg-white text-black px-6"
            >
              <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: DURATION.content, ease: EASE_SOFT }}
                  className="w-full text-center"
                >
                  <h2 className="text-[15px] font-medium text-zinc-900 mb-1">
                    {t('onboarding_email_title')}
                  </h2>
                  <p className="text-[13px] text-zinc-400 font-light mb-12">
                    {t('onboarding_email_desc')}
                  </p>

                  <div className="w-full flex flex-col gap-4 mt-6 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
                      placeholder={t('onboarding_email_placeholder')}
                      className="w-full text-center text-xl md:text-2xl font-serif text-black placeholder:text-zinc-300 outline-none bg-transparent caret-amber-500 pb-2 border-b border-zinc-200 focus:border-black transition-colors"
                    />

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                      placeholder={t('onboarding_password_placeholder')}
                      className="w-full text-center text-xl md:text-2xl font-serif text-black placeholder:text-zinc-300 outline-none bg-transparent caret-amber-500 pb-2 border-b border-zinc-200 focus:border-black transition-colors mt-4"
                    />
                  </div>

                  {authError && (
                    <p className="text-red-500 text-sm mt-4">{authError}</p>
                  )}
                </motion.div>

                <motion.div
                  className="w-full mt-16"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: DURATION.content, ease: EASE_SOFT }}
                >
                  <button
                    onClick={() => {
                      if (isValidEmail(email) && password.length >= 6) {
                        setTerminalStep(9);
                      }
                    }}
                    disabled={!isValidEmail(email) || password.length < 6}
                    className={`group relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full transition-all duration-300 overflow-hidden ${
                      isValidEmail(email) && password.length >= 6
                        ? 'bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/10'
                        : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="font-medium tracking-wide text-sm">{t('onboarding_request_access')}</span>
                  </button>
                </motion.div>
              </div>
            </motion.section>
          );
        })()}

      </motion.div>
    );
  };

  // Terminal overlay: the pass being printed while the account is created.
  // The wait is the same wait it always was; this just shows what is being
  // made rather than that something is happening.
  const renderTerminal9 = () => (
    <motion.div
      key="terminal9"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE_SOFT }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#f4f4f5] px-6"
    >
      <div className="w-full max-w-[440px]">
        <TicketPrinter
          duration={TICKET_PRINT_S}
          reduceMotion={!!reduceMotion}
          label="Villaoro"
          // The ticket is the same width as the printer; the slot reads as the
          // thing it came out of only if the two line up.
          className="mx-auto"
        >
          <AdmitOneTicket
            eyebrow={t('onboarding_ticket_presents').toUpperCase()}
            subEyebrow={`${t('onboarding_ticket_edition').toUpperCase()} · ${ticketYear}`}
            name={(firstName || t('onboarding_ticket_guest')).toUpperCase()}
            footnote={`${t('onboarding_ticket_footnote').toUpperCase()} · ${ticketDate}`}
            admitLabel={t('onboarding_ticket_admit').toUpperCase()}
            year={ticketYear}
          />
        </TicketPrinter>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: DURATION.content, ease: EASE_SOFT }}
        className="mt-12 flex items-center gap-3 text-zinc-500"
      >
        <motion.span
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-4 w-4 rounded-full border-[1.5px] border-current border-t-transparent opacity-60"
        />
        <h2 className="text-[13px] font-medium tracking-wide" aria-live="polite">
          {loadingText}
        </h2>
      </motion.div>
    </motion.div>
  );

  // Terminal overlay: Approved
  const renderTerminal10 = () => (
    <motion.div
      key="terminal10"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: DURATION.screen, ease: EASE_SOFT }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white overflow-hidden text-black"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: DURATION.content, ease: EASE_SOFT }}
        className="flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
          className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6"
        >
          <Check className="w-8 h-8" strokeWidth={3} />
        </motion.div>

        <h2 className="text-2xl font-serif text-zinc-900 mb-2">
          {t('onboarding_approved')}
        </h2>
        <p className="text-[14px] text-zinc-500 font-light">
          {t('onboarding_welcome_club')} {firstName}.
        </p>
      </motion.div>
    </motion.div>
  );

  // Terminal overlay: Email Verification Required
  const renderTerminal11 = () => (
    <motion.div
      key="terminal11"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: DURATION.screen, ease: EASE_SOFT }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white overflow-hidden text-black"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: DURATION.content, ease: EASE_SOFT }}
        className="flex flex-col items-center text-center p-8 max-w-md mx-auto"
      >
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </div>

        <h2 className="text-2xl font-serif text-zinc-900 mb-4">
          {t('onboarding_verify_title')}
        </h2>
        <p className="text-[14px] text-zinc-500 font-light leading-relaxed">
          {t('onboarding_verify_desc1')} <strong className="text-zinc-800">{email}</strong>.
          <br/><br/>
          {t('onboarding_verify_desc2')}
        </p>
        <div className="mt-8">
          <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-zinc-400 mt-4">{t('onboarding_redirecting')}</p>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {/* The continuous scroll page — always rendered */}
      {renderStep0()}

      {/* Where you are on this page, and the way to anywhere else on it. Kept
          out of the way at the bottom-left, and stood down entirely once a
          terminal overlay has taken the screen. */}
      <AnimatePresence>
        {terminalStep === null && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: DURATION.content, ease: EASE_SOFT, delay: 0.4 }}
            className="fixed top-[42%] -translate-y-1/2 left-6 z-40 hidden md:block lg:left-10"
          >
            <ChapterScrubber
              chapters={chapters}
              currentIndex={currentChapter}
              onSelect={goToChapter}
              label={t('chapters_label')}
              rowHeight={26}
              restLength={16}
              peakLength={64}
              radius={2.4}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal state overlays */}
      <AnimatePresence mode="wait">
        {terminalStep === 9 && renderTerminal9()}
        {terminalStep === 10 && renderTerminal10()}
        {terminalStep === 11 && renderTerminal11()}
      </AnimatePresence>
    </>
  );
};

export default Onboarding;


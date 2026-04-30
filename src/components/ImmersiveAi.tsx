import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Quote, BookOpen, Image as ImageIcon } from "lucide-react";
import Lenis from "lenis";

interface ContentModule {
  type: "text" | "quote" | "story" | "image";
  content: string;
  author?: string;
  title?: string;
}

interface InteractionBlock {
  id: string;
  query: string;
  response: string;
  modules: ContentModule[];
}

const ImmersiveAi = () => {
  const [query, setQuery] = useState("");
  const [interactions, setInteractions] = useState<InteractionBlock[]>([
    {
      id: "init",
      query: "The Philosophy of Villaoro",
      response: "In a world of constant noise, true luxury is the silence between the notes. We curate objects that do not scream for attention, but rather, reward the discerning eye.",
      modules: [
        { type: "quote", content: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
        { type: "story", title: "The Hand's Memory", content: "Every stitch in a Zegna coat or a Brunello sweater carries the collective memory of generations of Italian artisans." }
      ]
    }
  ]);
  const [isHero, setIsHero] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const newBlock: InteractionBlock = {
      id: Date.now().toString(),
      query: text,
      response: generateMockResponse(text),
      modules: generateRandomModules(text),
    };

    setInteractions((prev) => [...prev, newBlock]);
    setQuery("");
    setIsHero(false);

    // Smooth scroll to new content
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  const generateMockResponse = (q: string) => {
    if (q.toLowerCase().includes("brunello")) {
      return "Brunello Cucinelli represents the pinnacle of humanistic capitalism. Each garment is a dialogue between tradition and modernity, crafted in the heart of Solomeo to honor the dignity of the craftsman and the beauty of the material.";
    }
    if (q.toLowerCase().includes("zegna")) {
      return "Zegna's journey begins with the Oasi Zegna, a testament to environmental stewardship and the pursuit of the world's finest wool. It is a legacy of vertical integration and uncompromising quality.";
    }
    return "The Villaoro universe is defined by 'Quiet Luxury'—an aesthetic that values the whisper over the shout. It is about the tactile sensation of high-grade cashmere, the architectural precision of a hand-lasted shoe, and the timelessness of a considered silhouette.";
  };

  const generateRandomModules = (q: string): ContentModule[] => {
    return [
      {
        type: "quote",
        content: "Luxury is not about being noticed, it's about being remembered.",
        author: "Giorgio Armani",
      },
      {
        type: "story",
        title: "The Solomeo Philosophy",
        content: "In the medieval hamlet of Solomeo, Brunello Cucinelli has created more than a brand; he has restored a way of life where work is a form of prayer and beauty is a necessity.",
      },
      {
        type: "image",
        content: "https://images.unsplash.com/photo-1539109136881-3be061094ddd?auto=format&fit=crop&q=80&w=1000",
      },
    ];
  };

  return (
    <div className="relative min-h-screen bg-[#FDFCFB] text-foreground font-serif selection:bg-accent/20">
      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <AnimatePresence>
        {isHero && (
          <motion.section 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="h-screen flex flex-col items-center justify-center px-6 relative z-10"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="w-full max-w-3xl text-center"
            >
              <h1 className="text-5xl md:text-7xl font-light mb-12 tracking-tight leading-tight">
                What would you like <br /> <span className="italic">to know?</span>
              </h1>
              
              <div className="relative group">
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  className="w-full bg-transparent border-b border-foreground/20 py-6 text-2xl md:text-3xl outline-none focus:border-foreground transition-colors placeholder:text-foreground/20"
                  placeholder="Ask about Brunello, Zegna, or the Villaoro philosophy..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend(query);
                  }}
                />
                <button 
                  onClick={() => handleSend(query)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-4 opacity-0 group-focus-within:opacity-100 transition-opacity"
                >
                  <ArrowRight className="w-8 h-8 font-light" />
                </button>
              </div>

              <div className="mt-16 flex flex-wrap justify-center gap-8 text-[11px] uppercase tracking-[0.3em] opacity-40">
                <span>Heritage</span>
                <span>Craftsmanship</span>
                <span>The Collection</span>
              </div>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Content Stream */}
      <div className="max-w-screen-xl mx-auto px-6 lg:px-12 pb-32">
        {!isHero && (
           <div className="pt-20 pb-12 sticky top-0 bg-[#FDFCFB]/80 backdrop-blur-sm z-50">
             <div className="max-w-2xl mx-auto flex items-center gap-4">
               <input
                 type="text"
                 className="flex-1 bg-transparent border-b border-foreground/10 py-3 text-lg outline-none focus:border-foreground transition-colors"
                 placeholder="Continue the conversation..."
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === "Enter") handleSend(query);
                 }}
               />
               <button onClick={() => handleSend(query)} className="hover:opacity-60 transition-opacity">
                 <ArrowRight className="w-6 h-6" />
               </button>
             </div>
           </div>
        )}

        <div className="space-y-48">
          {interactions.map((block, idx) => (
            <motion.div 
              key={block.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24"
            >
              {/* User Query - Minimal Label */}
              <div className="lg:col-span-3">
                <span className="text-[10px] uppercase tracking-[0.4em] opacity-30 sticky top-40">
                  {idx + 1} / {block.query}
                </span>
              </div>

              {/* AI Response & Modules */}
              <div className="lg:col-span-9 space-y-24">
                <div className="max-w-2xl">
                  <p className="text-3xl md:text-4xl leading-[1.4] font-light text-foreground/90">
                    {block.response}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                  {block.modules.map((mod, midx) => (
                    <motion.div
                      key={midx}
                      initial={{ opacity: 0, scale: 0.98 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 * midx, duration: 1 }}
                      className={`
                        ${mod.type === 'quote' ? 'md:col-span-2 max-w-xl mx-auto text-center py-12' : ''}
                        ${mod.type === 'image' ? 'aspect-[4/5] overflow-hidden' : ''}
                        ${mod.type === 'story' ? 'bg-secondary/20 p-12' : ''}
                      `}
                    >
                      {mod.type === 'quote' && (
                        <div className="space-y-6">
                          <Quote className="w-8 h-8 mx-auto opacity-20" />
                          <p className="text-2xl italic leading-relaxed">"{mod.content}"</p>
                          <p className="text-[10px] uppercase tracking-widest opacity-60">— {mod.author}</p>
                        </div>
                      )}

                      {mod.type === 'story' && (
                        <div className="space-y-4">
                          <BookOpen className="w-5 h-5 opacity-40" />
                          <h4 className="text-xl font-medium">{mod.title}</h4>
                          <p className="text-sm leading-relaxed opacity-70">{mod.content}</p>
                        </div>
                      )}

                      {mod.type === 'image' && (
                        <img src={mod.content} alt="" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating Back Button */}
      <button 
        onClick={() => window.location.href = '/'}
        className="fixed bottom-12 left-12 text-[10px] uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-opacity z-50 mix-blend-difference"
      >
        Return to Catalog
      </button>
    </div>
  );
};

export default ImmersiveAi;

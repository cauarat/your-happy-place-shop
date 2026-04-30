import { useState, useRef, useEffect } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { getAiConfig, AiConfig } from "@/lib/store";

const AiStylist = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [config, setConfig] = useState<AiConfig>({ suggestions: [], tone: "luxury", featuredIds: [] });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConfig(getAiConfig());
  }, []);

  // Load memory
  useEffect(() => {
    const saved = localStorage.getItem("villaoro_ai_memory");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse AI memory", e);
      }
    }
  }, []);

  // Save memory
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("villaoro_ai_memory", JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToCatalog = () => {
    const catalog = document.getElementById("catalog");
    if (catalog) {
      catalog.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setQuery("");

    if (text === "Show me all products") {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "Certainly. I've scrolled down to our full catalog for you." },
        ]);
        scrollToCatalog();
      }, 500);
      return;
    }

    // Mock AI Response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "I've curated some pieces that fit our signature quiet luxury aesthetic based on your request. Feel free to browse them below or ask me to adjust the styling.",
        },
      ]);
      scrollToCatalog();
    }, 1000);
  };

  return (
    <section className="min-h-[85vh] flex flex-col items-center justify-center relative px-6 py-20">
      <div className="absolute top-8 text-center w-full max-w-lg mx-auto">
        <Sparkles className="w-6 h-6 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl md:text-4xl mb-2">What are you looking for?</h1>
        <p className="text-muted-foreground eyebrow lowercase">Try searching for "Minimalist outerwear"</p>
      </div>

      <div className="w-full max-w-2xl mt-24">
        {messages.length > 0 && (
          <div className="mb-8 space-y-4 max-h-[30vh] overflow-y-auto no-scrollbar pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-4 max-w-[80%] text-sm rounded-lg ${
                  msg.role === "user"
                    ? "bg-secondary text-secondary-foreground ml-auto rounded-br-none"
                    : "glass text-foreground mr-auto rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="relative glass rounded-full flex items-center p-2 shadow-sm transition-shadow focus-within:shadow-md">
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none px-6 py-3 text-sm placeholder:text-muted-foreground"
            placeholder="Ask me to find products, build outfits, or give styling advice..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend(query);
            }}
          />
          <button
            onClick={() => handleSend(query)}
            className="bg-primary text-primary-foreground p-3 rounded-full hover:opacity-90 transition-opacity"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {config.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSend(suggestion)}
              className="px-5 py-2.5 rounded-full border border-border text-xs uppercase tracking-wide text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AiStylist;

import { useEffect, useState } from "react";
import { getDesignSettings, saveDesignSettings, DesignSettings } from "@/lib/store";
import { Newspaper, Tag } from "lucide-react";

const AdminSettings = () => {
  const [settings, setSettings] = useState<DesignSettings>(getDesignSettings());

  useEffect(() => {
    setSettings(getDesignSettings());
  }, []);

  const toggle = (key: keyof DesignSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveDesignSettings(updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage site features and pages.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-4">Page Visibility</h2>

        {/* News Toggle */}
        <div className="flex items-center justify-between border border-border px-6 py-5 bg-white rounded-none">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-border flex items-center justify-center">
              <Newspaper size={18} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">News Page</p>
              <p className="text-xs text-muted-foreground mt-0.5">Show the News page with latest products by brand.</p>
            </div>
          </div>
          <button
            onClick={() => toggle("enableNewsPage")}
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
              settings.enableNewsPage !== false ? "bg-black" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
                settings.enableNewsPage !== false ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Sale Toggle */}
        <div className="flex items-center justify-between border border-border px-6 py-5 bg-white rounded-none">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border border-border flex items-center justify-center">
              <Tag size={18} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Sale</p>
              <p className="text-xs text-muted-foreground mt-0.5">Show the Sale filter pill in the catalog.</p>
            </div>
          </div>
          <button
            onClick={() => toggle("enableSalePage")}
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
              settings.enableSalePage !== false ? "bg-black" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
                settings.enableSalePage !== false ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

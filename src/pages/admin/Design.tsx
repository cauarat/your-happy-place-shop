import { useEffect, useState } from "react";
import { getDesignSettings, saveDesignSettings, DesignSettings } from "@/lib/store";
import { Save } from "lucide-react";

const AdminDesign = () => {
  const [settings, setSettings] = useState<DesignSettings>({
    minimalMode: true,
    borderRadius: "0px",
    buttonColor: "hsl(var(--primary))",
  });

  useEffect(() => {
    setSettings(getDesignSettings());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveDesignSettings(settings);
    // Apply instantly for preview by setting CSS variables on root
    const root = document.documentElement;
    root.style.setProperty("--radius", settings.borderRadius);
    alert("Settings saved. Changes will reflect across the site.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">Design Customization</h1>
        <p className="text-muted-foreground">Adjust styling, borders, and UI elements.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6 glass p-8 rounded-2xl h-fit">
          <h2 className="text-xl mb-4">UI Elements</h2>
          
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <label className="block text-sm font-medium">Minimal Mode</label>
              <p className="text-xs text-muted-foreground mt-1">Hides unnecessary borders and drops shadows.</p>
            </div>
            <input 
              name="minimalMode"
              type="checkbox" 
              className="w-5 h-5 accent-primary"
              checked={settings.minimalMode}
              onChange={handleChange}
            />
          </div>

          <div className="border-b border-border pb-4">
            <label className="block text-sm font-medium mb-2">Border Radius (Buttons & Cards)</label>
            <select 
              name="borderRadius"
              className="w-full bg-transparent border border-border py-2 px-3 outline-none focus:border-primary transition-colors"
              value={settings.borderRadius}
              onChange={handleChange}
            >
              <option value="0px" className="bg-background">Sharp (0px) - Default Editorial</option>
              <option value="0.3rem" className="bg-background">Soft (0.3rem)</option>
              <option value="0.5rem" className="bg-background">Rounded (0.5rem)</option>
              <option value="9999px" className="bg-background">Pill (9999px)</option>
            </select>
          </div>

          <div className="border-b border-border pb-4">
            <label className="block text-sm font-medium mb-2">Primary Button Color</label>
            <div className="flex gap-4 items-center">
              <input 
                name="buttonColor"
                type="color" 
                className="w-10 h-10 p-0 border-0 outline-none"
                value={settings.buttonColor === "hsl(var(--primary))" ? "#000000" : settings.buttonColor}
                onChange={handleChange}
              />
              <span className="text-xs text-muted-foreground uppercase">{settings.buttonColor}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-primary text-primary-foreground px-8 py-3 rounded-full uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Save className="w-4 h-4" />
              Save Design
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-6">Live Preview</h2>
          <div className="p-8 border border-border bg-background flex flex-col items-center justify-center space-y-6" style={{ borderRadius: settings.borderRadius }}>
             <p className="text-lg font-display">Example Card</p>
             <button 
                className="px-8 py-3 text-white uppercase text-xs tracking-wider transition-opacity hover:opacity-90"
                style={{ 
                  borderRadius: settings.borderRadius,
                  backgroundColor: settings.buttonColor 
                }}
              >
               Example Button
             </button>
             {!settings.minimalMode && (
               <div className="w-full h-px bg-border my-4" />
             )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminDesign;

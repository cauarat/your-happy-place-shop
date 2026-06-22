import { useEffect, useState } from "react";
import { getAiConfig, saveAiConfig, AiConfig } from "@/lib/store";
import { Save, Plus, Trash2 } from "lucide-react";
import ForzaVistaViewer from "@/components/admin/ForzaVistaViewer";

const AdminAiControl = () => {
  const [config, setConfig] = useState<AiConfig>({ suggestions: [], tone: "luxury", featuredIds: [] });

  useEffect(() => {
    setConfig(getAiConfig());
  }, []);

  const handleSuggestionChange = (index: number, value: string) => {
    const newSuggestions = [...config.suggestions];
    newSuggestions[index] = value;
    setConfig({ ...config, suggestions: newSuggestions });
  };

  const addSuggestion = () => {
    setConfig({ ...config, suggestions: [...config.suggestions, "New Suggestion"] });
  };

  const removeSuggestion = (index: number) => {
    const newSuggestions = config.suggestions.filter((_, i) => i !== index);
    setConfig({ ...config, suggestions: newSuggestions });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveAiConfig(config);
    alert("AI Configuration saved.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">AI Stylist Control</h1>
        <p className="text-muted-foreground">Manage the homepage AI assistant experience.</p>
      </div>

      <div className="w-full">
        <ForzaVistaViewer />
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-2xl space-y-6">
          <h2 className="text-xl mb-4">Tone & Personality</h2>
          
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">AI Tone</label>
            <select 
              className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-primary transition-colors"
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value })}
            >
              <option value="minimal" className="bg-background text-foreground">Minimal & Direct</option>
              <option value="luxury" className="bg-background text-foreground">Luxury & Elegant</option>
              <option value="casual" className="bg-background text-foreground">Casual & Friendly</option>
            </select>
          </div>
        </div>

        <div className="glass p-8 rounded-2xl space-y-6">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl">Suggestion Buttons</h2>
            <button 
              type="button"
              onClick={addSuggestion}
              className="text-xs uppercase tracking-wider flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Button
            </button>
          </div>
          
          <div className="space-y-3">
            {config.suggestions.map((suggestion, index) => (
              <div key={index} className="flex gap-4 items-center">
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border border-border rounded-lg py-2 px-4 outline-none focus:border-primary transition-colors text-sm"
                  value={suggestion}
                  onChange={(e) => handleSuggestionChange(index, e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => removeSuggestion(index)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 flex justify-end">
          <button type="submit" className="bg-primary text-primary-foreground px-8 py-3 rounded-full uppercase text-xs tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Save className="w-4 h-4" />
            Save AI Config
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAiControl;


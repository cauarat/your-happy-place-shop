import { useEffect, useState } from "react";
import {
  getAiConfig,
  saveAiConfig,
  AiConfig,
  getDesignSettings,
  saveDesignSettings,
  DesignSettings,
} from "@/lib/store";
import { DEFAULT_VOICE_ID } from "@/lib/voiceLines";
import * as piper from "@/lib/voiceEngines/piper";
import { Save, Plus, Trash2 } from "lucide-react";
import ForzaVistaViewer from "@/components/admin/ForzaVistaViewer";

const AdminAiControl = () => {
  const [config, setConfig] = useState<AiConfig>({ suggestions: [], tone: "luxury", featuredIds: [] });
  const [voice, setVoice] = useState<DesignSettings>(getDesignSettings);

  useEffect(() => {
    setConfig(getAiConfig());
  }, []);

  // What Piper has on this machine. Read once on mount: it is a question about
  // the admin's own browser, not about the site, and it is the only way to see
  // whether the download ever succeeded.
  const [piperStatus, setPiperStatus] = useState("checking…");
  const refreshPiper = () => {
    if (!piper.isSupported()) return setPiperStatus("not supported in this browser");
    piper
      .readyLanguages()
      .then((langs) =>
        setPiperStatus(langs.length ? `downloaded: ${langs.join(", ")}` : "nothing downloaded yet")
      )
      .catch(() => setPiperStatus("unavailable"));
  };
  useEffect(refreshPiper, []);

  const handleClearModels = async () => {
    await piper.clearModels();
    refreshPiper();
  };

  // Written straight through rather than waiting for a Save button. These are
  // switches on the design settings, and `saveDesignSettings` announces the
  // change, so a live tab picks it up as it is made.
  const saveVoice = (patch: Partial<DesignSettings>) => {
    const updated = { ...getDesignSettings(), ...patch };
    setVoice(updated);
    saveDesignSettings(updated);
  };

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

      {/* Saved separately from the AI config above: this lives in the design
          settings, alongside the background music, because it is part of how
          the site sounds rather than part of what the stylist says. */}
      <div className="glass p-8 rounded-2xl space-y-6">
        <div>
          <h2 className="text-xl mb-1">Voice Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Reads the tour pop-ups and the onboarding out loud, and names what a shopper
            selects. Switching it off here silences it for every visitor, whatever they
            chose for themselves.
          </p>
        </div>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="text-sm">Enabled for everyone</span>
          <input
            type="checkbox"
            className="w-5 h-5 accent-primary"
            checked={voice.assistantEnabled !== false}
            onChange={(e) => saveVoice({ assistantEnabled: e.target.checked })}
          />
        </label>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">
            ElevenLabs Voice ID — recordings only
          </label>
          <input
            type="text"
            className="w-full bg-transparent border-b border-border py-2 outline-none focus:border-primary transition-colors font-mono text-sm"
            value={voice.assistantVoiceId || ""}
            placeholder={DEFAULT_VOICE_ID}
            onChange={(e) => saveVoice({ assistantVoiceId: e.target.value.trim() })}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Used only when re-recording the fixed lines with{" "}
            <code className="font-mono">npm run voice:build</code>. Nothing on the live
            site calls ElevenLabs any more.
          </p>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
            Neural voice on the visitor's device
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Lines with no recording — a shopper's name, a category, a product — are
            spoken by Piper, running inside the browser. Free, unlimited, and private:
            nothing is sent anywhere. It fetches a {"~"}60&nbsp;MB model per language on
            first use and keeps it, so only the first visit pays. Until it arrives the
            browser's own voice covers the gap, and the site is never silent.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">
              {piperStatus}
            </span>
            <button
              type="button"
              onClick={handleClearModels}
              className="text-xs uppercase tracking-wider px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors"
            >
              Clear downloaded models
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Volume — {Math.round((voice.assistantVolume ?? 1) * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            className="w-full accent-primary"
            value={voice.assistantVolume ?? 1}
            onChange={(e) => saveVoice({ assistantVolume: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminAiControl;


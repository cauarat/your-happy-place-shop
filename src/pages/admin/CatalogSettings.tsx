import { useState, useEffect } from "react";
import { getCategories, saveCategories, getDesigners, saveDesigners, getDesignSettings, saveDesignSettings, exportDatabase, importDatabase } from "@/lib/store";
import { Plus, Trash2, Tag, User, Save, ArrowLeft, Download, Upload, Database, RefreshCw, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CatalogSettings = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [designers, setDesigners] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newDesigner, setNewDesigner] = useState("");
  const [designSettings, setDesignSettings] = useState(getDesignSettings());

  const handleSaveMusic = () => {
    saveDesignSettings(designSettings);
    toast.success("Background music settings saved");
  };

  useEffect(() => {
    setCategories(getCategories());
    setDesigners(getDesigners());
  }, []);

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      toast.error("Category already exists");
      return;
    }
    const updated = [...categories, newCategory.trim()].sort();
    setCategories(updated);
    saveCategories(updated);
    setNewCategory("");
    toast.success("Category added");
  };

  const handleRemoveCategory = (cat: string) => {
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    saveCategories(updated);
    toast.success("Category removed");
  };

  const handleAddDesigner = () => {
    if (!newDesigner.trim()) return;
    if (designers.includes(newDesigner.trim())) {
      toast.error("Designer already exists");
      return;
    }
    const updated = [...designers, newDesigner.trim()].sort();
    setDesigners(updated);
    saveDesigners(updated);
    setNewDesigner("");
    toast.success("Designer added");
  };

  const handleRemoveDesigner = (des: string) => {
    const updated = designers.filter(d => d !== des);
    setDesigners(updated);
    saveDesigners(updated);
    toast.success("Designer removed");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importDatabase(json);
        toast.success("Database restored successfully");
      } catch (err) {
        toast.error("Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-4xl mx-auto">
      <div className="flex items-center gap-6">
        <button onClick={() => navigate("/admin/dashboard")} className="p-3 hover:bg-secondary rounded-full transition-all active:scale-90 border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-4xl font-display tracking-tight mb-1">Catalog Structure</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Manage your dynamic categories and designers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Categories Section */}
        <section className="glass p-8 rounded-[32px] border border-white/20 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display">Categories</h2>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="New category name..."
              className="flex-1 bg-secondary/30 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleAddCategory}
              className="p-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
            {categories.map((cat) => (
              <li key={cat} className="flex items-center justify-between group bg-secondary/10 p-3 rounded-xl hover:bg-secondary/20 transition-colors">
                <span className="text-sm font-medium">{cat}</span>
                <button
                  onClick={() => handleRemoveCategory(cat)}
                  className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Designers Section */}
        <section className="glass p-8 rounded-[32px] border border-white/20 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display">Designers</h2>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newDesigner}
              onChange={(e) => setNewDesigner(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDesigner()}
              placeholder="New designer name..."
              className="flex-1 bg-secondary/30 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleAddDesigner}
              className="p-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
            {designers.map((des) => (
              <li key={des} className="flex items-center justify-between group bg-secondary/10 p-3 rounded-xl hover:bg-secondary/20 transition-colors">
                <span className="text-sm font-medium">{des}</span>
                <button
                  onClick={() => handleRemoveDesigner(des)}
                  className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Default Landing Category */}
      <section className="glass p-8 rounded-[32px] border border-white/20 shadow-sm space-y-6 mt-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Tag className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display">Default Landing Category</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Select which category should be displayed first when a user visits your site.
        </p>

        <div className="flex gap-2">
          <select
            value={designSettings.defaultCategory || "Footwear"}
            onChange={(e) => {
              const newSettings = { ...designSettings, defaultCategory: e.target.value };
              setDesignSettings(newSettings);
              saveDesignSettings(newSettings);
              toast.success("Default category saved");
            }}
            className="flex-1 bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors appearance-none"
          >
            <option value="All">All Products</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Background Music Section */}
      <section className="glass p-8 rounded-[32px] border border-white/20 shadow-sm space-y-6 mt-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Music className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display">Background Music</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Paste a YouTube URL to automatically play music for visitors when they browse your store.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={designSettings.musicUrl || ""}
            onChange={(e) => setDesignSettings({ ...designSettings, musicUrl: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveMusic()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 bg-secondary/30 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={handleSaveMusic}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">Save</span>
          </button>
        </div>
      </section>

      {/* Persistence Section */}
      <section className="glass p-8 rounded-[32px] border border-white/20 shadow-sm space-y-8 mt-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display">Persistence & Backups</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">Local Storage Only</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Export Database</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Download your entire collection, categories, and design settings as a JSON file. Use this to save your progress before closing the session.
            </p>
            <button
              onClick={exportDatabase}
              className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 rounded-xl text-xs uppercase tracking-widest transition-all"
            >
              <Download className="w-4 h-4" />
              Download Backup
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Import Database</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Restore your products and settings from a previously saved backup file. This will overwrite your current local data.
            </p>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="flex items-center gap-2 px-6 py-3 border border-border hover:bg-secondary/30 rounded-xl text-xs uppercase tracking-widest transition-all w-full justify-center">
                <Upload className="w-4 h-4" />
                Select Backup File
              </button>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
          <div className="flex gap-4">
            <RefreshCw className="w-5 h-5 text-primary shrink-0 mt-1" />
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest">Why do products disappear?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This application stores data in your browser's <span className="text-foreground font-medium">Local Storage</span>. 
                In temporary development environments like Antigravity, this storage is often cleared when the session ends. 
                To keep your work permanently, always <span className="text-foreground font-medium">Download Backup</span> before closing, and <span className="text-foreground font-medium">Restore</span> it when you return.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CatalogSettings;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProducts, saveProduct } from "@/lib/store";
import type { Product, Category, Designer } from "@/data/products";
import { categories, designers } from "@/data/products";
import { ArrowLeft, Save, Upload, Image as ImageIcon, Crop, X, Eraser, ArrowUp, ArrowDown, Trash2, CheckCircle2, ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";
import { removeBackground } from "@imgly/background-removal";
import { compressImage } from "@/lib/compressImage";

const defaultProduct: Product = {
  id: "",
  name: "",
  category: "Clothing",
  designer: "Brunello",
  price: 0,
  image: "",
  createdAt: Date.now(),
  rating: 5,
  removeBackground: false,
  images: [],
};

const AdminProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [product, setProduct] = useState<Product>(defaultProduct);
  
  // Cropping state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      const existing = getProducts().find(p => p.id === id);
      if (existing) {
        setProduct({
          ...existing,
          images: existing.images || (existing.image ? [existing.image] : [])
        });
      }
    } else {
      setProduct({ ...defaultProduct, id: Date.now().toString(), images: [] });
    }
  }, [id, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: name === "price" || name === "oldPrice" ? Number(value) : value,
    }));
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const compressed = await compressImage(base64);
      setImageToCrop(compressed);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  };

  const handleApplyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    
    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const compressed = await compressImage(croppedImage);
      
      setProduct(prev => {
        const newImages = [...(prev.images || [])];
        newImages.push(compressed);
        return { 
          ...prev, 
          image: prev.image || compressed, // Set as main if none exists
          images: newImages 
        };
      });
      
      setIsCropping(false);
      setImageToCrop(null);
      toast.success("Image added to gallery.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to crop image.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleToggleBackgroundRemoval = async () => {
    const newState = !product.removeBackground;
    
    if (newState) {
      // Toggle ON
      setIsProcessing(true);
      const loadingToast = toast.loading("AI is removing background...");
      
      try {
        // Store original if not already stored
        const originalImage = product.originalImage || product.image;
        
        // Run background removal
        const blob = await removeBackground(originalImage);
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const compressed = await compressImage(base64data);
          setProduct(prev => ({
            ...prev,
            image: compressed,
            originalImage: originalImage,
            removeBackground: true
          }));
          toast.dismiss(loadingToast);
          toast.success("Background removed by AI.");
          setIsProcessing(false);
        };
      } catch (error) {
        console.error("Background removal failed:", error);
        toast.dismiss(loadingToast);
        toast.error("AI background removal failed. Try another image.");
        setIsProcessing(false);
      }
    } else {
      // Toggle OFF
      if (product.originalImage) {
        setProduct(prev => ({
          ...prev,
          image: prev.originalImage || prev.image,
          removeBackground: false
        }));
      } else {
        setProduct(prev => ({ ...prev, removeBackground: false }));
      }
      toast.success("Original background restored.");
    }
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...(product.images || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newImages.length) return;
    
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setProduct(prev => ({ ...prev, images: newImages }));
  };

  const removeImage = (index: number) => {
    const newImages = (product.images || []).filter((_, i) => i !== index);
    setProduct(prev => ({ 
      ...prev, 
      images: newImages,
      image: prev.image === prev.images?.[index] ? (newImages[0] || "") : prev.image
    }));
  };

  const setMainImage = (index: number) => {
    setProduct(prev => ({ ...prev, image: prev.images?.[index] || prev.image }));
    toast.success("Primary image updated.");
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveProduct(product);
    navigate("/admin/products");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-3 hover:bg-secondary rounded-full transition-all active:scale-90 border border-border">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-4xl font-display tracking-tight mb-1">{isNew ? "Create Product" : "Edit Product"}</h1>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{isNew ? "Adding new excellence to the collection" : `Refining ID: ${id}`}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-full border border-border text-[10px] uppercase tracking-widest hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="bg-primary text-primary-foreground px-8 py-2.5 rounded-full uppercase text-[10px] tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-12 items-start">
        <div className="space-y-12">
          {/* Main Form Section */}
          <section className="glass p-10 rounded-[32px] border border-white/20 shadow-sm space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Product Title</label>
                  <input 
                    name="name"
                    type="text" 
                    className="w-full bg-transparent border-b border-border py-3 text-lg outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30 font-display"
                    value={product.name}
                    onChange={handleChange}
                    placeholder="e.g. Cashmere Double-Breasted Coat"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Category</label>
                    <select 
                      name="category"
                      className="w-full bg-transparent border-b border-border py-3 text-xs uppercase tracking-widest outline-none focus:border-primary transition-colors"
                      value={product.category}
                      onChange={handleChange}
                    >
                      {categories.filter(c => c !== "All").map(c => (
                        <option key={c} value={c} className="bg-background text-foreground">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Designer</label>
                    <select 
                      name="designer"
                      className="w-full bg-transparent border-b border-border py-3 text-xs uppercase tracking-widest outline-none focus:border-primary transition-colors"
                      value={product.designer}
                      onChange={handleChange}
                    >
                      {designers.filter(d => d !== "All").map(d => (
                        <option key={d} value={d} className="bg-background text-foreground">{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Price</label>
                    <div className="relative">
                      <span className="absolute left-0 top-3 text-muted-foreground">$</span>
                      <input 
                        name="price"
                        type="number" 
                        min="0"
                        step="0.01"
                        className="w-full bg-transparent border-b border-border py-3 pl-4 text-sm outline-none focus:border-primary transition-colors font-medium"
                        value={product.price || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Retail Price</label>
                    <div className="relative">
                      <span className="absolute left-0 top-3 text-muted-foreground">$</span>
                      <input 
                        name="oldPrice"
                        type="number" 
                        min="0"
                        step="0.01"
                        className="w-full bg-transparent border-b border-border py-3 pl-4 text-sm outline-none focus:border-primary transition-colors font-medium opacity-60"
                        value={product.oldPrice || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Lab */}
              <div className="space-y-6">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Visual Asset Management</label>
                
                <div 
                  className="group relative aspect-[4/5] bg-secondary/30 rounded-[24px] border-2 border-dashed border-border flex flex-col items-center justify-center p-8 transition-all hover:border-primary/50 hover:bg-secondary/50 cursor-pointer overflow-hidden"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImageFile(file);
                  }}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {product.image ? (
                    <img src={product.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto shadow-sm border border-border group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Drop high-quality image here</p>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">or click to browse</p>
                      </div>
                    </div>
                  )}
                  
                  {product.image && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                       <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setIsCropping(true); setImageToCrop(product.image); }}
                        className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                      >
                        <Crop className="w-5 h-5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleToggleBackgroundRemoval(); }}
                        className={`p-3 rounded-full hover:scale-110 transition-transform ${product.removeBackground ? 'bg-primary text-white' : 'bg-white text-black'}`}
                      >
                        <Eraser className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  id="image-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />

                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
                  Tip: You can also paste an image directly (Ctrl+V)
                </p>
              </div>
            </div>

            {/* AI Studio Controls */}
            <div className="bg-secondary/20 p-6 rounded-[24px] border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${product.removeBackground ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                  <Eraser className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">AI Background Removal</h4>
                  <p className="text-xs text-muted-foreground">Isolate the product for a seamless look.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isProcessing && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] uppercase tracking-widest text-primary animate-pulse">Processing...</span>
                  </div>
                )}
                <button
                  type="button"
                  disabled={isProcessing || !product.image}
                  onClick={handleToggleBackgroundRemoval}
                  className={`w-14 h-7 rounded-full transition-all relative ${product.removeBackground ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-border'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${product.removeBackground ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Product Gallery Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Product Gallery</h3>
              <p className="text-[10px] text-muted-foreground italic">Drag to reorder sequence</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {(product.images || []).map((img, index) => (
                <div key={index} className="group relative aspect-square rounded-[20px] overflow-hidden border border-border bg-secondary/20 transition-all hover:border-primary">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  
                  {product.image === img && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-primary text-white text-[8px] uppercase tracking-widest rounded-full">
                      Primary
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setMainImage(index)}
                      className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                      title="Set as Main"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveImage(index, 'up')}
                        className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors disabled:opacity-30"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="p-2 bg-destructive/80 text-white rounded-full hover:bg-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <button 
                        type="button"
                        disabled={index === (product.images?.length || 0) - 1}
                        onClick={() => moveImage(index, 'down')}
                        className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors disabled:opacity-30"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => document.getElementById('image-upload')?.click()}
                className="aspect-square rounded-[20px] border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-all bg-secondary/5"
              >
                <Upload className="w-6 h-6" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Add Asset</span>
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar Preview - SSENSE style */}
        <aside className="space-y-8 sticky top-24">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Live Context</h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Real-time</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center italic">Catalog View</p>
            <div className="p-8 bg-background border border-border shadow-2xl rounded-sm">
              <ProductCard product={product} />
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/20 space-y-4">
             <h4 className="text-[10px] uppercase tracking-widest font-bold border-b border-border/50 pb-2">Asset Quality Report</h4>
             <div className="space-y-3">
               <div className="flex justify-between items-center text-[10px]">
                 <span className="text-muted-foreground uppercase">Resolution</span>
                 <span className="font-bold text-emerald-500">2048px (Optimized)</span>
               </div>
               <div className="flex justify-between items-center text-[10px]">
                 <span className="text-muted-foreground uppercase">Compression</span>
                 <span className="font-bold">90% Quality</span>
               </div>
               <div className="flex justify-between items-center text-[10px]">
                 <span className="text-muted-foreground uppercase">AI Clipping</span>
                 <span className={product.removeBackground ? "font-bold text-emerald-500" : "font-bold text-amber-500"}>
                   {product.removeBackground ? "Enabled" : "Original"}
                 </span>
               </div>
             </div>
          </div>
        </aside>
      </div>

      {/* Cropper Modal */}
      {isCropping && imageToCrop && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-12">
          <div className="bg-background w-full max-w-5xl h-[85vh] rounded-[40px] overflow-hidden flex flex-col shadow-2xl border border-white/10">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-secondary rounded-lg">
                  <Crop className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl">Asset Refinement</h3>
              </div>
              <button 
                onClick={() => setIsCropping(false)}
                className="p-3 hover:bg-secondary rounded-full transition-all active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 relative bg-[#0F0F0F]">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={3/4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            
            <div className="p-8 border-t border-border bg-background flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 w-full space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Zoom Control</label>
                  <span className="text-[10px] font-mono">{zoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsCropping(false)}
                  className="px-8 py-3 rounded-full border border-border text-[10px] uppercase tracking-[0.2em] hover:bg-secondary transition-colors"
                >
                  Discard
                </button>
                <button 
                  onClick={handleApplyCrop}
                  className="bg-primary text-primary-foreground px-10 py-3 rounded-full uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 hover:opacity-90 transition-all shadow-lg active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Refinement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductEdit;

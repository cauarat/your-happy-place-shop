import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProducts, saveProduct, getCategories, getDesigners, saveDesigners } from "@/lib/store";
import type { Product, Category, Designer } from "@/data/products";
import { ArrowLeft, Save, Upload, Image as ImageIcon, Crop, X, Eraser, ArrowUp, ArrowDown, Trash2, CheckCircle2, ArrowRight, Plus, Film, FlipHorizontal, FlipVertical, User, Move, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";
import { removeBackground } from "@imgly/background-removal";
import { compressImage } from "@/lib/compressImage";
import { uploadToR2 } from "@/utils/cloudflareUpload";
import { computeCropStyles } from "@/lib/cropUtils";

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
  productLinks: [""],
  allowQuantity: true,
};

/** Sample the four corner pixels of the original image to detect its background colour.
 *  Returns an rgb() string so the canvas padding is invisible against the photo background. */
const detectImageBackground = (img: HTMLImageElement): string => {
  const sampleCanvas = document.createElement('canvas');
  // Use a small sampling canvas for speed
  const SW = Math.min(img.width, 600);
  const SH = Math.min(img.height, 600);
  sampleCanvas.width = SW;
  sampleCanvas.height = SH;
  const sctx = sampleCanvas.getContext('2d');
  if (!sctx) return '#ffffff';
  sctx.drawImage(img, 0, 0, SW, SH);

  // Sample pixels at the four corners (3px inset to avoid JPEG artefacts)
  const inset = 3;
  const corners = [
    sctx.getImageData(inset, inset, 1, 1).data,
    sctx.getImageData(SW - inset - 1, inset, 1, 1).data,
    sctx.getImageData(inset, SH - inset - 1, 1, 1).data,
    sctx.getImageData(SW - inset - 1, SH - inset - 1, 1, 1).data,
  ];

  const r = Math.round(corners.reduce((s, c) => s + c[0], 0) / corners.length);
  const g = Math.round(corners.reduce((s, c) => s + c[1], 0) / corners.length);
  const b = Math.round(corners.reduce((s, c) => s + c[2], 0) / corners.length);

  return `rgb(${r},${g},${b})`;
};

const standardizeImage = (base64: string, is16x9: boolean = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Catalog standard is 3:4 (1500x2000), 16:9 is 1920x1080
      const targetWidth = is16x9 ? 1920 : 1500;
      const targetHeight = is16x9 ? 1080 : 2000;
      
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      // 1. Auto-detect the photo's own background colour and use it for padding
      //    so borders are completely invisible against the product image background.
      const bgColor = detectImageBackground(img);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // 2. Intelligent framing: prevent cropping by scaling down into the safe area
      const padding = targetWidth * 0.12; // 12% padding for premium breathing room
      const availWidth = targetWidth - padding * 2;
      const availHeight = targetHeight - padding * 2;

      const scale = Math.min(availWidth / img.width, availHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // 3. Perfect centering
      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;

      // 4. Draw with max quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      // Output as high quality JPEG
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = reject;
    img.src = base64;
  });
};

/** After a horizontal flip, text/logos become mirror-reversed and unreadable.
 *  This function detects text regions in the readable (counter-flipped) orientation
 *  and composites them back over the mirrored areas so branding stays legible. */
const correctTextAfterHorizontalFlip = async (flippedBase64: string): Promise<string> => {
  // TextDetector is available in Chrome 74+ (not Firefox/Safari)
  if (!('TextDetector' in window)) return flippedBase64;

  const loadImg = (src: string): Promise<HTMLImageElement> =>
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });

  try {
    const flippedImg = await loadImg(flippedBase64);
    const W = flippedImg.width;
    const H = flippedImg.height;

    // Working canvas — this will be our final output
    const outCanvas = document.createElement('canvas');
    outCanvas.width = W;
    outCanvas.height = H;
    const outCtx = outCanvas.getContext('2d')!;
    outCtx.drawImage(flippedImg, 0, 0);

    // Counter-flipped canvas — restores the original readable orientation
    const origCanvas = document.createElement('canvas');
    origCanvas.width = W;
    origCanvas.height = H;
    const origCtx = origCanvas.getContext('2d')!;
    origCtx.save();
    origCtx.translate(W, 0);
    origCtx.scale(-1, 1);
    origCtx.drawImage(flippedImg, 0, 0);
    origCtx.restore();

    // Detect text on the READABLE version (much more reliable than on mirrored text)
    const detector = new (window as any).TextDetector();
    const bitmap = await createImageBitmap(origCanvas);
    const detections = await detector.detect(bitmap);

    if (detections.length === 0) return flippedBase64;

    const margin = 10; // px of safety padding around each text region
    for (const det of detections) {
      const { x, y, width: tw, height: th } = det.boundingBox;

      // Expand with margin, clamped to canvas edges
      const ox = Math.max(0, Math.round(x - margin));
      const oy = Math.max(0, Math.round(y - margin));
      const ow = Math.min(W - ox, Math.round(tw + margin * 2));
      const oh = Math.min(H - oy, Math.round(th + margin * 2));

      // Mirrored position in the flipped image
      const fx = W - ox - ow;

      // Stamp the readable text from origCanvas onto the flipped output at the mirrored position
      outCtx.drawImage(origCanvas, ox, oy, ow, oh, fx, oy, ow, oh);
    }

    return outCanvas.toDataURL('image/jpeg', 0.95);
  } catch {
    // Graceful degradation — return the flipped image unchanged
    return flippedBase64;
  }
};

const AdminProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [product, setProduct] = useState<Product>(defaultProduct);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [dynamicDesigners, setDynamicDesigners] = useState<string[]>([]);
  const [newDesignerName, setNewDesignerName] = useState("");

  const handleAddDesigner = () => {
    if (!newDesignerName.trim()) return;
    const name = newDesignerName.trim();
    if (!dynamicDesigners.includes(name)) {
      const updated = [...dynamicDesigners, name].sort();
      setDynamicDesigners(updated);
      saveDesigners(updated);
    }
    toggleDesigner(name);
    setNewDesignerName("");
  };

  const toggleDesigner = (d: string) => {
    setProduct(prev => {
      const current = prev.designers || (prev.designer ? [prev.designer] : []);
      let next: string[];
      if (current.includes(d)) {
        next = current.filter(x => x !== d);
      } else {
        next = [...current, d];
      }
      return {
        ...prev,
        designers: next,
        designer: next.length > 0 ? next[0] : "",
      };
    });
  };
  
  // Cropping state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [cropAspect, setCropAspect] = useState<number>(3/4);
  const [isUploadingDetail, setIsUploadingDetail] = useState(false);

  // Track natural aspect ratios for Display Crop preview
  const [imageAspects, setImageAspects] = useState<Record<number, number>>({});
  const handleCropImageLoad = useCallback((imgIndex: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageAspects(prev => ({ ...prev, [imgIndex]: img.naturalWidth / img.naturalHeight }));
    }
  }, []);

  useEffect(() => {
    setDynamicCategories(getCategories());
    setDynamicDesigners(getDesigners());
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      const existing = getProducts().find(p => p.id === id);
      if (existing) {
        setProduct({
          ...existing,
          images: existing.images || (existing.image ? [existing.image] : []),
          designers: existing.designers || (existing.designer ? [existing.designer] : []),
        });
      }
    } else {
      setProduct({ ...defaultProduct, id: Date.now().toString(), images: [], designers: [defaultProduct.designer] });
    }
  }, [id, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: name === "price" || name === "oldPrice" ? Number(value) : value,
    }));
  };

  const handleImageFile = (file: File, isDetail: boolean = false) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const loadingToast = toast.loading("Standardizing image for catalog...");
      setIsUploadingDetail(isDetail);
      setCropAspect(isDetail ? 16/9 : 3/4);
      try {
        const standardized = await standardizeImage(base64, isDetail);
        const compressed = await compressImage(standardized);
        setImageToCrop(compressed);
        setIsCropping(true);
        toast.dismiss(loadingToast);
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Standardization failed, using original.");
        const compressed = await compressImage(base64);
        setImageToCrop(compressed);
        setIsCropping(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  };

  const handleApplyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    // Create the upload toast ID upfront so try/finally can always resolve it.
    // This avoids a Sonner race condition where toast.dismiss(id) called right
    // after batched React setState updates can be silently dropped.
    const uploadToastId = "upload-image-toast";

    try {
      let croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels, { horizontal: flipHorizontal, vertical: flipVertical });

      // If the image was flipped horizontally, try to restore any mirrored text/logos
      // so branding stays readable after the flip.
      if (flipHorizontal) {
        if ('TextDetector' in window) {
          const fixingToast = toast.loading("Correcting text orientation...");
          croppedImage = await correctTextAfterHorizontalFlip(croppedImage);
          // Update in-place: atomically replaces the loading toast
          toast.dismiss(fixingToast);
        } else {
          // Browser doesn't support TextDetector — warn the user
          toast.warning("Text/logos on the product may appear mirrored. For best results, use Chrome.", { duration: 5000 });
        }
      }

      const compressed = await compressImage(croppedImage);

      setIsCropping(false);
      setImageToCrop(null);
      setFlipHorizontal(false);
      setFlipVertical(false);

      // Show the loading toast with a fixed ID so we can reliably update it
      toast.loading("Uploading image to Cloudflare...", { id: uploadToastId });

      const r2Url = await uploadToR2(compressed);

      setProduct(prev => {
        if (isUploadingDetail) {
          return { ...prev, detailImage: r2Url };
        }
        const newImages = [...(prev.images || [])];
        newImages.push(r2Url);
        return {
          ...prev,
          image: prev.image || r2Url,
          images: newImages,
        };
      });

      // Update-in-place: atomically transitions loading → success (no separate dismiss needed)
      toast.success("Image uploaded successfully.", { id: uploadToastId });
    } catch (e) {
      console.error(e);
      // Update-in-place to error so the loading spinner never stays stuck
      toast.error("Failed to process image.", { id: uploadToastId });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type.startsWith('video/')) {
      handleVideoFile(file);
    } else {
      handleImageFile(file);
    }
  };

  const handleVideoFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      toast.error("Video is too large. Please keep it under 20MB for optimal performance.");
      return;
    }

    const videoToastId = "upload-video-toast";
    toast.loading("Uploading cinematic video to Cloudflare...", { id: videoToastId });
    uploadToR2(file).then((r2Url) => {
      setProduct(prev => ({ ...prev, video: r2Url }));
      toast.success("Video uploaded successfully.", { id: videoToastId });
    }).catch(() => {
      toast.error("Failed to upload video to Cloudflare.", { id: videoToastId });
    });
  };

  const handleToggleBackgroundRemoval = async () => {
    const newState = !product.removeBackground;
    
    if (newState) {
      // Toggle ON — use a single fixed ID for the whole multi-step flow so it
      // can always be updated in-place and can never be abandoned/stuck.
      const bgToastId = "bg-removal-toast";
      setIsProcessing(true);
      toast.loading("AI is removing background...", { id: bgToastId });
      
      try {
        const originalImage = product.originalImage || product.image;
        
        const blob = await removeBackground(originalImage);
        
        // Step 2: convert blob → base64 → compress → upload
        const base64data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const compressed = await compressImage(base64data);

        // Update the same toast in-place for the upload step
        toast.loading("Uploading transparent image to Cloudflare...", { id: bgToastId });

        const r2Url = await uploadToR2(compressed);
        setProduct(prev => ({
          ...prev,
          image: r2Url,
          originalImage: originalImage,
          removeBackground: true,
        }));

        toast.success("Background removed and uploaded.", { id: bgToastId });
      } catch (error) {
        console.error("Background removal failed:", error);
        toast.error("AI background removal failed. Try another image.", { id: bgToastId });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Toggle OFF
      if (product.originalImage) {
        setProduct(prev => ({
          ...prev,
          image: prev.originalImage || prev.image,
          removeBackground: false,
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

      <div className="space-y-8">
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

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Custom Description</label>
                  <textarea 
                    name="description"
                    className="w-full bg-transparent border border-border rounded-[16px] p-4 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30 min-h-[140px] resize-y"
                    value={product.description || ""}
                    onChange={(e) => setProduct(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter a unique product description... (Leave blank to use the default description)"
                  />
                </div>

                  {/* Reference Links Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Reference Links (Admin Only)</label>
                      <button 
                        type="button"
                        onClick={() => setProduct(prev => ({ ...prev, productLinks: [...(prev.productLinks || []), ""] }))}
                        className="text-[10px] uppercase tracking-widest text-primary hover:opacity-70 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Link
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(product.productLinks || [""]).map((link, idx) => (
                        <div key={idx} className="flex gap-2 group">
                          <input
                            type="url"
                            placeholder="https://..."
                            value={link}
                            onChange={(e) => {
                              const newLinks = [...(product.productLinks || [])];
                              newLinks[idx] = e.target.value;
                              setProduct(prev => ({ ...prev, productLinks: newLinks }));
                            }}
                            className="flex-1 bg-transparent border-b border-border py-2 text-xs outline-none focus:border-primary transition-colors"
                          />
                          {(product.productLinks?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newLinks = (product.productLinks || []).filter((_, i) => i !== idx);
                                setProduct(prev => ({ ...prev, productLinks: newLinks }));
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Category</label>
                  <select 
                    name="category"
                    className="w-full bg-transparent border-b border-border py-3 text-xs uppercase tracking-widest outline-none focus:border-primary transition-colors"
                    value={product.category}
                    onChange={handleChange}
                  >
                    {dynamicCategories.map(c => (
                      <option key={c} value={c} className="bg-background text-foreground">{c}</option>
                    ))}
                  </select>
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
                
                <div className="flex items-center justify-between p-5 border border-border rounded-xl bg-secondary/10">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-foreground">Purchase by Quantity</h4>
                    <p className="text-xs text-muted-foreground mt-1">Allow customers to buy more than one unit at a time.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProduct(prev => ({ ...prev, allowQuantity: prev.allowQuantity === false ? true : false }))}
                    className={`w-14 h-7 rounded-full transition-all relative ${product.allowQuantity !== false ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-border'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${product.allowQuantity !== false ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* Designer Selector - right column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 font-bold">Designer</label>
                  <div className="flex gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="New designer name..."
                      value={newDesignerName}
                      onChange={(e) => setNewDesignerName(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddDesigner(); } }}
                      className="flex-1 bg-transparent border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddDesigner}
                      className="bg-foreground text-background w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                    {dynamicDesigners.map(d => {
                      const isSelected = (product.designers || []).includes(d) || (!product.designers?.length && product.designer === d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDesigner(d)}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-colors text-sm flex items-center justify-between ${
                            isSelected ? 'bg-secondary text-foreground font-medium' : 'hover:bg-secondary/50 text-foreground'
                          }`}
                        >
                          {d}
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Product Gallery - full width below the 2-col grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Product Gallery</h3>
                <p className="text-[10px] text-muted-foreground italic">Drag to reorder sequence</p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-4">
                {(product.images || []).map((img, index) => (
                  <div key={index} className="group relative aspect-square rounded-[16px] overflow-hidden border border-border bg-secondary/20 transition-all hover:border-primary">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {product.image === img && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary text-white text-[7px] uppercase tracking-widest rounded-full">
                        Primary
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMainImage(index)}
                        className="p-1.5 bg-white text-black rounded-full hover:scale-110 transition-transform"
                        title="Set as Main"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveImage(index, 'up')}
                          className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors disabled:opacity-30"
                        >
                          <ArrowLeft className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-1.5 bg-destructive/80 text-white rounded-full hover:bg-destructive transition-colors"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === (product.images?.length || 0) - 1}
                          onClick={() => moveImage(index, 'down')}
                          className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors disabled:opacity-30"
                        >
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="aspect-square rounded-[16px] border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-all bg-secondary/5"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px] uppercase tracking-widest font-bold">Add</span>
                </button>
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
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                />

                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
                  Tip: You can also paste an image directly (Ctrl+V)
                </p>
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

            {/* Video & Motion Section */}
            <div className="bg-secondary/10 p-8 rounded-[32px] border border-border/40 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Cinematic Motion</h3>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Add video for an immersive luxury experience</p>
                  </div>
                </div>
                {product.video && (
                  <button 
                    type="button"
                    onClick={() => setProduct(prev => ({ ...prev, video: undefined }))}
                    className="text-[10px] uppercase tracking-widest text-destructive hover:opacity-70 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove Video
                  </button>
                )}
              </div>

              <div className="relative group aspect-video bg-black/5 rounded-[24px] border-2 border-dashed border-border/60 overflow-hidden transition-all hover:border-primary/40">
                {product.video ? (
                  <video 
                    src={product.video} 
                    className="w-full h-full object-cover" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                  />
                ) : (
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center shadow-sm border border-border group-hover:scale-110 transition-transform">
                      <Film className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Upload Video (MP4/WebM)</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ─── Display Crop (Focal Point) Section ─── */}
          {product.images && product.images.length > 0 && (() => {
            // Match the exact aspect ratio used on the product detail page
            const isShoe = product.category?.toLowerCase() === 'footwear';
            const previewAspectClass = isShoe ? 'aspect-[4/3]' : 'aspect-[4/5]';
            const containerAspect = isShoe ? 4 / 3 : 4 / 5;

            return (
            <section className="glass p-10 rounded-[32px] border border-white/20 shadow-sm space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Move className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Detail Page Display Crop</h3>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 ml-8">
                  Choose which part of each image is visible on the product detail page
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {product.images!.map((img, imgIndex) => {
                  const cropData = product.displayCrops?.[imgIndex] || { x: 50, y: 50, zoom: 1 };
                  const hasCrop = !!product.displayCrops?.[imgIndex];
                  const imgAspect = imageAspects[imgIndex];

                  // Compute precise positioning when we know the image's natural aspect ratio
                  const cropStyles = imgAspect
                    ? computeCropStyles(imgAspect, containerAspect, cropData)
                    : { width: '100%', height: '100%', objectFit: 'contain' as const };

                  return (
                    <div key={imgIndex} className="rounded-2xl border border-border bg-white p-4 space-y-4">
                      {/* Preview — matches product detail page aspect ratio */}
                      <div className={`relative ${previewAspectClass} rounded-xl overflow-hidden bg-[#f5f5f5] border border-border/50`}>
                        <img
                          src={img}
                          alt={`Image ${imgIndex + 1}`}
                          className="transition-all duration-200 ease-out"
                          onLoad={(e) => handleCropImageLoad(imgIndex, e)}
                          style={cropStyles}
                        />
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
                          {imgIndex + 1} / {product.images!.length}
                        </div>
                        {hasCrop && (
                          <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
                            Cropped
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="space-y-3">
                        {/* X Position */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Horizontal Position</label>
                            <span className="text-[10px] font-mono text-muted-foreground">{cropData.x}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={cropData.x}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setProduct(prev => ({
                                ...prev,
                                displayCrops: {
                                  ...(prev.displayCrops || {}),
                                  [imgIndex]: { ...cropData, x: val },
                                },
                              }));
                            }}
                            className="w-full accent-black h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer"
                          />
                        </div>

                        {/* Y Position */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Vertical Position</label>
                            <span className="text-[10px] font-mono text-muted-foreground">{cropData.y}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={cropData.y}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setProduct(prev => ({
                                ...prev,
                                displayCrops: {
                                  ...(prev.displayCrops || {}),
                                  [imgIndex]: { ...cropData, y: val },
                                },
                              }));
                            }}
                            className="w-full accent-black h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer"
                          />
                        </div>

                        {/* Zoom */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Zoom</label>
                            <span className="text-[10px] font-mono text-muted-foreground">{cropData.zoom.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={cropData.zoom}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setProduct(prev => ({
                                ...prev,
                                displayCrops: {
                                  ...(prev.displayCrops || {}),
                                  [imgIndex]: { ...cropData, zoom: val },
                                },
                              }));
                            }}
                            className="w-full accent-black h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer"
                          />
                        </div>

                        {/* Reset */}
                        {hasCrop && (
                          <button
                            type="button"
                            onClick={() => {
                              setProduct(prev => {
                                const newCrops = { ...(prev.displayCrops || {}) };
                                delete newCrops[imgIndex];
                                return { ...prev, displayCrops: Object.keys(newCrops).length > 0 ? newCrops : undefined };
                              });
                            }}
                            className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-semibold text-red-500 hover:text-red-700 transition-colors mt-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset to Default
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            );
          })()}

          {/* Footwear 16:9 Detail Image Section */}
          {product.category?.toLowerCase() === 'footwear' && (
            <section className="glass p-10 rounded-[32px] border border-white/20 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-medium">16:9 Detail Image</h3>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Upload a landscape picture specifically for the footwear product detail page</p>
              </div>
              <div 
                className="group relative aspect-video bg-secondary/30 rounded-[24px] border-2 border-dashed border-border flex flex-col items-center justify-center p-8 transition-all hover:border-primary/50 hover:bg-secondary/50 cursor-pointer overflow-hidden max-w-xl"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImageFile(file, true);
                }}
                onClick={() => document.getElementById('detail-image-upload')?.click()}
              >
                {product.detailImage ? (
                  <img src={product.detailImage} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto shadow-sm border border-border group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Drop 16:9 image here</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">or click to browse</p>
                    </div>
                  </div>
                )}
                
                {product.detailImage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setIsUploadingDetail(true); setCropAspect(16/9); setIsCropping(true); setImageToCrop(product.detailImage!); }}
                      className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                    >
                      <Crop className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setProduct(prev => ({ ...prev, detailImage: undefined })); }}
                      className="p-3 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="detail-image-upload"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file, true);
                }}
              />
            </section>
          )}

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
                aspect={cropAspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  mediaStyle: {
                    transform: `scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`
                  }
                }}
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

              <div className="flex items-center gap-4 border-l border-r border-border px-8">
                <button
                  onClick={() => setFlipHorizontal(!flipHorizontal)}
                  className={`p-3 rounded-xl transition-all ${flipHorizontal ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setFlipVertical(!flipVertical)}
                  className={`p-3 rounded-xl transition-all ${flipVertical ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-5 h-5" />
                </button>
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

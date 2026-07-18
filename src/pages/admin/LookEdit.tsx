import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getLooks, saveLook, Look, getProducts } from "@/lib/store";
import type { Product } from "@/data/products";
import { ArrowLeft, Save, Upload, X, Crop as CropIcon, Check } from "lucide-react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";

// --- Helper to crop image ---
const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

const AdminLookEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<Look>({
    id: "",
    name: "",
    modelImage: "",
    productIds: [],
  });

  // Cropper state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    setProducts(getProducts());

    if (!isNew) {
      const looks = getLooks();
      const look = looks.find((l) => l.id === id);
      if (look) {
        setFormData(look);
      } else {
        toast.error("Look not found");
        navigate("/admin/looks");
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        id: `look-${Date.now()}`,
      }));
    }
  }, [id, isNew, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!formData.modelImage) {
      toast.error("Please upload an image");
      return;
    }

    saveLook(formData);
    toast.success("Look saved successfully");
    navigate("/admin/looks");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async () => {
    if (!uploadedImage || !croppedAreaPixels) return;
    try {
      const croppedBase64 = await getCroppedImg(uploadedImage, croppedAreaPixels);
      if (croppedBase64) {
        setFormData({ ...formData, modelImage: croppedBase64 });
        setIsCropping(false);
        setUploadedImage(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to crop image");
    }
  };

  const toggleProduct = (productId: string) => {
    setFormData((prev) => {
      const productIds = prev.productIds.includes(productId)
        ? prev.productIds.filter((pId) => pId !== productId)
        : [...prev.productIds, productId];
      return { ...prev, productIds };
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/looks"
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl tracking-tight mb-2">
            {isNew ? "New Look" : "Edit Look"}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? "Add a new styled look." : "Update this look's details."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="glass p-6 rounded-xl space-y-4">
            <h2 className="text-lg font-medium">Look Details</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
                placeholder="e.g., Summer Minimalist"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-muted-foreground">Featured Products</label>
                <span className="text-xs text-muted-foreground">{formData.productIds.length} selected</span>
              </div>
              
              <div className="h-96 overflow-y-auto border border-border rounded-lg bg-secondary/20 p-2 space-y-1">
                {products.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">No products available in catalog.</p>
                ) : (
                  products.map((product) => {
                    const isSelected = formData.productIds.includes(product.id);
                    return (
                      <div 
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/50 border border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 bg-secondary rounded overflow-hidden flex-shrink-0">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isSelected ? 'font-medium' : ''}`}>{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.designer} - ${product.price}</p>
                        </div>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                        }`}>
                          {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-xl space-y-4">
            <h2 className="text-lg font-medium">Model Image</h2>
            
            {isCropping && uploadedImage ? (
              <div className="space-y-4">
                <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
                  <Cropper
                    image={uploadedImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={2 / 3}
                    onCropChange={setCrop}
                    onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                    onZoomChange={setZoom}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zoom</label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCropping(false);
                      setUploadedImage(null);
                    }}
                    className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCropComplete}
                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Check className="w-4 h-4" />
                    Apply Crop
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div 
                  className="aspect-[2/3] bg-secondary/50 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.modelImage ? (
                    <>
                      <img 
                        src={formData.modelImage} 
                        alt="Model" 
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                        <Upload className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">Click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </div>
                
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {formData.modelImage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData({ ...formData, modelImage: "" });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Remove Image
                  </button>
                )}
              </>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground px-6 py-4 rounded-full uppercase text-sm tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" />
            Save Look
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminLookEdit;

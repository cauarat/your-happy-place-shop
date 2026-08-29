import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProducts, saveProduct, saveProductsBulk, getCategories, getDesigners, saveDesigners } from "@/lib/store";
import type { Product, Category, Designer } from "@/data/products";
import { ArrowLeft, Save, Upload, Image as ImageIcon, Crop, X, Eraser, ArrowUp, ArrowDown, Trash2, CheckCircle2, ArrowRight, Plus, Film, FlipHorizontal, FlipVertical, User, Move, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";
import { compressImage } from "@/lib/compressImage";
import { uploadToR2 } from "@/utils/cloudflareUpload";
import { computeCropStyles } from "@/lib/cropUtils";
import { analyzeBackground } from "@/lib/imageStudio/analyze";
import type { StudioResult, Strategy } from "@/lib/imageStudio";
import CutoutPreview from "@/components/admin/CutoutPreview";
import { GalleryStrip } from "@/components/admin/productImages/GalleryStrip";
import { ImageWorkbench } from "@/components/admin/productImages/ImageWorkbench";
import { VideoWidget } from "@/components/admin/productImages/VideoWidget";
import { ApplyFramingDialog } from "@/components/admin/productImages/ApplyFramingDialog";
import { readCropClipboard, writeCropClipboard, applyCropToProducts, type CropClipboard } from "@/lib/cropClipboard";

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

/** Read the photo's background, and how sure we are that it is one colour.
 *  Shares the border-ring reading with the image studio rather than sampling
 *  four corner pixels, which a single JPEG artefact was enough to mislead. */
const readBackground = (img: HTMLImageElement) => {
  const canvas = document.createElement('canvas');
  const SW = Math.min(img.width, 240);
  const SH = Math.min(img.height, 240);
  canvas.width = SW;
  canvas.height = SH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, SW, SH);
  return analyzeBackground(ctx.getImageData(0, 0, SW, SH).data, SW, SH);
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

      // 1. Pad with the photo's own background colour so the border is invisible
      //    against it — except when that colour is already near-white, where it
      //    is snapped to the exact #FFFFFF the shop is built on. A #FAFAFA
      //    padding reads as a faint grey rectangle on the catalogue tile, which
      //    is the whole defect this is meant to avoid.
      const background = readBackground(img);
      ctx.fillStyle = !background
        ? '#ffffff'
        : background.alreadyWhite
          ? '#ffffff'
          : `rgb(${background.color.join(',')})`;
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
  /**
   * Where the cropper's output is headed.
   *
   * This replaces an `isUploadingDetail` boolean that no code path ever reset.
   * Crop the 16:9, then crop the main image, and the second result was written
   * over `detailImage` at a 16:9 aspect while the gallery got nothing — the
   * flag was still true from the first operation, and the modal's two dismiss
   * buttons cleared only `isCropping`. `null` means the cropper is closed, so
   * the target cannot outlive the session that set it.
   */
  const [cropTarget, setCropTarget] = useState<"gallery" | "detail" | null>(null);

  // The cut-out waiting for a yes or no. Nothing is written while this is set.
  const [studioResult, setStudioResult] = useState<StudioResult | null>(null);
  const [studioStage, setStudioStage] = useState("");

  // Track natural aspect ratios for Display Crop preview
  const [imageAspects, setImageAspects] = useState<Record<number, number>>({});
  /** Which gallery photo the workbench below is acting on. */
  const [selectedImage, setSelectedImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  /** Read once on mount; it outlives this page, so it cannot be derived state. */
  const [clipboard, setClipboard] = useState<CropClipboard | null>(() => readCropClipboard());
  const [applyingFraming, setApplyingFraming] = useState(false);
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

  /**
   * Open the cropper on one image, with every piece of its state set together.
   *
   * There were three call sites doing this by hand and each set a different
   * subset: the pan, the zoom and the last crop rectangle were left over from
   * whatever ran before, so reopening the cropper landed at 3x on someone
   * else's framing.
   */
  const openCropper = (src: string, target: "gallery" | "detail") => {
    setImageToCrop(src);
    setCropTarget(target);
    setCropAspect(target === "detail" ? 16 / 9 : 3 / 4);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setIsCropping(true);
  };

  const closeCropper = () => {
    setIsCropping(false);
    setImageToCrop(null);
    setCropTarget(null);
    setFlipHorizontal(false);
    setFlipVertical(false);
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
      const target = isDetail ? "detail" : "gallery";
      try {
        // No compressImage here: standardizeImage already emits a fixed
        // 1500x2000 JPEG at 0.95, which is under compressImage's 4096px
        // threshold, so it would only re-encode it at 0.82 — a second
        // generation loss on the picture the cut-out is later made from.
        const standardized = await standardizeImage(base64, isDetail);
        openCropper(standardized, target);
        toast.dismiss(loadingToast);
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Standardization failed, using original.");
        const compressed = await compressImage(base64);
        openCropper(compressed, target);
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

      // Read the target before closing: `closeCropper` clears it.
      const target = cropTarget;
      closeCropper();

      // Show the loading toast with a fixed ID so we can reliably update it
      toast.loading("Uploading image to Cloudflare...", { id: uploadToastId });

      const r2Url = await uploadToR2(compressed);

      setProduct(prev => {
        if (target === "detail") {
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

  /**
   * Cut the background out of the primary image.
   *
   * The work happens in `@/lib/imageStudio`; this only decides what to feed it
   * and what to do with the answer. Nothing is committed until the preview is
   * accepted — the old version wrote straight over the product, which is how a
   * failed cut-out could replace a perfectly good photo with no way back.
   */
  /** The photo the workbench is pointed at, and the shot it was cut from. */
  const currentImage = (product.images || [])[selectedImage] || product.image;
  const currentOriginal = currentImage
    ? product.originalImages?.[currentImage] ??
      (currentImage === product.image ? product.originalImage : undefined)
    : undefined;

  const runBackgroundRemoval = async (strategy: Strategy = "auto") => {
    // Always cut from the original when there is one: cutting a cut-out again
    // compounds the edge damage instead of improving on it.
    const source = currentOriginal || currentImage;
    if (!source) return;

    setIsProcessing(true);
    setStudioStage("Loading the model...");
    try {
      const { processImage } = await import("@/lib/imageStudio");
      const result = await processImage(source, {
        strategy,
        progress: (stage, current, total) => {
          const percent = total > 0 ? Math.round((current / total) * 100) : 0;
          setStudioStage(
            stage.startsWith("fetch")
              ? `Downloading the model — ${percent}%`
              : `Cutting out — ${percent}%`
          );
        },
      });
      setStudioResult(result);
    } catch (error) {
      console.error("Background removal failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Background removal failed. Try another image."
      );
    } finally {
      setIsProcessing(false);
      setStudioStage("");
    }
  };

  /** Commit an accepted cut-out: upload it, then point the product at it. */
  const acceptCutout = async () => {
    if (!studioResult) return;
    const target = currentImage;
    const source = currentOriginal || target;
    setIsProcessing(true);
    try {
      const url = await uploadToR2(studioResult.dataUrl, studioResult.extension);
      // A failed upload comes back as a data URL rather than throwing, so what
      // came back is the only way to tell the two apart. Reporting success
      // either way is what kept the broken upload service invisible.
      const keptLocally = url.startsWith("data:");
      setProduct(prev => {
        // The cut-out replaces the photo it was made from, wherever that sits
        // in the gallery — and the primary follows only if it was the primary.
        const images = (prev.images || []).map(img => (img === target ? url : img));
        const wasPrimary = prev.image === target;
        return {
          ...prev,
          images,
          image: wasPrimary ? url : prev.image,
          originalImages: { ...(prev.originalImages || {}), [url]: source },
          // Kept for the batch Studio page and for catalogues written before
          // `originalImages` existed.
          originalImage: wasPrimary ? source : prev.originalImage,
          removeBackground: wasPrimary ? true : prev.removeBackground,
        };
      });
      setStudioResult(null);
      if (keptLocally) {
        toast.warning(
          "Cut-out kept in this browser only — the upload service is unavailable, " +
            "so it will not reach the live shop and it counts against the 5MB limit.",
          { duration: 10000 }
        );
      } else {
        toast.success("Background removed.");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("The cut-out could not be uploaded.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleBackgroundRemoval = async () => {
    if (!product.removeBackground) {
      await runBackgroundRemoval();
      return;
    }

    // Turning it off. Without an original there is nothing to go back to, so
    // say that instead of flipping the flag and leaving the cut-out in place,
    // which is what it used to do.
    if (!product.originalImage) {
      toast.error("The original photo was not kept, so it cannot be restored.");
      return;
    }
    setProduct(prev => ({
      ...prev,
      image: prev.originalImage!,
      images: (prev.images || []).map(img => (img === prev.image ? prev.originalImage! : img)),
      removeBackground: false,
    }));
    toast.success("Original background restored.");
  };


  /**
   * Move the framing along with the photo it belongs to.
   *
   * `displayCrops` is keyed by position in `images`, so reordering or deleting
   * used to hand one photo's framing to whichever photo slid into its index —
   * a 3x zoom on a detail shot silently jumping onto the next product photo.
   * The keys are remapped here rather than migrated to URLs, because the
   * catalogue already carries hundreds of index-keyed entries.
   */
  const remapCrops = (
    crops: Product["displayCrops"],
    move: (oldIndex: number) => number | null,
  ): Product["displayCrops"] => {
    if (!crops) return crops;
    const next: NonNullable<Product["displayCrops"]> = {};
    for (const [key, value] of Object.entries(crops)) {
      const to = move(Number(key));
      if (to !== null) next[to] = value;
    }
    return Object.keys(next).length > 0 ? next : undefined;
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...(product.images || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newImages.length) return;

    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setProduct(prev => ({
      ...prev,
      images: newImages,
      displayCrops: remapCrops(prev.displayCrops, (i) =>
        i === index ? newIndex : i === newIndex ? index : i
      ),
    }));
    setSelectedImage(newIndex);
  };

  const removeImage = (index: number) => {
    const newImages = (product.images || []).filter((_, i) => i !== index);
    setProduct(prev => ({
      ...prev,
      images: newImages,
      image: prev.image === prev.images?.[index] ? (newImages[0] || "") : prev.image,
      displayCrops: remapCrops(prev.displayCrops, (i) =>
        i === index ? null : i > index ? i - 1 : i
      ),
    }));
    setSelectedImage((current) => Math.max(0, Math.min(current, newImages.length - 1)));
  };

  /** Put the photo this cut-out was made from back in its place. */
  const restoreOriginal = () => {
    if (!currentImage || !currentOriginal) return;
    setProduct(prev => {
      const images = (prev.images || []).map(img => (img === currentImage ? currentOriginal : img));
      const wasPrimary = prev.image === currentImage;
      const originals = { ...(prev.originalImages || {}) };
      delete originals[currentImage];
      return {
        ...prev,
        images,
        image: wasPrimary ? currentOriginal : prev.image,
        originalImages: Object.keys(originals).length > 0 ? originals : undefined,
        removeBackground: wasPrimary ? false : prev.removeBackground,
      };
    });
    toast.success("Original photo restored.");
  };

  const copyFraming = () => {
    const crop = product.displayCrops?.[selectedImage];
    if (!crop || !currentImage) return;
    const value: CropClipboard = {
      crop,
      index: selectedImage,
      sourceName: product.name || "this product",
      sourceImage: currentImage,
    };
    writeCropClipboard(value);
    setClipboard(value);
    toast.success("Framing copied.");
  };

  const pasteFraming = () => {
    if (!clipboard) return;
    setProduct(prev => ({
      ...prev,
      displayCrops: { ...(prev.displayCrops || {}), [selectedImage]: { ...clipboard.crop } },
    }));
    toast.success("Framing pasted.");
  };

  /**
   * Write one framing onto many products at once.
   *
   * This goes straight to storage rather than through the editor's own product
   * state: the products being changed are not the one open on screen, and
   * `saveProductsBulk` writes the catalogue once instead of re-serialising it
   * per product. A quota failure surfaces here rather than being swallowed.
   */
  const applyFramingToOthers = (ids: string[], everyImage: boolean) => {
    if (!clipboard) return;
    const chosen = getProducts().filter(p => ids.includes(p.id));
    const { updated, skipped } = applyCropToProducts(
      chosen, clipboard.crop, clipboard.index, everyImage
    );
    try {
      saveProductsBulk(updated);
    } catch (error) {
      console.error("Bulk framing failed:", error);
      toast.error(
        error instanceof Error ? error.message : "The framing could not be saved.",
        { duration: 10000 }
      );
      return;
    }
    setApplyingFraming(false);
    toast.success(
      skipped > 0
        ? `Framing applied to ${updated.length} products. ${skipped} skipped — no photo in that slot.`
        : `Framing applied to ${updated.length} products.`,
      { duration: 6000 }
    );
  };

  /** Point the 16:9 slot at this photo, or clear it if it already is. */
  const toggleDetailImage = () => {
    if (!currentImage) return;
    setProduct(prev => ({
      ...prev,
      detailImage: prev.detailImage === currentImage ? undefined : currentImage,
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
    try {
      saveProduct(product);
    } catch (error) {
      // Staying put is the point. This used to navigate away unconditionally,
      // so a save that failed on the storage quota discarded the edit and
      // returned to the list looking exactly like a save that had worked.
      console.error("Save failed:", error);
      toast.error(
        error instanceof Error ? error.message : "This product could not be saved.",
        { duration: 10000 }
      );
      return;
    }
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

          </section>

          {/* ─── Images ─── */}
          <section className="glass p-10 rounded-[32px] border border-white/20 shadow-sm space-y-8">
            <GalleryStrip
              images={product.images || []}
              primary={product.image}
              selected={selectedImage}
              video={product.video}
              onSelect={setSelectedImage}
              onSetPrimary={setMainImage}
              onMove={moveImage}
              onRemove={removeImage}
              onFilePicked={(file) => {
                if (file.type.startsWith("video/")) {
                  handleVideoFile(file);
                  setShowVideo(true);
                } else {
                  handleImageFile(file);
                }
              }}
              onVideoClick={() => setShowVideo((open) => !open)}
            />

            {showVideo && (
              <VideoWidget
                video={product.video}
                onFilePicked={handleVideoFile}
                onRemove={() => setProduct(prev => ({ ...prev, video: undefined }))}
                onClose={() => setShowVideo(false)}
              />
            )}

            {currentImage ? (
              <ImageWorkbench
                src={currentImage}
                index={selectedImage}
                isPrimary={product.image === currentImage}
                isDetail={product.detailImage === currentImage}
                category={product.category}
                crop={product.displayCrops?.[selectedImage]}
                imageAspect={imageAspects[selectedImage]}
                original={currentOriginal}
                isProcessing={isProcessing}
                stage={studioStage}
                onRemoveBackground={() => runBackgroundRemoval()}
                onRestoreOriginal={restoreOriginal}
                onRecrop={() => openCropper(currentImage, "gallery")}
                onCropChange={(next) =>
                  setProduct(prev => ({
                    ...prev,
                    displayCrops: { ...(prev.displayCrops || {}), [selectedImage]: next },
                  }))
                }
                onCropReset={() =>
                  setProduct(prev => {
                    const crops = { ...(prev.displayCrops || {}) };
                    delete crops[selectedImage];
                    return {
                      ...prev,
                      displayCrops: Object.keys(crops).length > 0 ? crops : undefined,
                    };
                  })
                }
                onMeasured={(aspect) =>
                  setImageAspects(prev =>
                    prev[selectedImage] === aspect ? prev : { ...prev, [selectedImage]: aspect }
                  )
                }
                onToggleDetail={toggleDetailImage}
                hasCopied={clipboard !== null}
                onCopyFraming={copyFraming}
                onPasteFraming={pasteFraming}
                onApplyFramingToOthers={() => setApplyingFraming(true)}
              />
            ) : (
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground py-12">
                Add a photo to start
              </p>
            )}
          </section>

      </div>

      {applyingFraming && clipboard && (
        <ApplyFramingDialog
          clipboard={clipboard}
          products={getProducts()}
          currentId={product.id}
          onApply={applyFramingToOthers}
          onClose={() => setApplyingFraming(false)}
        />
      )}

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
                onClick={closeCropper}
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
                  onClick={closeCropper}
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

      {studioResult && (
        <CutoutPreview
          before={product.originalImage || product.image}
          result={studioResult}
          busy={isProcessing}
          onAccept={acceptCutout}
          onCancel={() => setStudioResult(null)}
          onRetry={(strategy) => {
            setStudioResult(null);
            runBackgroundRemoval(strategy);
          }}
        />
      )}
    </div>
  );
};

export default AdminProductEdit;

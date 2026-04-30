export async function compressImage(base64: string, maxWidth = 4096, quality = 1.0): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Only downscale if it exceeds 4K width to prevent browser memory issues
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return resolve(base64);

      // Use high-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // If the image is transparent (from background removal), we must use PNG
      const isTransparent = base64.includes('image/png') || base64.startsWith('data:image/png');
      
      // For PNG we use 1.0 (lossless in most browsers), for JPEG we use 0.95 for near-lossless
      resolve(canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', isTransparent ? 1.0 : 0.98));
    };
  });
}

export async function compressImage(base64: string, maxWidth = 4096, quality = 1.0): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    // Safety valve: if the image fails to load, resolve with the original so
    // callers (and their loading toasts) are never left hanging forever.
    img.onerror = () => resolve(base64);
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
      
      // Anything that can carry an alpha channel keeps its format. Re-encoding
      // a cut-out as JPEG flattens the transparency onto black, which is how a
      // background-removed product would arrive back with a dark box around it.
      // WebP is on this list as well as PNG: the studio writes WebP, and
      // matching on PNG alone silently destroyed it.
      const mime = base64.slice(5, base64.indexOf(';'));
      const keepsAlpha = mime === 'image/png' || mime === 'image/webp';

      // Compress JPEGs at 0.82 quality for optimal file size and fast uploads
      resolve(
        keepsAlpha
          ? canvas.toDataURL(mime, 0.92)
          : canvas.toDataURL('image/jpeg', 0.82)
      );
    };
  });
}

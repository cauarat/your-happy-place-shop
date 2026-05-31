import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Extract credentials from environment variables
const accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;

// Initialize the S3 Client for Cloudflare R2
const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

export const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type: mime});
};

/**
 * Uploads a file or base64 string directly to your Cloudflare R2 bucket.
 */
export const uploadToR2 = async (fileOrBase64: File | string, customExtension?: string): Promise<string> => {
  let file: File;
  
  if (typeof fileOrBase64 === 'string') {
    // Determine extension from mime type
    const mimeMatch = fileOrBase64.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = customExtension || (mime.split('/')[1] || 'jpg');
    file = base64ToFile(fileOrBase64, `upload.${ext}`);
  } else {
    file = fileOrBase64;
  }

  const fileExtension = file.name.split('.').pop() || 'jpg';
  const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  
  try {
    // Convert File to Uint8Array to bypass the AWS SDK v3 stream reader bug in Vite
    const arrayBuffer = await file.arrayBuffer();
    const bodyData = new Uint8Array(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: bodyData,
      ContentType: file.type,
    });

    await S3.send(command);

    const publicDomain = import.meta.env.VITE_R2_PUBLIC_DOMAIN;
    
    if (!publicDomain) {
      console.warn("VITE_R2_PUBLIC_DOMAIN is not set in .env. Returning the file name as a fallback.");
      // It's better to return the full Dev domain if they haven't set a custom one
      // But we will return the file name with a placeholder to avoid breaking the image src
      return `https://[YOUR_R2_DEV_URL_HERE].r2.dev/${uniqueFileName}`;
    }

    const cleanDomain = publicDomain.endsWith('/') ? publicDomain.slice(0, -1) : publicDomain;
    return `${cleanDomain}/${uniqueFileName}`;
    
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw error;
  }
};

import { upload } from "@vercel/blob/client";

/**
 * Upload a single image file to Vercel Blob.
 *
 * Returns the public URL of the uploaded file. Throws on failure.
 *
 * Images are capped at 8 MB by the server-side validator. Client-side we
 * also do a fast sanity check to fail early.
 */
export async function uploadImage(file: File): Promise<string> {
  // Client-side sanity check before hitting the network.
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`);
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error(`${file.name} is larger than 8 MB.`);
  }

  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });

  return blob.url;
}

/**
 * Upload many files, returning their public URLs in order. Fails fast on
 * the first error (the caller should surface which file failed).
 */
export async function uploadImages(
  files: File[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadImage(file));
  }
  return urls;
}
/**
 * Image Utilities for Dish & Menu Management
 * Handles Google Drive sharing links, Google image search links, Dropbox,
 * and client-side device image compression into fast, lightweight Data URLs.
 */

export const DEFAULT_DISH_IMAGE = 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80';

/**
 * Normalizes user-supplied image URLs, converting Google Drive sharing links,
 * Google Images search links, and Dropbox links into direct, embeddable image URLs.
 */
export function normalizeImageUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();

  // If already a Data URL or empty
  if (!trimmed || trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  try {
    // 1. Google Drive File Links
    // Examples:
    // https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing
    // https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
    // https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
    const driveRegex = /drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+)|uc\?(?:export=view&)?id=([a-zA-Z0-9_-]+)|thumbnail\?id=([a-zA-Z0-9_-]+))/i;
    const driveMatch = trimmed.match(driveRegex);
    if (driveMatch) {
      const fileId = driveMatch[1] || driveMatch[2] || driveMatch[3] || driveMatch[4];
      if (fileId) {
        // lh3.googleusercontent.com/d/{id} is Google's direct public CDN image endpoint
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }

    // 2. Google Search / Google Images Redirect Links
    // Examples: https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fphoto.jpg...
    if (trimmed.includes('google.') && (trimmed.includes('/imgres') || trimmed.includes('/url'))) {
      const urlObj = new URL(trimmed);
      const imgurlParam = urlObj.searchParams.get('imgurl') || urlObj.searchParams.get('q');
      if (imgurlParam && (imgurlParam.startsWith('http://') || imgurlParam.startsWith('https://'))) {
        return normalizeImageUrl(decodeURIComponent(imgurlParam));
      }
    }

    // 3. Dropbox Direct Link Conversion
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('dl=0', 'raw=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }

    // 4. Standard clean URL
    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Compresses an image file selected from the user's device into an optimized Base64 JPEG data URL.
 * Keeps file size small (~40KB - 90KB) for instant Firestore document writes and zero lag.
 */
export function compressImageFile(
  file: File,
  maxDimension: number = 800,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original data URL if canvas context unavailable
          resolve(reader.result as string);
          return;
        }

        // Draw image smoothed
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

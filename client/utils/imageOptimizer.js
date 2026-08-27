/**
 * Client-Side Smart Image Optimizer for Web
 * 
 * Automatically compresses large camera/gallery photos (3MB-10MB) into lightweight,
 * crystal-clear WebP/JPEG format (~30KB-80KB) ideal for e-commerce website loading speeds.
 */

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Optimizes an image file for web viewing
 * @param {File|Blob} file - The original image file
 * @param {Object} options - Custom sizing and quality options
 * @returns {Promise<{ optimizedFile: File, originalSize: number, optimizedSize: number, savedPercent: number, originalFormatted: string, optimizedFormatted: string, dimensions: {width: number, height: number} }>}
 */
export async function optimizeImageForWeb(file, options = {}) {
  const {
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.82,
    preferredFormat = 'image/webp'
  } = options;

  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Provided file is not a valid image.');
  }

  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data.'));
      img.onload = () => {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        // Calculate proportional dimensions
        let targetWidth = origWidth;
        let targetHeight = origHeight;

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        // Draw onto high-quality canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: true });

        if (!ctx) {
          // If canvas context fails, return original file
          return resolve({
            optimizedFile: file,
            originalSize,
            optimizedSize: originalSize,
            savedPercent: 0,
            originalFormatted: formatBytes(originalSize),
            optimizedFormatted: formatBytes(originalSize),
            dimensions: { width: origWidth, height: origHeight }
          });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // White background for transparent formats if saving to jpeg
        if (preferredFormat === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Check if WebP is supported
        let exportFormat = preferredFormat;
        const testData = canvas.toDataURL('image/webp');
        if (!testData.startsWith('data:image/webp')) {
          exportFormat = 'image/jpeg';
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({
                optimizedFile: file,
                originalSize,
                optimizedSize: originalSize,
                savedPercent: 0,
                originalFormatted: formatBytes(originalSize),
                optimizedFormatted: formatBytes(originalSize),
                dimensions: { width: origWidth, height: origHeight }
              });
            }

            // Create a clean web file name
            const origBase = (file.name || 'product_img').replace(/\.[^/.]+$/, '');
            const ext = exportFormat === 'image/webp' ? '.webp' : '.jpg';
            const optimizedFileName = `${origBase}_opt${ext}`;

            const optimizedFile = new File([blob], optimizedFileName, {
              type: exportFormat,
              lastModified: Date.now()
            });

            const optimizedSize = optimizedFile.size;
            const savedPercent = originalSize > 0 
              ? Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100))
              : 0;

            resolve({
              optimizedFile,
              originalSize,
              optimizedSize,
              savedPercent,
              originalFormatted: formatBytes(originalSize),
              optimizedFormatted: formatBytes(optimizedSize),
              dimensions: { width: targetWidth, height: targetHeight }
            });
          },
          exportFormat,
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

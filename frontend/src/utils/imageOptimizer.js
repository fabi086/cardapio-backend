/**
 * Image Optimization Utility
 * Compresses and resizes images before upload for optimal performance
 */

// Recommended sizes for different image types
export const IMAGE_CONFIGS = {
    product: {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        maxSizeKB: 200,
        label: "Produto",
        recommendation: "800x600px, máx 200KB"
    },
    logo: {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
        maxSizeKB: 100,
        label: "Logo",
        recommendation: "400x400px, máx 100KB"
    },
    banner: {
        maxWidth: 1200,
        maxHeight: 400,
        quality: 0.85,
        maxSizeKB: 300,
        label: "Banner",
        recommendation: "1200x400px, máx 300KB"
    },
    cover: {
        maxWidth: 1920,
        maxHeight: 600,
        quality: 0.85,
        maxSizeKB: 400,
        label: "Capa",
        recommendation: "1920x600px, máx 400KB"
    },
    favicon: {
        maxWidth: 192,
        maxHeight: 192,
        quality: 0.9,
        maxSizeKB: 50,
        label: "Favicon",
        recommendation: "192x192px, máx 50KB"
    },
    category: {
        maxWidth: 400,
        maxHeight: 300,
        quality: 0.8,
        maxSizeKB: 100,
        label: "Categoria",
        recommendation: "400x300px, máx 100KB"
    }
};

/**
 * Optimize an image file
 * @param {File} file - The original image file
 * @param {string} type - The image type (product, logo, banner, etc.)
 * @returns {Promise<{file: Blob, dataUrl: string, originalSize: number, optimizedSize: number}>}
 */
export const optimizeImage = (file, type = 'product') => {
    return new Promise((resolve, reject) => {
        const config = IMAGE_CONFIGS[type] || IMAGE_CONFIGS.product;

        // Create image element to load the file
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            let { width, height } = img;
            const aspectRatio = width / height;

            if (width > config.maxWidth) {
                width = config.maxWidth;
                height = Math.round(width / aspectRatio);
            }

            if (height > config.maxHeight) {
                height = config.maxHeight;
                width = Math.round(height * aspectRatio);
            }

            // Set canvas size
            canvas.width = width;
            canvas.height = height;

            // Draw image with smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with compression
            const tryCompress = (quality) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }

                        const sizeKB = blob.size / 1024;

                        // If still too large and quality can be reduced, try again
                        if (sizeKB > config.maxSizeKB && quality > 0.3) {
                            tryCompress(quality - 0.1);
                            return;
                        }

                        // Create data URL for preview
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve({
                                file: blob,
                                dataUrl: reader.result,
                                originalSize: file.size,
                                optimizedSize: blob.size,
                                width,
                                height
                            });
                        };
                        reader.readAsDataURL(blob);
                    },
                    'image/jpeg',
                    quality
                );
            };

            // Start compression with configured quality
            tryCompress(config.quality);
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        // Load image from file
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
};

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get compression ratio
 * @param {number} original - Original size in bytes
 * @param {number} optimized - Optimized size in bytes
 * @returns {string} - Percentage saved
 */
export const getCompressionRatio = (original, optimized) => {
    const saved = ((original - optimized) / original) * 100;
    return `${saved.toFixed(0)}%`;
};

export default optimizeImage;

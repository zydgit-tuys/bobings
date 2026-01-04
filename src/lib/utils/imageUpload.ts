/**
 * Image Upload Utility with Auto WebP Conversion & Compression
 * 
 * Features:
 * - Auto convert to WebP format
 * - Compress images (quality: 80%)
 * - Resize if too large (max: 1920px)
 * - Generate unique filename
 */

interface ImageUploadOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-1, default 0.8
    bucket?: string;
    folder?: string;
}

const DEFAULT_OPTIONS: ImageUploadOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    bucket: 'product-images',
    folder: 'products',
};

/**
 * Convert image to WebP and compress
 */
/**
 * Convert image to WebP and compress
 */
async function convertToWebP(
    file: File,
    options: ImageUploadOptions = {}
): Promise<{ blob: Blob; width: number; height: number }> {
    const { maxWidth, maxHeight, quality } = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;

            if (width > maxWidth! || height > maxHeight!) {
                const ratio = Math.min(maxWidth! / width, maxHeight! / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve({ blob, width, height });
                    } else {
                        reject(new Error('Failed to convert image'));
                    }
                },
                'image/webp',
                quality
            );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        reader.onerror = () => reject(new Error('Failed to read file'));

        reader.readAsDataURL(file);
    });
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitized = originalName
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[^a-z0-9]/gi, '-') // Replace special chars
        .toLowerCase()
        .substring(0, 30); // Limit length

    return `${sanitized}-${timestamp}-${random}.webp`;
}

export interface UploadedImageResult {
    publicUrl: string;
    storagePath: string;
    width: number;
    height: number;
    fileSize: number;
    filename: string;
}

/**
 * Upload image to Supabase Storage with auto WebP conversion
 * 
 * @param file - Image file to upload
 * @param options - Upload options
 * @returns Uploaded image metadata
 */
export async function uploadImage(
    file: File,
    options: ImageUploadOptions = {}
): Promise<UploadedImageResult> {
    const { bucket, folder } = { ...DEFAULT_OPTIONS, ...options };

    // Validate file type
    if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
    }

    // Convert to WebP
    const { blob: webpBlob, width, height } = await convertToWebP(file, options);

    // Generate filename
    const filename = generateFilename(file.name);
    const filepath = folder ? `${folder}/${filename}` : filename;

    // Upload to Supabase Storage
    const { supabase } = await import('@/integrations/supabase/client');

    const { data, error } = await supabase.storage
        .from(bucket!)
        .upload(filepath, webpBlob, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket!)
        .getPublicUrl(filepath);

    return {
        publicUrl,
        storagePath: filepath,
        width,
        height,
        fileSize: webpBlob.size,
        filename
    };
}

/**
 * Upload multiple images
 */
export async function uploadImages(
    files: File[],
    options: ImageUploadOptions = {}
): Promise<UploadedImageResult[]> {
    const uploadPromises = files.map((file) => uploadImage(file, options));
    return Promise.all(uploadPromises);
}

/**
 * Delete image from storage
 */
export async function deleteImage(
    url: string,
    bucket: string = DEFAULT_OPTIONS.bucket!
): Promise<void> {
    // Extract filepath from URL
    const urlParts = url.split('/');
    const filepath = urlParts.slice(urlParts.indexOf(bucket) + 1).join('/');

    const { supabase } = await import('@/integrations/supabase/client');

    const { error } = await supabase.storage
        .from(bucket)
        .remove([filepath]);

    if (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
}

/**
 * Get file size info (for display)
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate image file
 */
export function validateImageFile(file: File, maxSizeMB: number = 10): string | null {
    if (!file.type.startsWith('image/')) {
        return 'File must be an image';
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getProductImages,
    createProductImage,
    updateProductImage,
    deleteProductImage,
    reorderProductImages,
    setPrimaryImage
} from '@/lib/api/product-images';
import { toast } from 'sonner';
import type { TablesUpdate } from '@/types';

export function useProductImages(productId?: string) {
    return useQuery({
        queryKey: ['product-images', productId],
        queryFn: () => getProductImages(productId!),
        enabled: !!productId,
    });
}

export function useCreateProductImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProductImage,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['product-images', variables.product_id] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['products', variables.product_id] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to save image: ${error.message}`);
        },
    });
}

export function useUpdateProductImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: TablesUpdate<'product_images'> }) =>
            updateProductImage(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-images'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to update image: ${error.message}`);
        },
    });
}

export function useDeleteProductImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProductImage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-images'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Image deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete image: ${error.message}`);
        },
    });
}

export function useReorderProductImages() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ productId, imageIds }: { productId: string; imageIds: string[] }) =>
            reorderProductImages(productId, imageIds),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['product-images', variables.productId] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to reorder images: ${error.message}`);
        },
    });
}

export function useSetPrimaryImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
            setPrimaryImage(productId, imageId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['product-images', variables.productId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Primary image updated');
        },
        onError: (error: Error) => {
            toast.error(`Failed to set primary image: ${error.message}`);
        },
    });
}

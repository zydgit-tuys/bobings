import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getVariants, createVariant, updateVariant,
  getBrands, createBrand,
  getCategories, createCategory,
  getVariantAttributes, createVariantAttribute, updateVariantAttribute, deleteVariantAttribute,
  getAttributeValues, createAttributeValue, updateAttributeValue, deleteAttributeValue
} from '@/lib/api/products';
import type { Product, ProductVariant } from '@/types';
import { toast } from 'sonner';

// Products
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });
}

// Variants
export function useVariants(productId?: string) {
  return useQuery({
    queryKey: ['variants', productId],
    queryFn: () => getVariants(productId),
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Variant created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create variant: ${error.message}`);
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductVariant> }) =>
      updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Variant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update variant: ${error.message}`);
    },
  });
}

// Brands
export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create brand: ${error.message}`);
    },
  });
}

// Categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

// Variant Attributes
export function useVariantAttributes() {
  return useQuery({
    queryKey: ['variant-attributes'],
    queryFn: getVariantAttributes,
  });
}

export function useCreateVariantAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVariantAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-attributes'] });
      toast.success('Attribute created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create attribute: ${error.message}`);
    },
  });
}

export function useUpdateVariantAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateVariantAttribute(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-attributes'] });
      toast.success('Attribute updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update attribute: ${error.message}`);
    },
  });
}

export function useDeleteVariantAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVariantAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-attributes'] });
      toast.success('Attribute deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete attribute: ${error.message}`);
    },
  });
}

// Attribute Values
export function useAttributeValues(attributeId?: string) {
  return useQuery({
    queryKey: ['attribute-values', attributeId],
    queryFn: () => getAttributeValues(attributeId),
  });
}

export function useCreateAttributeValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAttributeValue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attribute-values'] });
      queryClient.invalidateQueries({ queryKey: ['variant-attributes'] });
      toast.success('Value created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create value: ${error.message}`);
    },
  });
}

export function useUpdateAttributeValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { value?: string; sort_order?: number } }) =>
      updateAttributeValue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attribute-values'] });
      queryClient.invalidateQueries({ queryKey: ['variant-attributes'] });
      toast.success('Value updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update value: ${error.message}`);
    },
  });
}

export function useDeleteAttributeValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAttributeValue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attribute-values'] });
      queryClient.invalidateQueries({ queryKey: ['variant-attributes'] });
      toast.success('Value deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete value: ${error.message}`);
    },
  });
}

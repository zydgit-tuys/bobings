import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, restoreProduct,
  getVariants, createVariant, updateVariant,
  getBrands, createBrand, updateBrand,
  getCategories, createCategory, updateCategory,
  getProductSuppliers, addProductSupplier, updateProductSupplier, deleteProductSupplier,
  getVariantAttributes, createVariantAttribute, updateVariantAttribute, deleteVariantAttribute,
  getAttributeValues, createAttributeValue, updateAttributeValue, deleteAttributeValue
} from '@/lib/api/products';
import type { Product, ProductVariant } from '@/types';
import { toast } from 'sonner';

// Products
export function useProducts(showArchived = false) {
  return useQuery({
    queryKey: ['products', showArchived],
    queryFn: () => getProducts(showArchived),
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
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Re-invalidate specifically
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

export function useRestoreProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product restored successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore product: ${error.message}`);
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

export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; is_active?: boolean } }) =>
      updateBrand(id, data), // This import needs to be added to the file imports too
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update brand: ${error.message}`);
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

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parent_id?: string | null; level?: number; is_active?: boolean } }) =>
      updateCategory(id, data), // This import needs to be added
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

// Product Suppliers
export function useProductSuppliers(productId: string) {
  return useQuery({
    queryKey: ['product-suppliers', productId],
    queryFn: () => getProductSuppliers(productId),
    enabled: !!productId,
  });
}

export function useAddProductSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addProductSupplier,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers', variables.product_id] });
      toast.success('Supplier linked successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to link supplier: ${error.message}`);
    },
  });
}

export function useUpdateProductSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { purchase_price?: number; is_preferred?: boolean } }) =>
      updateProductSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      toast.success('Product supplier updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update product supplier: ${error.message}`);
    },
  });
}

export function useDeleteProductSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers'] });
      toast.success('Supplier removed from product');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove supplier: ${error.message}`);
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

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useBrands,
  useCategories,
} from "@/hooks/use-products";
import { ProductVariants } from "./ProductVariants";
import { ProductImageUpload } from "@/components/products/ProductImageUpload";

const productSchema = z.object({
  sku_master: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0, "Price must be positive"),
  brand_id: z.string().optional(),
  category_id: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "new";

  const { data: product, isLoading } = useProduct(isEdit ? id : "");
  const { data: brands } = useBrands();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [virtualStock, setVirtualStock] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku_master: "",
      name: "",
      description: "",
      base_price: 0,
      brand_id: "",
      category_id: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        sku_master: product.sku_master,
        name: product.name,
        description: product.description ?? "",
        base_price: product.base_price,
        brand_id: product.brand_id ?? "",
        category_id: product.category_id ?? "",
      });
      setVirtualStock(product.virtual_stock ?? false);
      setImages(product.images ?? []);
    }
  }, [product, form]);

  const onSubmit = (data: ProductFormData) => {
    if (isEdit) {
      updateProduct.mutate(
        { id, data: { ...data, brand_id: data.brand_id || null, category_id: data.category_id || null, virtual_stock: virtualStock, images } },
        { onSuccess: () => navigate("/products") }
      );
    } else {
      createProduct.mutate({
        sku_master: data.sku_master,
        name: data.name,
        description: data.description,
        base_price: data.base_price,
        brand_id: data.brand_id || null,
        category_id: data.category_id || null,
        is_active: true,
        virtual_stock: false,
        sort_order: 0,
      }, { onSuccess: () => navigate("/products") });
    }
  };

  if (isEdit && isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-3 md:space-y-6">
      <PageHeader
        title={isEdit ? "Edit Product" : "New Product"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/products")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit(onSubmit)}
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="sku_master"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU Master</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., PROD-001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter product name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Product description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="base_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (Rp)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands?.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEdit && (
                  <div className="flex items-center space-x-3 pt-2">
                    <Switch
                      id="virtual-stock"
                      checked={virtualStock}
                      onCheckedChange={setVirtualStock}
                    />
                    <Label htmlFor="virtual-stock" className="cursor-pointer">
                      Enable Virtual Stock
                    </Label>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {isEdit && (
          <div className="space-y-3 md:space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductImageUpload
                  productId={id}
                  images={images}
                  onImagesChange={setImages}
                />
              </CardContent>
            </Card>
            <ProductVariants productId={id} />
          </div>
        )}
      </div>
    </div>
  );
}

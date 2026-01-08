import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomSwitch } from "@/components/ui/custom-switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useUnits } from "@/hooks/use-units";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductVariants from "./ProductVariants";
import { ProductSuppliers } from "./ProductSuppliers";
import { ProductImageUpload } from "@/components/products/ProductImageUpload";
import { useProductImages } from "@/hooks/use-product-images";
import { ProductImage, createProductImage } from "@/lib/api/product-images";
import { toast } from "sonner";

const productSchema = z.object({
  sku_master: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0, "Price must be positive"),
  base_hpp: z.coerce.number().min(0, "HPP must be positive").default(0),
  product_type: z.enum(['production', 'purchased', 'service']).default('purchased'),
  weight: z.coerce.number().min(0).optional(),
  dimensions: z.string().optional(),
  barcode: z.string().optional(),
  unit_id: z.string().optional(),
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
  const { data: units } = useUnits();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [virtualStock, setVirtualStock] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const { data: productImages } = useProductImages(isEdit ? id : undefined);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku_master: "",
      name: "",
      description: "",
      base_price: 0,
      base_hpp: 0,
      product_type: 'purchased',
      weight: 0,
      dimensions: "",
      barcode: "",
      unit_id: "",
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
        base_hpp: product.base_hpp ?? 0,
        product_type: product.product_type ?? 'purchased',
        weight: product.weight || 0,
        dimensions: product.dimensions ?? "",
        barcode: product.barcode ?? "",
        unit_id: product.unit_id ?? "",
        brand_id: product.brand_id ?? "",
        category_id: product.category_id ?? "",
      });
      setVirtualStock(product.virtual_stock ?? false);
    }
  }, [product, form]);

  useEffect(() => {
    if (productImages) {
      setImages(productImages);
    }
  }, [productImages]);

  const onSubmit = async (data: ProductFormData) => {
    if (isEdit) {
      updateProduct.mutate(
        {
          id,
          data: {
            ...data,
            product_type: data.product_type,
            brand_id: data.brand_id || null,
            category_id: data.category_id || null,
            unit_id: data.unit_id || null,
            barcode: data.barcode || null,
            weight: data.weight || null,
            dimensions: data.dimensions || null,
            virtual_stock: virtualStock,
          }
        },
        { onSuccess: () => navigate("/products") }
      );
    } else {
      try {
        const newProduct = await createProduct.mutateAsync({
          sku_master: data.sku_master,
          name: data.name,
          description: data.description,
          base_price: data.base_price,
          base_hpp: data.base_hpp || 0,
          product_type: data.product_type,
          weight: data.weight || null,
          dimensions: data.dimensions || null,
          barcode: data.barcode || null,
          unit_id: data.unit_id || null,
          brand_id: data.brand_id || null,
          category_id: data.category_id || null,
          is_active: true,
          virtual_stock: false,
          sort_order: 0,
        });

        // Handle Images
        if (images.length > 0) {
          await Promise.all(images.map(img => createProductImage({
            product_id: newProduct.id,
            image_url: img.image_url,
            storage_path: img.storage_path,
            display_order: img.display_order,
            is_primary: img.is_primary,
            alt_text: img.alt_text,
            file_size: img.file_size,
            width: img.width,
            height: img.height
          })));
        }

        navigate("/products");
      } catch (error: any) {
        toast.error(`Failed to create product: ${error.message}`);
      }
    }
  };

  // Guard against accidental navigation/refresh (Browser Level)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  // Manual Back Handler (Safe for BrowserRouter)
  const handleBack = () => {
    if (form.formState.isDirty) {
      if (window.confirm("Perubahan belum disimpan. Yakin ingin keluar?")) {
        navigate("/products");
      }
    } else {
      navigate("/products");
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
          <div className="flex gap-2 items-center">
            {form.formState.isDirty && (
              <span className="text-xs text-orange-600 font-medium mr-2 animate-pulse">
                Unsaved Changes
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleBack}>
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

      <div className="grid gap-3 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column: Images + Product Details (1/3 width) */}
        <div className="space-y-3 md:space-y-6 lg:col-span-1">
          {/* Images Section - Top */}
          <Card>
            <CardHeader className="pb-2 py-3">
              <CardTitle className="text-sm">Product Images</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <ProductImageUpload
                productId={id || "new"}
                images={images}
                onImagesChange={setImages}
              />
            </CardContent>
          </Card>

          {/* Product Details - Bottom */}
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="base_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={0} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="base_hpp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-orange-600">Ref. HPP (Deprecated)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min={0}
                              readOnly
                              className="border-orange-200 bg-muted/50 cursor-not-allowed"
                            />
                          </FormControl>
                          <FormMessage />
                          <FormDescription className="text-[10px]">
                            Deprecated: HPP dihitung dari ledger/transaksi. Field ini hanya referensi historis.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="product_type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Jenis Produk</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="purchased" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Barang Beli Jadi (Trading)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="production" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Produksi Sendiri (Manufacturing)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="service" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Jasa (Non-Stok)
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Tentukan jenis produk untuk keperluan akuntansi
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (g)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={0} placeholder="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="LxWxH cm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter barcode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units?.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.name} ({unit.symbol})
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
                    <div className="flex items-center gap-2 pt-3 pb-1">
                      <CustomSwitch
                        id="virtual-stock"
                        checked={virtualStock}
                        onCheckedChange={setVirtualStock}
                      />
                      <Label
                        htmlFor="virtual-stock"
                        className="cursor-pointer text-sm font-normal"
                      >
                        Enable Virtual Stock
                      </Label>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Variants / Suppliers (2/3 width - Full Height) */}
        {isEdit && (
          <div className="lg:row-span-2 lg:col-span-2">
            <Tabs defaultValue="variants" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="variants">Variants</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
              </TabsList>
              <TabsContent value="variants">
                <ProductVariants productId={id!} />
              </TabsContent>
              <TabsContent value="suppliers">
                <ProductSuppliers productId={id!} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

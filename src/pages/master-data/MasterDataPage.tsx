import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { Package, Tag, FolderTree, Palette } from "lucide-react";
import ProductList from "@/pages/products/ProductList";
import { BrandList } from "./BrandList";
import { CategoryList } from "./CategoryList";
import { VariantAttributeList } from "./VariantAttributeList";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MasterDataPage() {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Master Data"
        description="Manage products, brands, categories, and variant attributes"
      />

      <Tabs defaultValue="products" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-4' : 'grid-cols-4 max-w-lg'}`}>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className={isMobile ? "sr-only sm:not-sr-only" : ""}>Products</span>
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className={isMobile ? "sr-only sm:not-sr-only" : ""}>Brands</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            <span className={isMobile ? "sr-only sm:not-sr-only" : ""}>Categories</span>
          </TabsTrigger>
          <TabsTrigger value="attributes" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className={isMobile ? "sr-only sm:not-sr-only" : ""}>Attributes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 md:mt-6">
          <ProductList embedded />
        </TabsContent>

        <TabsContent value="brands" className="mt-4 md:mt-6">
          <BrandList />
        </TabsContent>

        <TabsContent value="categories" className="mt-4 md:mt-6">
          <CategoryList />
        </TabsContent>

        <TabsContent value="attributes" className="mt-4 md:mt-6">
          <VariantAttributeList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

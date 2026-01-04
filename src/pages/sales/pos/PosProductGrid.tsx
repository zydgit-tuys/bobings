import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Product, ProductVariant } from "@/types";
import { PosProductCard } from "./PosProductCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PosVariantSelector } from "./PosVariantSelector";

interface PosProductGridProps {
    products: (Product & {
        product_variants: ProductVariant[];
        product_images: { image_url: string }[];
    })[];
    onAddToCart: (variant: ProductVariant) => void;
}

export function PosProductGrid({ products, onAddToCart }: PosProductGridProps) {
    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<(Product & { product_variants: ProductVariant[] }) | null>(null);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.sku_master.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });
    }, [products, search]);

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Search & Filter Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk (Nama / SKU)..."
                        className="pl-9 bg-background"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-20">
                    {filteredProducts.map(product => (
                        <PosProductCard
                            key={product.id}
                            product={product}
                            onClick={setSelectedProduct}
                        />
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full py-20 text-center text-muted-foreground">
                            Produk tidak ditemukan.
                        </div>
                    )}
                </div>
            </ScrollArea>

            <PosVariantSelector
                open={!!selectedProduct}
                onOpenChange={(open) => !open && setSelectedProduct(null)}
                product={selectedProduct}
                onAddToCart={(variant) => onAddToCart(variant)} // Pass through
            />
        </div>
    );
}

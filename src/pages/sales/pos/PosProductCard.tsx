import { Product, ProductVariant } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface PosProductCardProps {
    product: Product & {
        product_variants: ProductVariant[];
        product_images: { image_url: string }[];
    };
    onClick: (product: any) => void;
}

export function PosProductCard({ product, onClick }: PosProductCardProps) {
    const variants = product.product_variants || [];
    const totalStock = variants.reduce((sum, v) => sum + (v.stock_qty || 0), 0);
    const hasStock = totalStock > 0;

    // Price range logic
    const prices = variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceDisplay = prices.length > 0
        ? (minPrice === maxPrice
            ? `Rp ${minPrice.toLocaleString("id-ID")}`
            : `Rp ${minPrice.toLocaleString("id-ID")} - ${maxPrice.toLocaleString("id-ID")}`)
        : "No Price";

    // Get primary image or first image logic
    const imageUrl = product.product_images?.[0]?.image_url || product.images?.[0];

    return (
        <Card
            className={`cursor-pointer transition-all hover:shadow-md active:scale-95 ${!hasStock ? "opacity-60 bg-muted" : "hover:border-primary"
                }`}
            onClick={() => onClick(product)}
        >
            <CardContent className="p-3">
                {/* Image Placeholder */}
                <div className="aspect-square rounded-md bg-muted/50 w-full mb-3 flex items-center justify-center text-muted-foreground relative">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-md"
                        />
                    ) : (
                        <Package className="h-8 w-8 opacity-20" />
                    )}
                    {variants.length > 1 && (
                        <Badge variant="secondary" className="absolute bottom-1 right-1 text-[10px] h-5 px-1.5 opacity-90">
                            {variants.length} Varian
                        </Badge>
                    )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2 h-10">
                        {product.name}
                    </h3>

                    <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate max-w-[65%]">
                            {priceDisplay}
                        </span>

                        <Badge variant={totalStock > 10 ? "secondary" : totalStock > 0 ? "outline" : "destructive"} className="text-[10px] h-5 px-1.5">
                            {totalStock}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

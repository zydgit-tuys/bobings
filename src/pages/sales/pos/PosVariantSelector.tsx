import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Product, ProductVariant } from "@/types";
import { Badge } from "@/components/ui/badge";

interface PosVariantSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: (Product & { product_variants: ProductVariant[] }) | null;
    onAddToCart: (variant: ProductVariant, qty: number) => void;
}

export function PosVariantSelector({
    open,
    onOpenChange,
    product,
    onAddToCart
}: PosVariantSelectorProps) {
    if (!product) return null;

    // Direct add handler
    const handleAdd = (variant: ProductVariant) => {
        onAddToCart(variant, 1);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>{product.name}</DialogTitle>
                    <DialogDescription>
                        Pilih varian untuk ditambahkan ke keranjang
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-y-auto flex-1 pr-2 -mr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
                        {product.product_variants.map((variant) => {
                            const isOutOfStock = (variant.stock_qty || 0) <= 0;
                            return (
                                <div
                                    key={variant.id}
                                    className={`
                                        flex flex-col p-3 border rounded-lg transition-all
                                        ${isOutOfStock ? "bg-muted opacity-70" : "hover:border-primary cursor-pointer active:bg-accent"}
                                    `}
                                    onClick={() => !isOutOfStock && handleAdd(variant)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium">
                                            {variant.sku_variant}
                                        </div>
                                        <Badge variant={isOutOfStock ? "destructive" : "outline"}>
                                            Stock: {variant.stock_qty || 0}
                                        </Badge>
                                    </div>

                                    <div className="mt-auto flex justify-between items-center">
                                        <div className="text-sm text-muted-foreground">
                                            {/* Display attributes like Color/Size if available in future */}
                                        </div>
                                        <div className="font-bold text-lg">
                                            Rp {variant.price.toLocaleString("id-ID")}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}

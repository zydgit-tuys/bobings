import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useVariantAttributes } from "@/hooks/use-products";
import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkVariantCreatorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    skuMaster: string;
    basePrice: number;
    baseHpp: number;
    onCreateVariants: (variants: Array<{
        sku_variant: string;
        size_value_id: string | null;
        color_value_id: string | null;
        price: number;
        hpp: number;
        stock_qty: number;
        min_stock_alert: number;
    }>) => void;
}

export function BulkVariantCreator({
    open,
    onOpenChange,
    skuMaster,
    basePrice,
    baseHpp,
    onCreateVariants,
}: BulkVariantCreatorProps) {
    const { data: attributes } = useVariantAttributes();
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [defaultStock, setDefaultStock] = useState(0);
    const [defaultMinStock, setDefaultMinStock] = useState(5);

    // Find Size and Color attributes
    const sizeAttr = attributes?.find((a: any) => a.name.toLowerCase() === 'size');
    const colorAttr = attributes?.find((a: any) => a.name.toLowerCase() === 'color');

    // Generate SKU variant
    const generateSKU = (colorValue?: string, sizeValue?: string) => {
        const parts = [skuMaster];

        if (colorValue) {
            // Replace spaces with hyphens and uppercase
            const colorPart = colorValue.toUpperCase().replace(/\s+/g, '-');
            parts.push(colorPart);
        }

        if (sizeValue) {
            parts.push(sizeValue.toUpperCase());
        }

        return parts.join('-');
    };

    // Calculate total variants
    const totalVariants =
        (selectedSizes.length || 1) * (selectedColors.length || 1);

    // Generate preview
    const generatePreview = () => {
        const variants = [];

        if (selectedSizes.length === 0 && selectedColors.length === 0) {
            return [];
        }

        if (selectedSizes.length > 0 && selectedColors.length > 0) {
            // Both size and color selected
            for (const colorId of selectedColors) {
                const colorValue = colorAttr?.attribute_values?.find((v: any) => v.id === colorId);
                for (const sizeId of selectedSizes) {
                    const sizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === sizeId);
                    variants.push({
                        sku: generateSKU(colorValue?.value, sizeValue?.value),
                        size: sizeValue?.value,
                        color: colorValue?.value,
                    });
                }
            }
        } else if (selectedSizes.length > 0) {
            // Only size selected
            for (const sizeId of selectedSizes) {
                const sizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === sizeId);
                variants.push({
                    sku: generateSKU(undefined, sizeValue?.value),
                    size: sizeValue?.value,
                    color: '-',
                });
            }
        } else if (selectedColors.length > 0) {
            // Only color selected
            for (const colorId of selectedColors) {
                const colorValue = colorAttr?.attribute_values?.find((v: any) => v.id === colorId);
                variants.push({
                    sku: generateSKU(colorValue?.value),
                    size: '-',
                    color: colorValue?.value,
                });
            }
        }

        return variants;
    };

    const handleCreate = () => {
        const variants = [];

        if (selectedSizes.length > 0 && selectedColors.length > 0) {
            for (const colorId of selectedColors) {
                const colorValue = colorAttr?.attribute_values?.find((v: any) => v.id === colorId);
                for (const sizeId of selectedSizes) {
                    const sizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === sizeId);
                    variants.push({
                        sku_variant: generateSKU(colorValue?.value, sizeValue?.value),
                        size_value_id: sizeId,
                        color_value_id: colorId,
                        price: basePrice,
                        hpp: baseHpp,
                        stock_qty: defaultStock,
                        min_stock_alert: defaultMinStock,
                    });
                }
            }
        } else if (selectedSizes.length > 0) {
            for (const sizeId of selectedSizes) {
                const sizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === sizeId);
                variants.push({
                    sku_variant: generateSKU(undefined, sizeValue?.value),
                    size_value_id: sizeId,
                    color_value_id: null,
                    price: basePrice,
                    hpp: baseHpp,
                    stock_qty: defaultStock,
                    min_stock_alert: defaultMinStock,
                });
            }
        } else if (selectedColors.length > 0) {
            for (const colorId of selectedColors) {
                const colorValue = colorAttr?.attribute_values?.find((v: any) => v.id === colorId);
                variants.push({
                    sku_variant: generateSKU(colorValue?.value),
                    size_value_id: null,
                    color_value_id: colorId,
                    price: basePrice,
                    hpp: baseHpp,
                    stock_qty: defaultStock,
                    min_stock_alert: defaultMinStock,
                });
            }
        }

        onCreateVariants(variants);
        onOpenChange(false);

        // Reset
        setSelectedSizes([]);
        setSelectedColors([]);
        setDefaultStock(0);
        setDefaultMinStock(5);
    };

    const preview = generatePreview();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Bulk Variant Creator
                    </DialogTitle>
                    <DialogDescription>
                        Select sizes and colors to generate multiple variants at once
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Size Selection */}
                    {sizeAttr && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Select Sizes</Label>
                            <div className="flex flex-wrap gap-2">
                                {sizeAttr.attribute_values?.map((val: any) => (
                                    <div key={val.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`size-${val.id}`}
                                            checked={selectedSizes.includes(val.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedSizes([...selectedSizes, val.id]);
                                                } else {
                                                    setSelectedSizes(selectedSizes.filter(id => id !== val.id));
                                                }
                                            }}
                                        />
                                        <Label
                                            htmlFor={`size-${val.id}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {val.value}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Color Selection */}
                    {colorAttr && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Select Colors</Label>
                            <div className="flex flex-wrap gap-2">
                                {colorAttr.attribute_values?.map((val: any) => (
                                    <div key={val.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`color-${val.id}`}
                                            checked={selectedColors.includes(val.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedColors([...selectedColors, val.id]);
                                                } else {
                                                    setSelectedColors(selectedColors.filter(id => id !== val.id));
                                                }
                                            }}
                                        />
                                        <Label
                                            htmlFor={`color-${val.id}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {val.value}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Default Values */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="default-stock" className="text-sm">Default Stock</Label>
                            <Input
                                id="default-stock"
                                type="number"
                                min={0}
                                value={defaultStock}
                                onChange={(e) => setDefaultStock(parseInt(e.target.value) || 0)}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="default-min-stock" className="text-sm">Min Stock Alert</Label>
                            <Input
                                id="default-min-stock"
                                type="number"
                                min={0}
                                value={defaultMinStock}
                                onChange={(e) => setDefaultMinStock(parseInt(e.target.value) || 0)}
                                className="h-9"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    {preview.length > 0 && (
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Preview</Label>
                                <Badge variant="secondary">{totalVariants} variants</Badge>
                            </div>
                            <ScrollArea className="h-40 rounded-md border p-3">
                                <div className="space-y-2">
                                    {preview.map((variant, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm py-1">
                                            <span className="font-mono text-xs">{variant.sku}</span>
                                            <div className="flex gap-2">
                                                <Badge variant="outline" className="text-xs">{variant.size}</Badge>
                                                <Badge variant="outline" className="text-xs">{variant.color}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={totalVariants === 0}
                    >
                        Create {totalVariants} Variant{totalVariants !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

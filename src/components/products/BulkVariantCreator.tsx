import React, { useState, useEffect } from "react";
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
import { useVariantAttributes, useCreateAttributeValue } from "@/hooks/use-products";
import { Loader2, Sparkles, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface BulkVariantCreatorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    skuMaster: string;
    basePrice: number;

    onCreateVariants: (variants: Array<{
        sku_variant: string;
        size_value_id: string | null;
        color_value_id: string | null;
        price: number;
        harga_jual_umum: number;
        harga_khusus: number;

        stock_qty: number;
        min_stock_alert: number;
    }>) => void;
}

export function BulkVariantCreator({
    open,
    onOpenChange,
    skuMaster,
    basePrice,
    onCreateVariants,
}: BulkVariantCreatorProps) {
    const { data: attributes } = useVariantAttributes();
    const createAttributeValue = useCreateAttributeValue();
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [defaultPrice, setDefaultPrice] = useState(basePrice);

    const [defaultHargaJualUmum, setDefaultHargaJualUmum] = useState(basePrice);
    const [defaultHargaKhusus, setDefaultHargaKhusus] = useState(basePrice);
    const [defaultStock, setDefaultStock] = useState(0);
    const [defaultMinStock, setDefaultMinStock] = useState(5);

    // Quick add states
    const [showSizeAdd, setShowSizeAdd] = useState(false);
    const [showColorAdd, setShowColorAdd] = useState(false);
    const [newSizeValue, setNewSizeValue] = useState("");
    const [newColorValue, setNewColorValue] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Update when basePrice changes
    useEffect(() => {
        setDefaultPrice(basePrice);
        setDefaultHargaJualUmum(basePrice);
        setDefaultHargaKhusus(basePrice);
    }, [basePrice]);

    // Find Size and Color attributes
    const sizeAttr = attributes?.find((a: any) => a.name.toLowerCase() === 'size');
    const colorAttr = attributes?.find((a: any) => a.name.toLowerCase() === 'color');

    // Sort colors alphabetically
    const sortedColors = React.useMemo(() => {
        if (!colorAttr?.attribute_values) return [];
        return [...colorAttr.attribute_values].sort((a, b) =>
            a.value.localeCompare(b.value, 'id', { sensitivity: 'base' })
        );
    }, [colorAttr]);

    // Quick add handlers
    const handleAddSize = async () => {
        if (!newSizeValue.trim() || !sizeAttr) return;

        setIsAdding(true);
        try {
            await createAttributeValue.mutateAsync({
                attribute_id: sizeAttr.id,
                value: newSizeValue.trim(),
                sort_order: (sizeAttr.attribute_values?.length || 0) + 1,
            });
            toast.success(`Size "${newSizeValue}" added`);
            setNewSizeValue("");
            setShowSizeAdd(false);
        } catch (error: any) {
            toast.error(`Failed to add size: ${error.message}`);
        } finally {
            setIsAdding(false);
        }
    };

    const handleAddColor = async () => {
        if (!newColorValue.trim() || !colorAttr) return;

        setIsAdding(true);
        try {
            await createAttributeValue.mutateAsync({
                attribute_id: colorAttr.id,
                value: newColorValue.trim(),
                sort_order: (colorAttr.attribute_values?.length || 0) + 1,
            });
            toast.success(`Color "${newColorValue}" added`);
            setNewColorValue("");
            setShowColorAdd(false);
        } catch (error: any) {
            toast.error(`Failed to add color: ${error.message}`);
        } finally {
            setIsAdding(false);
        }
    };

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
        // Validation


        if (selectedSizes.length === 0 && selectedColors.length === 0) {
            toast.error("Please select at least one size or color");
            return;
        }

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
                        price: defaultPrice,
                        harga_jual_umum: defaultHargaJualUmum,
                        harga_khusus: defaultHargaKhusus,
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
                    price: defaultPrice,
                    harga_jual_umum: defaultHargaJualUmum,
                    harga_khusus: defaultHargaKhusus,
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
                    price: defaultPrice,
                    harga_jual_umum: defaultHargaJualUmum,
                    harga_khusus: defaultHargaKhusus,
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
        // Note: Prices reset via useEffect when basePrice changes or stay as is? 
        // Better to reset them to basePrice to be safe if basePrice didn't change
        setDefaultPrice(basePrice);
        setDefaultHargaJualUmum(basePrice);
        setDefaultHargaKhusus(basePrice);
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
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Select Sizes</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => setShowSizeAdd(!showSizeAdd)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add New
                                </Button>
                            </div>

                            {showSizeAdd && (
                                <div className="flex gap-2 p-2 bg-muted/50 rounded-md">
                                    <Input
                                        placeholder="e.g., XXL"
                                        value={newSizeValue}
                                        onChange={(e) => setNewSizeValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSize()}
                                        className="h-8 text-sm"
                                        disabled={isAdding}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8"
                                        onClick={handleAddSize}
                                        disabled={!newSizeValue.trim() || isAdding}
                                    >
                                        {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                                    </Button>
                                </div>
                            )}

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
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Select Colors</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => setShowColorAdd(!showColorAdd)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add New
                                </Button>
                            </div>

                            {showColorAdd && (
                                <div className="flex gap-2 p-2 bg-muted/50 rounded-md">
                                    <Input
                                        placeholder="e.g., Navy Blue"
                                        value={newColorValue}
                                        onChange={(e) => setNewColorValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddColor()}
                                        className="h-8 text-sm"
                                        disabled={isAdding}
                                    />
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8"
                                        onClick={handleAddColor}
                                        disabled={!newColorValue.trim() || isAdding}
                                    >
                                        {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                                    </Button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {sortedColors.map((val: any) => (
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
                            <Label htmlFor="default-price" className="text-sm">Harga Base (Rp)</Label>
                            <Input
                                id="default-price"
                                type="number"
                                min={0}
                                value={defaultPrice}
                                onChange={(e) => setDefaultPrice(parseInt(e.target.value) || 0)}
                                className="h-9"
                            />
                        </div>
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
                            <Label htmlFor="default-harga-umum" className="text-sm">Harga Umum (Rp)</Label>
                            <Input
                                id="default-harga-umum"
                                type="number"
                                min={0}
                                value={defaultHargaJualUmum}
                                onChange={(e) => setDefaultHargaJualUmum(parseInt(e.target.value) || 0)}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="default-harga-khusus" className="text-sm">Harga Khusus (Rp)</Label>
                            <Input
                                id="default-harga-khusus"
                                type="number"
                                min={0}
                                value={defaultHargaKhusus}
                                onChange={(e) => setDefaultHargaKhusus(parseInt(e.target.value) || 0)}
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

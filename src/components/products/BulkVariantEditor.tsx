import React, { useState } from "react";
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
import { Loader2, Edit, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkVariantEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedVariantIds: string[];
    onUpdateVariants: (ids: string[], updates: any) => Promise<void>;
}

export function BulkVariantEditor({
    open,
    onOpenChange,
    selectedVariantIds,
    onUpdateVariants,
}: BulkVariantEditorProps) {
    const [price, setPrice] = useState<number>(0);
    const [hargaUmum, setHargaUmum] = useState<number>(0);
    const [hargaKhusus, setHargaKhusus] = useState<number>(0);
    const [minStock, setMinStock] = useState<number>(5);

    const [enablePrice, setEnablePrice] = useState(false);
    const [enableHargaUmum, setEnableHargaUmum] = useState(false);
    const [enableHargaKhusus, setEnableHargaKhusus] = useState(false);
    const [enableMinStock, setEnableMinStock] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async () => {
        setIsSubmitting(true);
        try {
            const updates: any = {};
            if (enablePrice) updates.price = price;
            if (enableHargaUmum) updates.harga_jual_umum = hargaUmum;
            if (enableHargaKhusus) updates.harga_khusus = hargaKhusus;
            if (enableMinStock) updates.min_stock_alert = minStock;

            if (Object.keys(updates).length > 0) {
                await onUpdateVariants(selectedVariantIds, updates);
                onOpenChange(false);
                // Reset form
                setEnablePrice(false);
                setEnableHargaUmum(false);
                setEnableHargaKhusus(false);
                setEnableMinStock(false);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasChanges = enablePrice || enableHargaUmum || enableHargaKhusus || enableMinStock;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5 text-primary" />
                        Bulk Edit Variants
                    </DialogTitle>
                    <DialogDescription>
                        Updating {selectedVariantIds.length} selected variant(s).
                        Tick the checkbox to update that field.
                    </DialogDescription>
                </DialogHeader>

                <Alert className="bg-muted border-none">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        Physical Stock changes must be done via Stock Opname or Adjustment.
                    </AlertDescription>
                </Alert>

                <div className="space-y-4 py-2">
                    {/* Base Price */}
                    <div className="flex items-end gap-3">
                        <Checkbox
                            checked={enablePrice}
                            onCheckedChange={(c) => setEnablePrice(c as boolean)}
                            className="mb-3"
                        />
                        <div className="flex-1 space-y-2">
                            <Label className={!enablePrice ? "text-muted-foreground" : ""}>Base Price (Rp)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={price}
                                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                                disabled={!enablePrice}
                            />
                        </div>
                    </div>

                    {/* Harga Umum */}
                    <div className="flex items-end gap-3">
                        <Checkbox
                            checked={enableHargaUmum}
                            onCheckedChange={(c) => setEnableHargaUmum(c as boolean)}
                            className="mb-3"
                        />
                        <div className="flex-1 space-y-2">
                            <Label className={!enableHargaUmum ? "text-muted-foreground" : ""}>Harga Umum (Rp)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={hargaUmum}
                                onChange={(e) => setHargaUmum(parseInt(e.target.value) || 0)}
                                disabled={!enableHargaUmum}
                            />
                        </div>
                    </div>

                    {/* Harga Khusus */}
                    <div className="flex items-end gap-3">
                        <Checkbox
                            checked={enableHargaKhusus}
                            onCheckedChange={(c) => setEnableHargaKhusus(c as boolean)}
                            className="mb-3"
                        />
                        <div className="flex-1 space-y-2">
                            <Label className={!enableHargaKhusus ? "text-muted-foreground" : ""}>Harga Khusus (Rp)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={hargaKhusus}
                                onChange={(e) => setHargaKhusus(parseInt(e.target.value) || 0)}
                                disabled={!enableHargaKhusus}
                            />
                        </div>
                    </div>

                    {/* Min Stock */}
                    <div className="flex items-end gap-3">
                        <Checkbox
                            checked={enableMinStock}
                            onCheckedChange={(c) => setEnableMinStock(c as boolean)}
                            className="mb-3"
                        />
                        <div className="flex-1 space-y-2">
                            <Label className={!enableMinStock ? "text-muted-foreground" : ""}>Min Stock Alert</Label>
                            <Input
                                type="number"
                                min={0}
                                value={minStock}
                                onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                                disabled={!enableMinStock}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={!hasChanges || isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Update {selectedVariantIds.length} Item(s)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

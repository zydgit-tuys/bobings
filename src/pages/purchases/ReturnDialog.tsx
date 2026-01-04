import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useCreatePurchaseReturn } from "@/hooks/use-purchase-returns";

interface ReturnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: any;
}

export function ReturnDialog({ open, onOpenChange, purchase }: ReturnDialogProps) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [reason, setReason] = useState("");

    const createReturn = useCreatePurchaseReturn();

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setQuantities({});
            setNotes({});
            setReason("");
        }
    }, [open]);

    const handleReturn = async () => {
        // Filter lines with qty > 0
        const linesToReturn = Object.entries(quantities)
            .filter(([_, qty]) => qty > 0)
            .map(([lineId, qty]) => ({
                purchaseLineId: lineId,
                qty,
                notes: notes[lineId] || "",
            }));

        if (linesToReturn.length === 0) return;

        createReturn.mutate({
            purchaseId: purchase.id,
            reason,
            lines: linesToReturn,
        }, {
            onSuccess: () => {
                onOpenChange(false);
            }
        });
    };

    const hasItems = Object.values(quantities).some(q => q > 0);

    if (!purchase) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Retur Barang - {purchase.purchase_no}</DialogTitle>
                    <DialogDescription>
                        Pilih barang yang ingin diretur dari stok yang sudah diterima.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>Alasan Retur / No. Dokumen</Label>
                        <Input
                            placeholder="Contoh: Barang rusak saat pengiriman / Reject Quality Control"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4 max-h-[50vh] overflow-y-auto border rounded-lg p-2">
                        {purchase.purchase_order_lines?.map((line: any) => {
                            // Can only return what has been received
                            const maxReturn = line.qty_received;
                            if (maxReturn <= 0) return null; // Logic skip if nothing received yet

                            return (
                                <div
                                    key={line.id}
                                    className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium">{line.product_variants?.sku_variant}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Received: {line.qty_received} | Ordered: {line.qty_ordered}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <Label className="text-xs mb-1">Qty Retur</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={maxReturn}
                                                    value={quantities[line.id] ?? 0}
                                                    onChange={(e) =>
                                                        setQuantities((prev) => ({
                                                            ...prev,
                                                            [line.id]: Math.min(parseInt(e.target.value) || 0, maxReturn),
                                                        }))
                                                    }
                                                    className="w-24 text-right"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes per line */}
                                    <div className="w-full">
                                        <Label className="text-xs text-muted-foreground">Catatan / Kondisi Barang</Label>
                                        <Input
                                            placeholder="Detail kerusakan..."
                                            className="h-8 text-sm"
                                            value={notes[line.id] ?? ""}
                                            onChange={(e) => setNotes(prev => ({ ...prev, [line.id]: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Batal
                    </Button>
                    <Button
                        onClick={handleReturn}
                        disabled={createReturn.isPending || !hasItems || !reason}
                        variant="destructive"
                    >
                        {createReturn.isPending ? "Memproses..." : "Konfirmasi Retur"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

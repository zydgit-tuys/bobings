import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useReceivePurchaseLines } from "@/hooks/use-purchases";
import { triggerAutoJournalPurchase } from "@/lib/api/purchases";
import { toast } from "sonner";

interface ReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: any;
}

export function ReceiveDialog({ open, onOpenChange, purchase }: ReceiveDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const receivePurchase = useReceivePurchaseLines();

  useEffect(() => {
    if (purchase?.purchase_order_lines) {
      const initial: Record<string, number> = {};
      purchase.purchase_order_lines.forEach((line: any) => {
        initial[line.id] = line.qty_ordered - line.qty_received;
      });
      setQuantities(initial);
    }
  }, [purchase]);

  const handleReceive = async () => {
    try {
      // Calculate Cumulative Quantity (Previous + New Receipt)
      const finalQuantities: Record<string, number> = {};

      Object.entries(quantities).forEach(([lineId, qtyNow]) => {
        const line = purchase.purchase_order_lines.find((l: any) => l.id === lineId);
        if (line) {
          finalQuantities[lineId] = (line.qty_received || 0) + qtyNow;
        }
      });

      // Step 1: Receive goods (updates inventory)
      await receivePurchase.mutateAsync(
        { purchaseId: purchase.id, receivedQtys: finalQuantities }
      );

      // Calculate Journal Amount for THIS receipt only
      let receiptJournalAmount = 0;
      Object.entries(quantities).forEach(([lineId, qtyNow]) => {
        const line = purchase.purchase_order_lines.find((l: any) => l.id === lineId);
        if (line && qtyNow > 0) {
          receiptJournalAmount += qtyNow * (line.unit_cost || 0);
        }
      });

      // Step 2: Create journal entry for liability (INCREMENTAL)
      if (receiptJournalAmount > 0) {
        try {
          await triggerAutoJournalPurchase(
            purchase.id,
            'receive', // Create Hutang Supplier
            undefined, // No payment type for receive
            receiptJournalAmount, // Uses Calculated Amount
            undefined  // No bank account
          );
          toast.success(`Barang diterima & Jurnal Hutang dibuat - Rp ${receiptJournalAmount.toLocaleString()}`);
        } catch (journalError: any) {
          // Goods receipt succeeded but journal failed - warn user
          toast.warning(
            `Barang berhasil diterima, tapi jurnal otomatis gagal: ${journalError.message}. Silakan buat jurnal manual.`,
            { duration: 6000 }
          );
        }
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Gagal menerima barang: ${error.message}`);
    }
  };

  if (!purchase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive Goods - {purchase.purchase_no}</DialogTitle>
          <DialogDescription>
            Masukkan jumlah barang yang diterima untuk memperbarui stok inventaris.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {purchase.purchase_order_lines?.map((line: any) => {
            const remaining = line.qty_ordered - line.qty_received;
            return (
              <div
                key={line.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{line.product_variants?.sku_variant}</p>
                  <p className="text-sm text-muted-foreground">
                    Ordered: {line.qty_ordered} | Received: {line.qty_received} | Remaining: {remaining}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Receive:</Label>
                  <Input
                    type="number"
                    min={0}
                    max={remaining}
                    value={quantities[line.id] ?? 0}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [line.id]: Math.min(parseInt(e.target.value) || 0, remaining),
                      }))
                    }
                    className="w-24"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReceive} disabled={receivePurchase.isPending}>
            {receivePurchase.isPending ? "Processing..." : "Confirm Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

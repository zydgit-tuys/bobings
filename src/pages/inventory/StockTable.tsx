import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/DataTable";
import { useVariants } from "@/hooks/use-products";
import { useAdjustStock } from "@/hooks/use-inventory";

export function StockTable() {
  const { data: variants, isLoading } = useVariants();
  const adjustStock = useAdjustStock();

  const [adjustDialog, setAdjustDialog] = useState<{
    open: boolean;
    variantId: string;
    sku: string;
    currentStock: number;
  }>({ open: false, variantId: "", sku: "", currentStock: 0 });

  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState("");

  const handleAdjust = () => {
    adjustStock.mutate(
      {
        variantId: adjustDialog.variantId,
        qty: adjustQty,
        notes: adjustNotes,
      },
      {
        onSuccess: () => {
          setAdjustDialog({ open: false, variantId: "", sku: "", currentStock: 0 });
          setAdjustQty(0);
          setAdjustNotes("");
        },
      }
    );
  };

  const columns = [
    { key: "sku_variant", header: "SKU Variant" },
    { key: "stock_qty", header: "Current Stock" },
    { key: "min_stock_alert", header: "Min Stock" },
    {
      key: "hpp",
      header: "HPP",
      render: (item: any) => `Rp ${item.hpp.toLocaleString()}`,
    },
    {
      key: "status",
      header: "Status",
      render: (item: any) => (
        <span
          className={
            item.stock_qty <= item.min_stock_alert
              ? "text-destructive font-medium"
              : "text-green-600"
          }
        >
          {item.stock_qty <= item.min_stock_alert ? "Low" : "OK"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setAdjustDialog({
              open: true,
              variantId: item.id,
              sku: item.sku_variant,
              currentStock: item.stock_qty,
            })
          }
        >
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={variants ?? []}
        isLoading={isLoading}
        emptyMessage="No product variants found"
      />

      <Dialog
        open={adjustDialog.open}
        onOpenChange={(open) =>
          setAdjustDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {adjustDialog.sku}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Current Stock: {adjustDialog.currentStock}
              </p>
            </div>
            <div>
              <Label>Adjustment Qty (+ or -)</Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                placeholder="e.g., -5 or +10"
              />
              <p className="text-sm text-muted-foreground mt-1">
                New Stock: {adjustDialog.currentStock + adjustQty}
              </p>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Reason for adjustment"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setAdjustDialog({ open: false, variantId: "", sku: "", currentStock: 0 })
                }
              >
                Cancel
              </Button>
              <Button onClick={handleAdjust} disabled={adjustStock.isPending || adjustQty === 0}>
                Confirm Adjustment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

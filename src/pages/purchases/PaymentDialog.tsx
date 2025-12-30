import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { triggerAutoJournalPurchase } from "@/lib/api/purchases";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: any;
}

export function PaymentDialog({ open, onOpenChange, purchase }: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("bank");
  const [amount, setAmount] = useState<number>(0);
  const queryClient = useQueryClient();

  const paymentMutation = useMutation({
    mutationFn: async () => {
      return triggerAutoJournalPurchase(purchase.id, "payment", paymentMethod, amount);
    },
    onSuccess: (data) => {
      toast.success(`Pembayaran berhasil dicatat - ${purchase.purchase_no}`);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Gagal mencatat pembayaran: ${error.message}`);
    },
  });

  const handlePayment = () => {
    if (amount <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0");
      return;
    }
    paymentMutation.mutate();
  };

  // Reset amount when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open && purchase) {
      setAmount(purchase.total_amount);
    }
    onOpenChange(open);
  };

  if (!purchase) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran Supplier</DialogTitle>
          <DialogDescription>
            Catat pembayaran untuk {purchase.purchase_no}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier:</span>
              <span className="font-medium">{purchase.suppliers?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total PO:</span>
              <span className="font-medium">Rp {purchase.total_amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium capitalize">{purchase.status}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value: "cash" | "bank") => setPaymentMethod(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Transfer Bank (BCA)</SelectItem>
                <SelectItem value="cash">Kas / Tunai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Jumlah Pembayaran</Label>
            <Input
              type="number"
              min={0}
              max={purchase.total_amount}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Bisa bayar sebagian atau penuh
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={paymentMutation.isPending || amount <= 0}
          >
            {paymentMutation.isPending ? "Memproses..." : "Bayar & Buat Jurnal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

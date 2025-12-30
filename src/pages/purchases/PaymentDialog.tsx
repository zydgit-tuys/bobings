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
  const [paymentType, setPaymentType] = useState<"cash" | "bank" | "hutang">("bank");
  const [amount, setAmount] = useState<number>(0);
  const queryClient = useQueryClient();

  const paymentMutation = useMutation({
    mutationFn: async () => {
      return triggerAutoJournalPurchase(purchase.id, paymentType, amount);
    },
    onSuccess: () => {
      const typeLabel = paymentType === "cash" ? "Tunai" : paymentType === "bank" ? "Transfer Bank" : "Hutang";
      toast.success(`Jurnal ${typeLabel} berhasil dibuat - ${purchase.purchase_no}`);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Gagal membuat jurnal: ${error.message}`);
    },
  });

  const handlePayment = () => {
    if (amount <= 0) {
      toast.error("Jumlah harus lebih dari 0");
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

  const getPaymentDescription = () => {
    switch (paymentType) {
      case "cash":
        return "Debit: Persediaan → Credit: Kas";
      case "bank":
        return "Debit: Persediaan → Credit: Bank BCA";
      case "hutang":
        return "Debit: Persediaan → Credit: Hutang Supplier";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran & Jurnal</DialogTitle>
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
            <Label>Tipe Pembayaran</Label>
            <Select
              value={paymentType}
              onValueChange={(value: "cash" | "bank" | "hutang") => setPaymentType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Transfer Bank (BCA)</SelectItem>
                <SelectItem value="cash">Kas / Tunai</SelectItem>
                <SelectItem value="hutang">Hutang (Bayar Nanti)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getPaymentDescription()}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Jumlah</Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
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
            {paymentMutation.isPending ? "Memproses..." : "Buat Jurnal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
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
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { Loader2 } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: any;
}

export function PaymentDialog({ open, onOpenChange, purchase }: PaymentDialogProps) {
  const [paymentType, setPaymentType] = useState<"cash" | "bank" | "hutang">("bank");
  const [amount, setAmount] = useState<number>(0);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading: bankAccountsLoading } = useBankAccounts();

  // Set default bank when bank accounts load
  useEffect(() => {
    if (bankAccounts && bankAccounts.length > 0) {
      const defaultBank = bankAccounts.find((b) => b.is_default);
      if (defaultBank) {
        setSelectedBankId(defaultBank.id);
      } else {
        setSelectedBankId(bankAccounts[0].id);
      }
    }
  }, [bankAccounts]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const bankId = paymentType === "bank" ? selectedBankId : undefined;
      return triggerAutoJournalPurchase(purchase.id, paymentType, amount, bankId);
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
    if (paymentType === "bank" && !selectedBankId && bankAccounts && bankAccounts.length > 0) {
      toast.error("Pilih akun bank terlebih dahulu");
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

  const selectedBank = bankAccounts?.find((b) => b.id === selectedBankId);

  const getPaymentDescription = () => {
    switch (paymentType) {
      case "cash":
        return "Debit: Persediaan → Credit: Kas";
      case "bank":
        const bankName = selectedBank?.bank_name || "Bank";
        return `Debit: Persediaan → Credit: ${bankName}`;
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
                <SelectItem value="bank">Transfer Bank</SelectItem>
                <SelectItem value="cash">Kas / Tunai</SelectItem>
                <SelectItem value="hutang">Hutang (Bayar Nanti)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentType === "bank" && (
            <div className="space-y-2">
              <Label>Pilih Akun Bank</Label>
              {bankAccountsLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : bankAccounts && bankAccounts.length > 0 ? (
                <Select
                  value={selectedBankId}
                  onValueChange={setSelectedBankId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bank..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name}
                        {bank.account_number && ` - ${bank.account_number}`}
                        {bank.is_default && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-destructive">
                  Belum ada akun bank. Silakan tambahkan di Settings → Akun Bank.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {getPaymentDescription()}
          </p>

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
            disabled={
              paymentMutation.isPending || 
              amount <= 0 || 
              (paymentType === "bank" && !selectedBankId && bankAccounts && bankAccounts.length > 0)
            }
          >
            {paymentMutation.isPending ? "Memproses..." : "Buat Jurnal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { triggerAutoJournalPurchase } from "@/lib/api/purchases";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle2, Info, ArrowLeft, Building2, Wallet, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { JournalEntryDetailView } from "@/pages/accounting/JournalEntryDetailView";
import { cn } from "@/lib/utils"; // Assuming cn utility is available

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: any;
}

export function PaymentDialog({ open, onOpenChange, purchase }: PaymentDialogProps) {
  const [paymentType, setPaymentType] = useState<"cash" | "bank">("bank");
  const [amount, setAmount] = useState<number>(0);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isCompleted = purchase?.status === 'completed';
  const showHistory = showSuccess || isCompleted;

  const { data: bankAccounts, isLoading: bankAccountsLoading } = useBankAccounts();

  // Fetch all journal entries for this purchase
  const { data: purchaseJournals } = useQuery({
    queryKey: ['journal-entries', 'purchase', purchase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_lines (
            *,
            chart_of_accounts (code, name)
          )
        `)
        .in('reference_type', ['purchase', 'purchase_return'])
        .eq('reference_id', purchase.id)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!purchase?.id, // Fetch immediately to calculate remaining amount
  });

  // Fetch fresh purchase data to ensure we have latest totals
  const { data: freshPurchase } = useQuery({
    queryKey: ['purchase', purchase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('total_amount, total_paid, total_returned, status, suppliers(name)')
        .eq('id', purchase.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!purchase?.id,
  });

  // Use fresh data if available, otherwise fallback to prop
  const activePurchase = freshPurchase || purchase;

  // Calculate remaining amount based on total PO minus payments and returns
  const remainingAmount = useMemo(() => {
    const total = activePurchase?.total_amount || 0;
    const paid = activePurchase?.total_paid || 0;
    const returned = activePurchase?.total_returned || 0;

    // Remaining = Original Order - Already Paid - Already Returned
    return Math.max(0, total - paid - returned);
  }, [activePurchase]);

  const netTotal = (activePurchase?.total_amount || 0) - (activePurchase?.total_returned || 0);
  const diff = amount - netTotal;
  const paymentStatus = amount === 0 ? 'none' : Math.abs(amount - remainingAmount) < 0.01 ? 'full' : amount < remainingAmount ? 'partial' : 'over';
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

  // Auto-fill amount when dialog opens
  useEffect(() => {
    if (open) {
      setAmount(remainingAmount);
      setShowSuccess(false);
    }
  }, [open, remainingAmount]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const bankId = paymentType === "bank" ? selectedBankId : undefined;
      return triggerAutoJournalPurchase({
        purchaseId: purchase.id,
        operationType: 'payment',
        paymentMethod: paymentType,
        paymentAmount: amount,
        bankAccountId: bankId,
        notes: `Pembayaran via ${paymentType === "cash" ? "Kas" : "Bank"}`
      });
    },
    onSuccess: (data: any) => {
      const typeLabel = paymentType === "cash" ? "Tunai" : paymentType === "bank" ? "Transfer Bank" : "Hutang";

      toast.success(`Jurnal ${typeLabel} berhasil dibuat - ${purchase.purchase_no}`);

      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchases", purchase.id] });
      queryClient.invalidateQueries({ queryKey: ["purchase_payments", purchase.id] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });

      // Show success view with all PO journals
      setShowSuccess(true);
    },
    onError: (error: Error) => {
      if (error.message.includes("closed accounting period")) {
        toast.error("Gagal: Periode Akuntansi sudah ditutup untuk tanggal ini");
      } else {
        toast.error(`Gagal membuat jurnal: ${error.message}`);
      }
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

  // Sync amount with total PO when dialog opens or purchase updates
  // Sync amount with calculated remaining amount when dialog opens
  useEffect(() => {
    if (open) {
      // If purchaseJournals is loaded, use calculated remaining
      // Otherwise default to total (it will update when query finishes)
      setAmount(remainingAmount);
    }
  }, [open, remainingAmount]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowSuccess(false);
      setAmount(0);
    }
    onOpenChange(open);
  };

  if (!purchase) return null;

  const selectedBank = bankAccounts?.find((b) => b.id === selectedBankId);

  const getPaymentDescription = () => {
    let source = paymentType === "cash" ? "Kas" : (selectedBank?.bank_name || "Bank");

    if (paymentStatus === 'full') {
      return `Pembayaran Lunas: Debit Hutang Supplier → Credit ${source}`;
    } else if (paymentStatus === 'partial') {
      return `Pembayaran Parsial: Sebagian hutang dibayar dari ${source}`;
    } else if (paymentStatus === 'over') {
      return `Kelebihan Bayar: Hutang lunas + deposit dari ${source}`;
    }
    return `Mencatat pembayaran dari ${source}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showHistory ? `Riwayat Pembayaran - ${purchase?.purchase_no}` : "Input Pembayaran"}
          </DialogTitle>
          <DialogDescription>
            {showHistory ? "Riwayat jurnal dan pembayaran untuk PO ini." : "Catat pembayaran untuk Purchase Order ini. Jurnal akan dibuat otomatis."}
          </DialogDescription>
        </DialogHeader>

        {!showHistory ? (
          <>
            {/* Purchase info */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier:</span>
                <span className="font-medium">{purchase.suppliers?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total PO (Net):</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium">Rp {netTotal.toLocaleString()}</span>
                  {activePurchase?.total_returned > 0 && (
                    <span className="text-[10px] text-orange-600 font-medium">Incl. Retur Rp {activePurchase.total_returned.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-muted-foreground">Sisa Tagihan:</span>
                <span className="font-bold text-emerald-600">Rp {remainingAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-muted-foreground">Status Input:</span>
                <div className="flex gap-2">
                  {paymentStatus === 'full' && <Badge className="bg-green-500 hover:bg-green-600">Lunas</Badge>}
                  {paymentStatus === 'partial' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Cicil / Parsial</Badge>}
                  {paymentStatus === 'over' && <Badge variant="destructive">Kelebihan Bayar</Badge>}
                  {paymentStatus === 'none' && <Badge variant="outline">Belum Isi</Badge>}
                </div>
              </div>
            </div>

            {/* STEP 1: Amount Input - First! */}
            <div className="space-y-2">
              <Label>Jumlah Pembayaran</Label>
              <Input
                type="number"
                placeholder="Masukkan jumlah bayar..."
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Total PO: Rp {purchase?.total_amount?.toLocaleString() || 0}
              </p>
            </div>

            {/* STEP 2: Payment Status Alert */}
            {paymentStatus === 'partial' && (
              <Alert className="bg-amber-50 border-amber-200 text-amber-900">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pembayaran Parsial</AlertTitle>
                <AlertDescription className="text-xs">
                  Mencicil Rp {amount.toLocaleString()} dari sisa Rp {remainingAmount.toLocaleString()}
                </AlertDescription>
              </Alert>
            )}

            {paymentStatus === 'over' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pembayaran Melebihi Tagihan</AlertTitle>
                <AlertDescription className="text-xs">
                  Jumlah bayar tidak boleh melebihi sisa tagihan (Rp {remainingAmount.toLocaleString()}). Silakan koreksi nominal.
                </AlertDescription>
              </Alert>
            )}

            {paymentStatus === 'full' && (
              <Alert className="bg-green-50 border-green-200 text-green-900">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Pembayaran Lunas</AlertTitle>
                <AlertDescription className="text-xs">
                  Transaksi akan dicatat lunas dan stok akan langsung siap digunakan.
                </AlertDescription>
              </Alert>
            )}

            {/* STEP 3: Description */}
            <p className="text-xs text-muted-foreground italic">
              {getPaymentDescription()}
            </p>

            {/* STEP 4: Payment Type - Visual Tabs */}
            <div className="space-y-2">
              <Label>Tipe Pembayaran</Label>
              <RadioGroup
                value={paymentType}
                onValueChange={(value: "cash" | "bank") => setPaymentType(value)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="bank"
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent",
                    paymentType === "bank"
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  )}
                >
                  <RadioGroupItem value="bank" id="bank" className="sr-only" />
                  <Building2 className="h-6 w-6" />
                  <span className="text-sm font-medium">Transfer Bank</span>
                  {paymentType === "bank" && <Check className="h-4 w-4 text-primary" />}
                </Label>

                <Label
                  htmlFor="cash"
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent",
                    paymentType === "cash"
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  )}
                >
                  <RadioGroupItem value="cash" id="cash" className="sr-only" />
                  <Wallet className="h-6 w-6" />
                  <span className="text-sm font-medium">Tunai / Kas</span>
                  {paymentType === "cash" && <Check className="h-4 w-4 text-primary" />}
                </Label>
              </RadioGroup>

              {paymentStatus === 'partial' && (
                <p className="text-xs text-muted-foreground italic">
                  💡 Tip: Transfer Bank memudahkan tracking pembayaran parsial
                </p>
              )}
            </div>

            {/* STEP 5: Bank Selector - Always visible */}
            <div className="space-y-2">
              <Label className={paymentType === 'cash' ? 'text-muted-foreground' : ''}>
                Pilih Akun Bank
                {paymentType === 'cash' && (
                  <span className="text-xs ml-1">(Tidak diperlukan untuk Tunai)</span>
                )}
              </Label>
              {bankAccountsLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : bankAccounts && bankAccounts.length > 0 ? (
                <Select
                  value={selectedBankId}
                  onValueChange={setSelectedBankId}
                  disabled={paymentType === 'cash'}
                >
                  <SelectTrigger className={paymentType === 'cash' ? 'opacity-50' : ''}>
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
                <p className="text-sm text-muted-foreground">
                  Belum ada akun bank. Silakan tambahkan di Settings → Akun Bank.
                </p>
              )}
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
                  amount > remainingAmount ||
                  (paymentType === "bank" && !selectedBankId && bankAccounts && bankAccounts.length > 0)
                }
              >
                {paymentMutation.isPending ? "Memproses..." : "Buat Jurnal"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4">
            {!isCompleted && (
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Pembayaran Berhasil Dicatat</span>
              </div>
            )}

            {/* Show all journals for this PO */}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">Riwayat Jurnal</h4>
                <Badge variant="outline">{purchase.purchase_no}</Badge>
              </div>

              {purchaseJournals && purchaseJournals.length > 0 ? (
                <div className="space-y-0">
                  {purchaseJournals.map((journal: any, index: number) => (
                    <div key={journal.id} className="relative pl-6 pb-8 border-l-2 border-muted last:border-l-0 last:pb-0">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary shadow-[0_0_0_4px_white]" />

                      <div className="flex flex-col gap-1 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {new Date(journal.entry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-sm font-medium leading-none">{journal.description}</span>
                      </div>

                      <div className="rounded-md border bg-card text-xs overflow-hidden shadow-sm">
                        {/* Header */}
                        <div className="grid grid-cols-[1fr_90px_90px] gap-2 p-2 bg-muted/50 border-b font-medium text-muted-foreground">
                          <div>Akun</div>
                          <div className="text-right">Debit</div>
                          <div className="text-right">Credit</div>
                        </div>

                        {/* Rows */}
                        {journal.journal_lines?.map((line: any) => (
                          <div key={line.id} className="grid grid-cols-[1fr_90px_90px] gap-2 p-2 border-b last:border-0 items-center">
                            <div className="flex flex-col truncate">
                              <span className="font-semibold text-foreground">{line.chart_of_accounts?.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{line.chart_of_accounts?.code}</span>
                            </div>
                            <div className="text-right font-mono text-emerald-600">
                              {line.debit > 0 && `Rp ${line.debit.toLocaleString()}`}
                            </div>
                            <div className="text-right font-mono text-crimson-600">
                              {line.credit > 0 && `Rp ${line.credit.toLocaleString()}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <p className="text-sm">Memuat riwayat jurnal...</p>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                navigate("/purchases");
              }}
            >
              Selesai & Kembali ke Daftar PO
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog >
  );
}
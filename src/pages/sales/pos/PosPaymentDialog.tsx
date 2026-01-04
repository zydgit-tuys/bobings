import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, DollarSign, CreditCard, AlertTriangle, Wallet } from "lucide-react";
import { useBankAccounts } from "@/hooks/use-bank-accounts";

interface PosPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    totalAmount: number;
    customers: any[];
    selectedCustomerId: string;
    onCustomerChange: (id: string) => void;
    onConfirm: (data: PaymentData) => Promise<void>;
}

export interface PaymentData {
    paymentMethod: 'cash' | 'bank' | 'credit';
    paymentAccountId?: string;
    paidAmount: number;
    discountAmount: number;
    notes?: string;
}

export function PosPaymentDialog({
    open,
    onOpenChange,
    totalAmount,
    customers,
    selectedCustomerId,
    onCustomerChange,
    onConfirm
}: PosPaymentDialogProps) {
    // Queries
    const { data: bankAccounts } = useBankAccounts();

    // State
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'credit'>('cash');
    const [selectedBankId, setSelectedBankId] = useState<string>("");

    // Amounts
    const [discount, setDiscount] = useState<number>(0);
    const [cashReceived, setCashReceived] = useState<number>(0);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const netAmount = Math.max(0, totalAmount - discount);

    // Initialize cash received equal to net amount when net amount changes (convenience)
    useEffect(() => {
        if (open) {
            setCashReceived(netAmount);
        }
    }, [open, totalAmount, discount]); // Only reset on open or total change

    const remaining = Math.max(0, netAmount - cashReceived);
    const change = Math.max(0, cashReceived - netAmount);

    const isValid = () => {
        if (paymentMethod === 'bank' && !selectedBankId) return false;
        if (netAmount < 0) return false;
        return true;
    };

    const handleConfirm = async () => {
        if (!isValid()) return;

        setIsSubmitting(true);
        try {
            // Determine actual paid amount
            // If Cash > Net, Paid = Net (Change is returned). Journal uses Net.
            // If Cash < Net, Paid = CashReceived. Remainder is Credit/AR.
            const paidAmount = cashReceived >= netAmount ? netAmount : cashReceived;

            // Determine payment account ID (Bank Account ID or nothing for Generic Cash)
            // Note: For Cash, we might need a Default Cash Account ID if strict mapping is required per transaction.
            // But usually 'cash' method triggers the default Cash Account in backend mapping.
            // For Bank, we definitely need the specific bank's COA ID.

            // Map selectedBankId (which is the UUID of bank_accounts table) to its chart_of_accounts ID?
            // The useBankAccounts returns objects with account_id (COA ID).
            const bankAccount = bankAccounts?.find(b => b.id === selectedBankId);
            const paymentAccountId = paymentMethod === 'bank' ? bankAccount?.account_id : undefined;

            await onConfirm({
                paymentMethod,
                paymentAccountId,
                paidAmount,
                discountAmount: discount,
                notes
            });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Pembayaran</DialogTitle>
                    <DialogDescription>Selesaikan transaksi</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Customer Selection in Payment Dialog for flexibility */}
                    <div className="space-y-2">
                        <Label>Pelanggan</Label>
                        <Select value={selectedCustomerId} onValueChange={onCustomerChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Pelanggan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="umum">Umum / Walk-in</SelectItem>
                                {customers?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} {c.customer_type === 'khusus' ? '(Khusus)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Summary */}
                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>Diskon (Rp)</span>
                            <Input
                                type="number"
                                min={0}
                                className="w-28 h-8 text-right"
                                value={discount}
                                onChange={e => setDiscount(Number(e.target.value))}
                            />
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Harus Bayar</span>
                            <span>Rp {netAmount.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <Tabs value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="cash">Tunai (Cash)</TabsTrigger>
                            <TabsTrigger value="bank">Transfer / QRIS</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Bank Selection */}
                    {paymentMethod === 'bank' && (
                        <div className="space-y-2 pt-2">
                            <Label>Pilih Bank Tujuan</Label>
                            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Akun Bank..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts?.map(bank => (
                                        <SelectItem key={bank.id} value={bank.id}>
                                            {bank.bank_name} ({bank.account_number})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Payment Input */}
                    <div className="space-y-2 pt-2">
                        <Label className="text-base">Jumlah Dibayar</Label>
                        <div className="relative">
                            <div className="absolute left-3 top-2.5 text-muted-foreground">Rp</div>
                            <Input
                                type="number"
                                className="pl-10 text-lg font-bold h-12"
                                value={cashReceived}
                                onChange={e => setCashReceived(Number(e.target.value))}
                                min={0}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setCashReceived(netAmount)}>
                                Pas ({netAmount.toLocaleString('id-ID')})
                            </Button>
                        </div>
                    </div>

                    {/* Info Box: Change or Remaining/Credit */}
                    {cashReceived >= netAmount ? (
                        <Alert className="bg-green-50 border-green-200">
                            <Wallet className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700 font-medium">
                                Kembalian: Rp {change.toLocaleString('id-ID')}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert className="bg-orange-50 border-orange-200">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-700 font-medium">
                                Kurang Bayar: Rp {remaining.toLocaleString('id-ID')}
                                <div className="text-xs font-normal mt-1 text-orange-600/80">
                                    Sisa ini akan dicatat sebagai Piutang Usaha.
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label>Catatan (Opsional)</Label>
                        <Input
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="No Ref / Catatan lain..."
                        />
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                    <Button onClick={handleConfirm} disabled={!isValid() || isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Konfirmasi Bayar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

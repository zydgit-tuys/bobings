import { usePurchasePayments } from "@/hooks/use-purchase-payments";
import {
    Loader2,
    Wallet,
    Banknote,
    Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PurchasePaymentListProps {
    purchaseId: string;
}

export function PurchasePaymentList({ purchaseId }: PurchasePaymentListProps) {
    const { data, isLoading, error } = usePurchasePayments(purchaseId);
    const payments = data as any[];

    // Debug logging
    console.log('[PurchasePaymentList] Debug:', {
        purchaseId,
        isLoading,
        error,
        dataType: typeof data,
        dataIsArray: Array.isArray(data),
        dataLength: data?.length,
        payments: payments?.slice(0, 2) // First 2 items for inspection
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading payments...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 border rounded-lg bg-red-50 border-red-200">
                <div className="flex flex-col items-center gap-3">
                    <div className="text-red-600 font-semibold">Error Loading Payments</div>
                    <div className="text-sm text-red-700">
                        {error instanceof Error ? error.message : 'Unknown error occurred'}
                    </div>
                    <pre className="text-xs bg-red-100 p-2 rounded max-w-full overflow-auto">
                        {JSON.stringify(error, null, 2)}
                    </pre>
                </div>
            </div>
        );
    }

    if (!payments || payments.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex flex-col items-center gap-3">
                    <Wallet className="h-12 w-12 text-blue-400" />
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Belum Ada Riwayat Pembayaran</h3>
                        <p className="text-sm text-blue-700 max-w-md">
                            Pembayaran yang dibuat setelah sistem di-update akan muncul di sini.
                            Pembayaran lama tetap tercatat di jurnal akuntansi.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 mt-4">
            {payments.map((pay) => (
                <div key={pay.id} className="border rounded-lg p-4 bg-muted/10 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                                {pay.payment_method === 'cash' ? (
                                    <Banknote className="h-5 w-5 text-green-700" />
                                ) : (
                                    <Building2 className="h-5 w-5 text-blue-700" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg">{pay.payment_no}</span>
                                    <Badge variant="outline" className="capitalize">
                                        {pay.payment_method}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {new Date(pay.payment_date).toLocaleDateString('id-ID', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                    {pay.bank_accounts && (
                                        <span className="ml-2">
                                            • {pay.bank_accounts.bank_name} ({pay.bank_accounts.account_holder || pay.bank_accounts.account_number || 'N/A'})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Jumlah Bayar</div>
                            <div className="text-2xl font-bold text-emerald-600">
                                Rp {(pay.payment_amount || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                    {pay.notes && (
                        <div className="mt-4 p-2 bg-muted/50 rounded text-sm italic text-muted-foreground">
                            "{pay.notes}"
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

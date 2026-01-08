import { usePurchaseReceipts } from "@/hooks/use-purchase-receipts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck } from "lucide-react";

interface PurchaseReceiptListProps {
    purchaseId: string;
}

export function PurchaseReceiptList({ purchaseId }: PurchaseReceiptListProps) {
    const { data, isLoading } = usePurchaseReceipts(purchaseId);
    const receipts = data as any[];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading receipts...</span>
            </div>
        );
    }

    if (!receipts || receipts.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-muted/20 text-muted-foreground">
                Belum ada barang yang diterima.
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-4">
            {receipts.map((rec) => (
                <div key={rec.id} className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 border-b pb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-orange-600" />
                                <span className="font-bold text-lg">{rec.receipt_no}</span>
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                                    Received
                                </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {new Date(rec.receipt_date).toLocaleDateString('id-ID', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </span>
                        </div>
                        {rec.notes && (
                            <div className="text-sm italic text-muted-foreground bg-muted p-2 rounded">
                                "{rec.notes}"
                            </div>
                        )}
                    </div>

                    <div className="rounded-md border bg-card">
                        <div className="grid grid-cols-[1fr_80px_100px] gap-2 p-2 bg-muted/50 border-b font-medium text-xs text-muted-foreground">
                            <div>Item</div>
                            <div className="text-right">Qty</div>
                            <div className="text-right">Unit Cost</div>
                        </div>
                        {rec.lines?.map((line: any) => (
                            <div key={line.id} className="grid grid-cols-[1fr_80px_100px] gap-2 p-2 border-b last:border-0 items-center text-sm">
                                <div>
                                    <span className="font-medium">
                                        {line.purchase_line?.variant?.sku_variant || 'Unknown Item'}
                                    </span>
                                </div>
                                <div className="text-right font-mono font-bold text-emerald-600">
                                    + {line.received_qty}
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                    Rp {(line.unit_cost || 0).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 text-right">
                        <span className="text-sm text-muted-foreground mr-2">Total Receipt Value:</span>
                        <span className="font-bold text-lg">Rp {(rec.total_amount || 0).toLocaleString()}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

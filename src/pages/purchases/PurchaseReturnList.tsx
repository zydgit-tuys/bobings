import { usePurchaseReturns } from "@/hooks/use-purchase-returns";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface PurchaseReturnListProps {
    purchaseId: string;
}

export function PurchaseReturnList({ purchaseId }: PurchaseReturnListProps) {
    const { data: returns, isLoading } = usePurchaseReturns(purchaseId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading details...</span>
            </div>
        );
    }

    if (!returns || returns.length === 0) {
        return null;
    }

    return (
        <Card className="mt-6 lg:col-span-3">
            <CardHeader>
                <CardTitle>Riwayat Retur Barang</CardTitle>
                <CardDescription>
                    Daftar pengembalian barang untuk purchase order ini.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {returns.map((ret) => (
                        <div key={ret.id} className="border rounded-lg p-4 bg-muted/10">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 border-b pb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">{ret.return_no}</span>
                                        <Badge variant={ret.status === 'completed' ? 'default' : 'secondary'}>
                                            {ret.status}
                                        </Badge>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(ret.return_date).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                    </span>
                                </div>
                                {ret.reason && (
                                    <div className="text-sm italic text-muted-foreground bg-muted p-2 rounded">
                                        "{ret.reason}"
                                    </div>
                                )}
                            </div>

                            <div className="rounded-md border bg-card">
                                <div className="grid grid-cols-[1fr_80px] gap-2 p-2 bg-muted/50 border-b font-medium text-xs text-muted-foreground">
                                    <div>Item</div>
                                    <div className="text-right">Qty</div>
                                </div>
                                {ret.lines?.map((line: any) => (
                                    <div key={line.id} className="grid grid-cols-[1fr_80px] gap-2 p-2 border-b last:border-0 items-center text-sm">
                                        <div>
                                            <span className="font-medium">
                                                {line.purchase_line?.variant?.sku_variant || 'Unknown Item'}
                                            </span>
                                            {line.notes && (
                                                <span className="ml-2 text-xs text-muted-foreground">({line.notes})</span>
                                            )}
                                        </div>
                                        <div className="text-right font-mono text-destructive font-bold">
                                            - {line.qty}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

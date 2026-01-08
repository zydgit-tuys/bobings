import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Receipt, CreditCard, RotateCcw, Wallet, Info } from "lucide-react";

interface PurchaseFinancialSummaryProps {
    totalAmount: number;
    totalReceived: number;
    totalPaid: number;
    totalReturned: number;
    className?: string;
}

export function PurchaseFinancialSummary({
    totalAmount,
    totalReceived,
    totalPaid,
    totalReturned,
    className
}: PurchaseFinancialSummaryProps) {
    const balance = totalAmount - totalPaid - totalReturned;
    const isFullyPaid = balance <= 0 && totalAmount > 0;

    const items = [
        {
            label: "Total Pesanan",
            value: totalAmount,
            icon: Receipt,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            label: "Total Diterima",
            value: totalReceived,
            icon: Info,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
        },
        {
            label: "Total Dibayar",
            value: totalPaid,
            icon: CreditCard,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
        },
        {
            label: "Total Retur",
            value: totalReturned,
            icon: RotateCcw,
            color: "text-red-600",
            bgColor: "bg-red-50",
        },
    ];

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        Ringkasan Keuangan
                    </CardTitle>
                    {isFullyPaid && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Lunas
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-x divide-y">
                    {items.map((item) => (
                        <div key={item.label} className="p-4 flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className={cn("p-1 rounded", item.bgColor)}>
                                    <item.icon className={cn("h-3 w-3", item.color)} />
                                </div>
                                {item.label}
                            </div>
                            <span className="text-sm font-bold">
                                Rp {item.value.toLocaleString('id-ID')}
                            </span>
                        </div>
                    ))}
                </div>
                <div className={cn(
                    "p-4 border-t flex items-center justify-between",
                    balance > 0 ? "bg-amber-50/50" : "bg-emerald-50/50"
                )}>
                    <span className="text-xs font-medium text-muted-foreground">Sisa Tagihan</span>
                    <span className={cn(
                        "text-lg font-black",
                        balance > 0 ? "text-amber-700" : "text-emerald-700"
                    )}>
                        Rp {Math.max(0, balance).toLocaleString('id-ID')}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Truck, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartStatusCardProps {
    status: string;
    totalAmount: number;
    totalReceived: number;
    totalPaid: number;
    totalReturned: number;
    totalQty: number;
    receivedQty: number; // New prop for correct Qty progress
    onReceive: () => void;
    onPay: () => void;
}

export function SmartStatusCard({
    status,
    totalAmount,
    totalReceived, // Keep for debug/secondary checks if needed, but rely on Qty
    totalPaid,
    totalReturned,
    totalQty,
    receivedQty,
    onReceive,
    onPay,
}: SmartStatusCardProps) {

    // Calculate Progress Percentages
    const receiveProgress = totalQty > 0 ? (receivedQty / totalQty) * 100 : 0;

    const netTotal = totalAmount - totalReturned;
    const payProgress = netTotal > 0 ? (totalPaid / netTotal) * 100 : 0;

    // Determine Primary Call-to-Action
    let cta = null;

    if (status === 'ordered' || (status === 'partial' && receiveProgress < 100)) {
        cta = {
            label: "Barang Belum Sampai?",
            buttonText: "Terima Barang",
            action: onReceive,
            icon: Truck,
            color: "bg-blue-600 hover:bg-blue-700"
        };
    } else if ((status === 'received' || status === 'partial' || receiveProgress >= 100) && payProgress < 100) {
        cta = {
            label: "Tagihan Belum Lunas?",
            buttonText: "Bayar Tagihan",
            action: onPay,
            icon: CreditCard,
            color: "bg-emerald-600 hover:bg-emerald-700"
        };
    }

    // Hide card if draft or fully completed/cancelled
    if (status === 'draft' || status === 'cancelled') return null;

    return (
        <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-6 items-center">

                    {/* Progress Section */}
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* Receive Progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <Truck className="h-4 w-4" /> Penerimaan Barang
                                </span>
                                <span className="font-medium">{receivedQty} / {totalQty}</span>
                            </div>
                            <Progress value={receiveProgress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{Math.round(receiveProgress)}% Selesai</span>
                                {status === 'ordered' && <span className="text-amber-600">Menunggu Pengiriman</span>}
                            </div>
                        </div>

                        {/* Payment Progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <CreditCard className="h-4 w-4" /> Pembayaran
                                </span>
                                <span className="font-medium">{Math.round(payProgress)}%</span>
                            </div>
                            <Progress
                                value={payProgress}
                                className="h-2"
                                indicatorClassName="bg-emerald-500"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Rp {totalPaid.toLocaleString('id-ID')} / {netTotal.toLocaleString('id-ID')}</span>
                                {payProgress >= 100 && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Lunas</span>}
                            </div>
                        </div>

                    </div>

                    {/* CTA Section */}
                    {cta && (
                        <div className="w-full md:w-auto border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col items-center md:items-start gap-2 min-w-[200px]">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Rekomendasi Tindakan
                            </span>
                            <Button
                                onClick={cta.action}
                                className={cn("w-full shadow-md", cta.color)}
                                size="sm"
                            >
                                <cta.icon className="mr-2 h-4 w-4" />
                                {cta.buttonText}
                            </Button>
                        </div>
                    )}

                </div>
            </CardContent>
        </Card>
    );
}

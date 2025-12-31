import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ShoppingBag, AlertTriangle, ArrowRight, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActionProps {
    draftPurchasesCount: number;
    pendingSalesCount: number;
    lowStockCount: number;
}

export function ActionCenter({ draftPurchasesCount, pendingSalesCount, lowStockCount }: ActionProps) {
    const navigate = useNavigate();

    if (draftPurchasesCount === 0 && pendingSalesCount === 0 && lowStockCount === 0) {
        return null; // Don't show if nothing to do
    }

    return (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    Pending Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">

                {/* Draft Purchases */}
                {draftPurchasesCount > 0 && (
                    <Button
                        variant="outline"
                        className="h-auto py-3 px-4 justify-between bg-white dark:bg-card hover:bg-blue-50 hover:border-blue-200 group"
                        onClick={() => navigate('/purchases?status=draft')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-orange-100 text-orange-600 group-hover:bg-orange-200">
                                <ShoppingCart className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-foreground">{draftPurchasesCount} Draft PO</div>
                                <div className="text-xs text-muted-foreground">Menunggu konfirmasi</div>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Button>
                )}

                {/* Pending Sales */}
                {pendingSalesCount > 0 && (
                    <Button
                        variant="outline"
                        className="h-auto py-3 px-4 justify-between bg-white dark:bg-card hover:bg-green-50 hover:border-green-200 group"
                        onClick={() => navigate('/sales?status=pending')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-100 text-green-600 group-hover:bg-green-200">
                                <ShoppingBag className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-foreground">{pendingSalesCount} Order Baru</div>
                                <div className="text-xs text-muted-foreground">Perlu diproses</div>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Button>
                )}

                {/* Low Stock */}
                {lowStockCount > 0 && (
                    <Button
                        variant="outline"
                        className="h-auto py-3 px-4 justify-between bg-white dark:bg-card hover:bg-red-50 hover:border-red-200 group"
                        onClick={() => navigate('/inventory/alerts')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-red-100 text-red-600 group-hover:bg-red-200">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-foreground">{lowStockCount} Stok Menipis</div>
                                <div className="text-xs text-muted-foreground">Perlu restock segera</div>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Button>
                )}

            </CardContent>
        </Card>
    );
}

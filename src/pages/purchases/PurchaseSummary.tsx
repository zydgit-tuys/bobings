import { Card, CardContent } from "@/components/ui/card";
import { FileText, Truck, CheckCircle, PackageX } from "lucide-react";

interface PurchaseSummaryProps {
    purchases: any[];
    onFilterChange: (status: string) => void;
    activeFilter: string;
}

export function PurchaseSummary({ purchases, onFilterChange, activeFilter }: PurchaseSummaryProps) {
    // Calculate stats
    const stats = {
        draft: purchases.filter(p => p.status === 'draft').length,
        ordered: purchases.filter(p => p.status === 'ordered' || (p.status === 'partial' && (p.total_received || 0) < p.total_qty)).length,
        unpaid: purchases.filter(p =>
            (p.status === 'partial' || p.status === 'received') &&
            (p.total_paid || 0) < ((p.total_amount || 0) - (p.total_returned || 0))
        ).length,
        completed: purchases.filter(p => p.status === 'completed').length,
        cancelled: purchases.filter(p => p.status === 'cancelled').length,
    };

    const items = [
        {
            label: "Menunggu Barang",
            count: stats.ordered,
            status: "ordered",
            icon: Truck,
            color: "text-blue-600",
            bg: "bg-blue-100",
            border: "border-blue-200"
        },
        {
            label: "Belum Lunas",
            count: stats.unpaid,
            status: "unpaid",
            icon: FileText,
            color: "text-amber-600",
            bg: "bg-amber-100",
            border: "border-amber-200"
        },
        {
            label: "Selesai",
            count: stats.completed,
            status: "completed",
            icon: CheckCircle,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
            border: "border-emerald-200"
        },
        {
            label: "Draft / Batal",
            count: stats.draft + stats.cancelled,
            status: "draft", // simplifies mainly viewing drafts
            icon: PackageX,
            color: "text-slate-600",
            bg: "bg-slate-100",
            border: "border-slate-200"
        }
    ];

    return (
        <div className="mb-4">
            {/* Active Filter Indicator */}
            {activeFilter !== "all" && (
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-sm font-medium text-muted-foreground">
                        Filter: <span className="text-primary">{items.find(i => i.status === activeFilter)?.label}</span>
                    </span>
                    <button
                        onClick={() => onFilterChange("all")}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                        Clear Filter
                    </button>
                </div>
            )}

            {/* Summary Cards - Horizontal Scroll on Mobile */}
            <div className="overflow-x-auto pb-2 -mx-2 px-2 lg:overflow-visible">
                <div className="flex lg:grid lg:grid-cols-4 gap-3 min-w-max lg:min-w-0">
                    {items.map((item) => {
                        const isActive = activeFilter === item.status;
                        const Icon = item.icon;

                        return (
                            <div
                                key={item.label}
                                onClick={() => onFilterChange(isActive ? "all" : item.status)}
                                className={`
                                    relative overflow-hidden rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md
                                    min-w-[140px] lg:min-w-0
                                    ${isActive ? `ring-2 ring-primary ring-offset-1 ${item.bg} shadow-lg` : "bg-white hover:bg-muted/30"}
                                `}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                                        <div className="flex items-baseline gap-1 mt-1">
                                            <span className="text-2xl font-bold">{item.count}</span>
                                            <span className="text-xs text-muted-foreground">Order</span>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-full ${item.bg}`}>
                                        <Icon className={`h-4 w-4 ${item.color}`} />
                                    </div>
                                </div>

                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

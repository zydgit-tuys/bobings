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
        ordered: purchases.filter(p => p.status === 'ordered' || p.status === 'partial').length,
        completed: purchases.filter(p => p.status === 'completed' || p.status === 'received').length,
        cancelled: purchases.filter(p => p.status === 'cancelled').length,
    };

    const items = [
        {
            label: "Draft PO",
            count: stats.draft,
            status: "draft",
            icon: FileText,
            color: "text-slate-600",
            bg: "bg-slate-100",
            border: "border-slate-200"
        },
        {
            label: "Menunggu Barang",
            count: stats.ordered,
            status: "ordered", // mapped to ordered/partial
            icon: Truck,
            color: "text-blue-600",
            bg: "bg-blue-100",
            border: "border-blue-200"
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
            label: "Batal",
            count: stats.cancelled,
            status: "cancelled",
            icon: PackageX,
            color: "text-red-600",
            bg: "bg-red-100",
            border: "border-red-200"
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {items.map((item) => {
                const isActive = activeFilter === item.status;
                const Icon = item.icon;

                return (
                    <div
                        key={item.label}
                        onClick={() => onFilterChange(isActive ? "all" : item.status)}
                        className={`
              relative overflow-hidden rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md
              ${isActive ? `ring-2 ring-primary ring-offset-1 ${item.bg}` : "bg-white hover:bg-muted/30"}
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
    );
}

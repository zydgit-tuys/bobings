import { useState } from 'react';
import { History, TrendingUp, TrendingDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePriceHistory } from '@/hooks/use-price-history';
import { formatCurrency } from '@/lib/utils';

interface PriceHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variantId: string;
    variantName: string;
}

export function PriceHistoryDialog({ open, onOpenChange, variantId, variantName }: PriceHistoryDialogProps) {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
    });

    const { data: history, isLoading } = usePriceHistory(variantId, filters);

    const getPriceChange = (oldPrice: number | null, newPrice: number | null) => {
        if (!oldPrice || !newPrice) return null;
        const change = newPrice - oldPrice;
        const percentage = (change / oldPrice) * 100;
        return { change, percentage };
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Price History: {variantName}
                    </DialogTitle>
                </DialogHeader>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">End Date</label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : history && history.length > 0 ? (
                        history.map((record) => {
                            const umumChange = getPriceChange(record.old_harga_jual_umum, record.new_harga_jual_umum);
                            const khususChange = getPriceChange(record.old_harga_jual_khusus, record.new_harga_jual_khusus);
                            const hppChange = getPriceChange(record.old_hpp, record.new_hpp);

                            return (
                                <div key={record.id} className="border rounded-lg p-4 space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            {record.changed_at
                                                ? new Date(record.changed_at).toLocaleString('id-ID')
                                                : 'Unknown date'}
                                        </div>
                                        {record.reason && (
                                            <Badge variant="outline">{record.reason}</Badge>
                                        )}
                                    </div>

                                    {/* Price Changes */}
                                    <div className="grid grid-cols-3 gap-4">
                                        {/* Harga Jual Umum */}
                                        {(record.old_harga_jual_umum !== null || record.new_harga_jual_umum !== null) && (
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Harga Jual Umum</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm line-through text-muted-foreground">
                                                        {record.old_harga_jual_umum ? formatCurrency(record.old_harga_jual_umum) : '-'}
                                                    </span>
                                                    <span className="text-sm">→</span>
                                                    <span className="text-sm font-medium">
                                                        {record.new_harga_jual_umum ? formatCurrency(record.new_harga_jual_umum) : '-'}
                                                    </span>
                                                </div>
                                                {umumChange && (
                                                    <div className={`flex items-center gap-1 text-xs ${umumChange.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {umumChange.change > 0 ? (
                                                            <TrendingUp className="h-3 w-3" />
                                                        ) : (
                                                            <TrendingDown className="h-3 w-3" />
                                                        )}
                                                        <span>
                                                            {formatCurrency(Math.abs(umumChange.change))} ({umumChange.percentage.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Harga Jual Khusus */}
                                        {(record.old_harga_jual_khusus !== null || record.new_harga_jual_khusus !== null) && (
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">Harga Jual Khusus</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm line-through text-muted-foreground">
                                                        {record.old_harga_jual_khusus ? formatCurrency(record.old_harga_jual_khusus) : '-'}
                                                    </span>
                                                    <span className="text-sm">→</span>
                                                    <span className="text-sm font-medium">
                                                        {record.new_harga_jual_khusus ? formatCurrency(record.new_harga_jual_khusus) : '-'}
                                                    </span>
                                                </div>
                                                {khususChange && (
                                                    <div className={`flex items-center gap-1 text-xs ${khususChange.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {khususChange.change > 0 ? (
                                                            <TrendingUp className="h-3 w-3" />
                                                        ) : (
                                                            <TrendingDown className="h-3 w-3" />
                                                        )}
                                                        <span>
                                                            {formatCurrency(Math.abs(khususChange.change))} ({khususChange.percentage.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* HPP */}
                                        {(record.old_hpp !== null || record.new_hpp !== null) && (
                                            <div className="space-y-1">
                                                <div className="text-xs font-medium text-muted-foreground">HPP</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm line-through text-muted-foreground">
                                                        {record.old_hpp ? formatCurrency(record.old_hpp) : '-'}
                                                    </span>
                                                    <span className="text-sm">→</span>
                                                    <span className="text-sm font-medium">
                                                        {record.new_hpp ? formatCurrency(record.new_hpp) : '-'}
                                                    </span>
                                                </div>
                                                {hppChange && (
                                                    <div className={`flex items-center gap-1 text-xs ${hppChange.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {hppChange.change > 0 ? (
                                                            <TrendingUp className="h-3 w-3" />
                                                        ) : (
                                                            <TrendingDown className="h-3 w-3" />
                                                        )}
                                                        <span>
                                                            {formatCurrency(Math.abs(hppChange.change))} ({hppChange.percentage.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No price changes recorded
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

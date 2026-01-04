import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ClipboardCheck, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useStockOpnames, useCreateStockOpname, useConfirmStockOpname } from '@/hooks/use-stock-opname';
import { formatCurrency } from '@/lib/utils';

const opnameSchema = z.object({
    opname_date: z.string().min(1, 'Tanggal wajib diisi'),
    warehouse_id: z.string().optional(),
    notes: z.string().optional(),
});

type OpnameFormData = z.infer<typeof opnameSchema>;

interface OpnameLine {
    variant_id: string;
    variant_name: string;
    sku: string;
    system_qty: number;
    physical_qty: number;
    unit_cost: number;
    notes?: string;
}

export default function StockOpnamePage() {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        warehouseId: '',
        status: '',
    });

    const { data: opnames, isLoading } = useStockOpnames(filters);
    const confirmOpname = useConfirmStockOpname();

    const handleConfirm = async (id: string) => {
        if (confirm('Konfirmasi stock opname ini? Stok akan diupdate dan jurnal akan dibuat.')) {
            await confirmOpname.mutateAsync(id);
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5" />
                                Stock Opname
                            </CardTitle>
                            <CardDescription>
                                Physical stock counting and adjustment
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Opname
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
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
                        <div>
                            <label className="text-sm font-medium">Status</label>
                            <Input
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                placeholder="draft / confirmed"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Opname No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : opnames && opnames.length > 0 ? (
                                    opnames.map((opname) => (
                                        <TableRow key={opname.id}>
                                            <TableCell className="font-mono">{opname.opname_no}</TableCell>
                                            <TableCell>{new Date(opname.opname_date).toLocaleDateString('id-ID')}</TableCell>
                                            <TableCell>
                                                <Badge variant={opname.status === 'confirmed' ? 'default' : 'secondary'}>
                                                    {opname.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {opname.status === 'draft' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleConfirm(opname.id)}
                                                        disabled={confirmOpname.isPending}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Confirm
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No opname records found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <CreateOpnameDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
            />
        </div>
    );
}

function CreateOpnameDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [lines, setLines] = useState<OpnameLine[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState('');

    const form = useForm<OpnameFormData>({
        resolver: zodResolver(opnameSchema),
        defaultValues: {
            opname_date: new Date().toISOString().split('T')[0],
            warehouse_id: '',
            notes: '',
        },
    });

    const createOpname = useCreateStockOpname();

    const handleAddLine = () => {
        if (!selectedVariantId) return;

        // Check if already added
        if (lines.find(l => l.variant_id === selectedVariantId)) {
            alert('Variant already added');
            return;
        }

        // Simplified: User enters variant ID manually
        // TODO: Replace with searchable dropdown that fetches variant details
        const newLine: OpnameLine = {
            variant_id: selectedVariantId,
            variant_name: 'Product Name - Variant', // TODO: Fetch from API
            sku: selectedVariantId, // Temporary
            system_qty: 0, // TODO: Fetch current stock from API
            physical_qty: 0,
            unit_cost: 0,
            notes: '',
        };

        setLines([...lines, newLine]);
        setSelectedVariantId('');
    };

    const handleRemoveLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleLineChange = (index: number, field: keyof OpnameLine, value: any) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setLines(newLines);
    };

    const totalSurplus = lines.reduce((sum, line) => {
        const diff = line.physical_qty - line.system_qty;
        return sum + (diff > 0 ? diff * line.unit_cost : 0);
    }, 0);

    const totalShortage = lines.reduce((sum, line) => {
        const diff = line.physical_qty - line.system_qty;
        return sum + (diff < 0 ? Math.abs(diff) * line.unit_cost : 0);
    }, 0);

    const onSubmit = async (data: OpnameFormData) => {
        if (lines.length === 0) {
            alert('Please add at least one line item');
            return;
        }

        await createOpname.mutateAsync({
            opname_date: data.opname_date,
            warehouse_id: data.warehouse_id || null,
            notes: data.notes || null,
            lines: lines.map(line => ({
                variant_id: line.variant_id,
                system_qty: line.system_qty,
                physical_qty: line.physical_qty,
                unit_cost: line.unit_cost,
                notes: line.notes,
            })),
        });

        form.reset();
        setLines([]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Stock Opname</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Opname Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="opname_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Opname Date *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="warehouse_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Warehouse</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Optional" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} rows={2} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Add Product Section */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Add Product</label>
                            <div className="flex gap-2">
                                <Input
                                    value={selectedVariantId}
                                    onChange={(e) => setSelectedVariantId(e.target.value)}
                                    placeholder="Enter variant ID"
                                    className="flex-1"
                                />
                                <Button type="button" onClick={handleAddLine}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                </Button>
                            </div>
                        </div>

                        {/* Line Items Table */}
                        {lines.length > 0 && (
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>System Qty</TableHead>
                                            <TableHead>Physical Qty</TableHead>
                                            <TableHead>Difference</TableHead>
                                            <TableHead>Unit Cost</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lines.map((line, index) => {
                                            const diff = line.physical_qty - line.system_qty;
                                            const value = diff * line.unit_cost;

                                            return (
                                                <TableRow key={index}>
                                                    <TableCell className="text-sm">{line.variant_name}</TableCell>
                                                    <TableCell className="font-mono text-sm">{line.sku}</TableCell>
                                                    <TableCell>{line.system_qty}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={line.physical_qty}
                                                            onChange={(e) => handleLineChange(index, 'physical_qty', Number(e.target.value))}
                                                            className="w-24"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}>
                                                            {diff > 0 ? '+' : ''}{diff}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={line.unit_cost}
                                                            onChange={(e) => handleLineChange(index, 'unit_cost', Number(e.target.value))}
                                                            className="w-28"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : ''}>
                                                            {formatCurrency(Math.abs(value))}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveLine(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Summary */}
                        {lines.length > 0 && (
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Total Surplus (Gain):</span>
                                    <span className="font-medium text-green-600">{formatCurrency(totalSurplus)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Total Shortage (Loss):</span>
                                    <span className="font-medium text-red-600">{formatCurrency(totalShortage)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                                    <span>Net Impact:</span>
                                    <span className={totalSurplus - totalShortage > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {formatCurrency(Math.abs(totalSurplus - totalShortage))}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createOpname.isPending || lines.length === 0}>
                                {createOpname.isPending ? 'Creating...' : 'Create Opname'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

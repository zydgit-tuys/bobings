import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, DollarSign, Calendar, CreditCard } from 'lucide-react';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useCustomerPayments, useCreateCustomerPayment, useCustomerOutstandingOrders } from '@/hooks/use-customer-payments';
import { useCustomers } from '@/hooks/use-customers';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { formatCurrency } from '@/lib/utils';

const paymentSchema = z.object({
    payment_date: z.string().min(1, 'Tanggal wajib diisi'),
    customer_id: z.string().min(1, 'Customer wajib dipilih'),
    amount: z.coerce.number().min(1, 'Amount harus lebih dari 0'),
    payment_method: z.enum(['cash', 'bank', 'giro']),
    bank_account_id: z.string().optional(),
    reference_no: z.string().optional(),
    notes: z.string().optional(),
}).refine((data) => {
    if (data.payment_method === 'bank' || data.payment_method === 'giro') {
        return !!data.bank_account_id;
    }
    return true;
}, {
    message: 'Bank account wajib dipilih untuk metode Bank/Giro',
    path: ['bank_account_id'],
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function CustomerPaymentsPage() {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        customerId: '',
        paymentMethod: '',
    });

    const { data: payments, isLoading } = useCustomerPayments(filters);
    const { data: customers } = useCustomers();

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Customer Payments
                            </CardTitle>
                            <CardDescription>
                                Manage customer payment receipts and allocations
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Payment
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
                            <label className="text-sm font-medium">Customer</label>
                            <Select
                                value={filters.customerId || "all"}
                                onValueChange={(value) => setFilters({ ...filters, customerId: value === "all" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Customers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Customers</SelectItem>
                                    {customers?.map((customer) => (
                                        <SelectItem key={customer.id} value={customer.id}>
                                            {customer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Payment Method</label>
                            <Select
                                value={filters.paymentMethod || "all"}
                                onValueChange={(value) => setFilters({ ...filters, paymentMethod: value === "all" ? "" : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Methods" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Methods</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                    <SelectItem value="giro">Giro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Payment No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Reference</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : payments && payments.length > 0 ? (
                                    payments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-mono">{payment.payment_no}</TableCell>
                                            <TableCell>{new Date(payment.payment_date).toLocaleDateString('id-ID')}</TableCell>
                                            <TableCell>
                                                {payment.customer_id || '-'}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {formatCurrency(payment.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                                    <CreditCard className="h-3 w-3" />
                                                    {payment.payment_method.toUpperCase()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {payment.reference_no || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No payments found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <CreatePaymentDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
            />
        </div>
    );
}

function CreatePaymentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [selectedOrders, setSelectedOrders] = useState<Record<string, number>>({});

    const form = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            payment_date: new Date().toISOString().split('T')[0],
            customer_id: '',
            amount: 0,
            payment_method: 'cash',
            bank_account_id: '',
            reference_no: '',
            notes: '',
        },
    });

    const createPayment = useCreateCustomerPayment();
    const { data: customers } = useCustomers();
    const { data: bankAccounts } = useBankAccounts();

    const selectedCustomerId = form.watch('customer_id');
    const paymentAmount = form.watch('amount');
    const paymentMethod = form.watch('payment_method');

    const { data: outstandingOrders } = useCustomerOutstandingOrders(selectedCustomerId);

    const totalAllocated = Object.values(selectedOrders).reduce((sum, amount) => sum + amount, 0);
    const remainingAmount = paymentAmount - totalAllocated;

    const handleOrderToggle = (orderId: string, maxAmount: number) => {
        setSelectedOrders(prev => {
            if (prev[orderId]) {
                const { [orderId]: _, ...rest } = prev;
                return rest;
            } else {
                const remaining = paymentAmount - Object.values(prev).reduce((sum, amt) => sum + amt, 0);
                return {
                    ...prev,
                    [orderId]: Math.min(maxAmount, remaining),
                };
            }
        });
    };

    const handleAllocationChange = (orderId: string, amount: number) => {
        setSelectedOrders(prev => ({
            ...prev,
            [orderId]: amount,
        }));
    };

    const onSubmit = async (data: PaymentFormData) => {
        const allocations = Object.entries(selectedOrders).map(([orderId, amount]) => ({
            sales_order_id: orderId,
            allocated_amount: amount,
        }));

        await createPayment.mutateAsync({
            payment_date: data.payment_date,
            customer_id: data.customer_id,
            amount: data.amount,
            payment_method: data.payment_method,
            bank_account_id: data.bank_account_id || null,
            reference_no: data.reference_no || null,
            notes: data.notes || null,
            allocations,
        });

        form.reset();
        setSelectedOrders({});
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Customer Payment</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Payment Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="payment_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Date *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="customer_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select customer" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {customers?.map((customer) => (
                                                    <SelectItem key={customer.id} value={customer.id}>
                                                        {customer.name} ({customer.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount *</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} min={0} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="payment_method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Method *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="bank">Bank Transfer</SelectItem>
                                                <SelectItem value="giro">Giro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {(paymentMethod === 'bank' || paymentMethod === 'giro') && (
                                <FormField
                                    control={form.control}
                                    name="bank_account_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bank Account *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select bank account" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {bankAccounts?.map((account) => (
                                                        <SelectItem key={account.id} value={account.id}>
                                                            {account.bank_name} - {account.account_number}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="reference_no"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reference No</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g., Transfer ID" />
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

                        {/* Allocation Section */}
                        {selectedCustomerId && outstandingOrders && outstandingOrders.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium">Allocate to Outstanding Orders</h3>
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Remaining: </span>
                                        <span className={remainingAmount < 0 ? 'text-destructive font-medium' : 'font-medium'}>
                                            {formatCurrency(remainingAmount)}
                                        </span>
                                    </div>
                                </div>

                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"></TableHead>
                                                <TableHead>Order No</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Total</TableHead>
                                                <TableHead>Outstanding</TableHead>
                                                <TableHead>Allocate</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {outstandingOrders.map((order) => (
                                                <TableRow key={order.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={!!selectedOrders[order.id]}
                                                            onCheckedChange={() => handleOrderToggle(order.id, order.outstanding_amount)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{order.order_no}</TableCell>
                                                    <TableCell>{new Date(order.order_date).toLocaleDateString('id-ID')}</TableCell>
                                                    <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                                                    <TableCell className="font-medium">{formatCurrency(order.outstanding_amount)}</TableCell>
                                                    <TableCell>
                                                        {selectedOrders[order.id] !== undefined && (
                                                            <Input
                                                                type="number"
                                                                value={selectedOrders[order.id]}
                                                                onChange={(e) => handleAllocationChange(order.id, Number(e.target.value))}
                                                                max={order.outstanding_amount}
                                                                min={0}
                                                                className="w-32"
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Payment Amount:</span>
                                <span className="font-medium">{formatCurrency(paymentAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Total Allocated:</span>
                                <span className="font-medium">{formatCurrency(totalAllocated)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold border-t pt-2">
                                <span>Remaining:</span>
                                <span className={remainingAmount < 0 ? 'text-destructive' : ''}>
                                    {formatCurrency(remainingAmount)}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createPayment.isPending || remainingAmount < 0}>
                                {createPayment.isPending ? 'Creating...' : 'Create Payment'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

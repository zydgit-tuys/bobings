import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient, useMutation } from "@tanstack/react-query";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this, or use Input
import { createSalesReturn, completeSalesReturn } from "@/lib/api/sales-returns";

interface SalesReturnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: any; // The full sales order object
}

const returnSchema = z.object({
    return_date: z.string(),
    reason: z.string().min(3, "Alasan wajib diisi"),
    is_credit_note: z.boolean().default(false),
    items: z.array(z.object({
        sales_order_line_id: z.string(),
        selected: z.boolean(),
        qty: z.coerce.number().min(1),
        max_qty: z.number(),
        unit_price: z.number(),
        sku: z.string(),
        name: z.string(),
    })).refine(items => items.some(item => item.selected), {
        message: "Pilih minimal satu barang untuk diretur",
        path: ["items"] // This might need adjustment based on how react-hook-form handles array errors
    })
});

export function SalesReturnDialog({ open, onOpenChange, order }: SalesReturnDialogProps) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        resolver: zodResolver(returnSchema),
        defaultValues: {
            return_date: new Date().toISOString().split('T')[0],
            reason: "",
            is_credit_note: false,
            items: order?.items?.map((item: any) => ({
                sales_order_line_id: item.id,
                selected: false,
                qty: 1,
                max_qty: item.qty, // Assuming item.qty is the sold qty.Ideally we subtract already returned qty.
                unit_price: item.unit_price,
                sku: item.sku_variant,
                name: item.product_name
            })) || []
        }
    });

    const createMutation = useMutation({
        mutationFn: createSalesReturn,
        onSuccess: async (data) => {
            // Immediately complete it for this flow? Or let them review?
            // User asked for "automatic", so let's try to complete it if it's draft.
            try {
                await completeSalesReturn(data.id);
                toast.success("Retur berhasil dibuat dan diproses");
                queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
                onOpenChange(false);
            } catch (e) {
                toast.success("Retur draft dibuat, tapi gagal memproses stok otomatis. Cek manual.");
            }
        },
        onError: (error: any) => {
            toast.error("Gagal membuat retur: " + error.message);
        }
    });

    const onSubmit = (data: any) => {
        const selectedItems = data.items.filter((i: any) => i.selected);

        if (selectedItems.length === 0) {
            toast.error("Pilih minimal satu barang");
            return;
        }

        // Validate Qty
        const invalidQty = selectedItems.find((i: any) => i.qty > i.max_qty);
        if (invalidQty) {
            toast.error(`Jumlah retur untuk ${invalidQty.sku} melebihi jumlah beli`);
            return;
        }

        createMutation.mutate({
            sales_order_id: order.id,
            return_date: data.return_date,
            reason: data.reason,
            is_credit_note: data.is_credit_note,
            lines: selectedItems.map((i: any) => ({
                sales_order_line_id: i.sales_order_line_id,
                qty: i.qty,
                unit_price: i.unit_price,
                notes: data.reason
            }))
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Retur Penjualan #{order?.desty_order_no}</DialogTitle>
                    <DialogDescription>
                        Pilih barang yang ingin diretur atau disesuaikan harganya (Credit Note).
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="return_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tanggal Retur</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alasan</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Produk cacat, salah kirim, potongan harga, dll" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Credit Note Toggle */}
                        <FormField
                            control={form.control}
                            name="is_credit_note"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">
                                            Credit Note (Tanpa Stok)
                                        </FormLabel>
                                        <div className="text-sm text-muted-foreground">
                                            Hanya koreksi nilai/potongan harga. Stok fisik TIDAK akan bertambah di gudang.
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="h-5 w-5"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="border rounded-md p-4 bg-muted/20">
                            <h4 className="mb-4 text-sm font-medium">Barang Pesanan</h4>
                            <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                                {form.watch("items").map((item: any, index: number) => (
                                    <div key={item.sales_order_line_id} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.selected`}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{item.sku} - {item.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Max: {item.max_qty} | Harga: Rp {item.unit_price?.toLocaleString()}
                                            </p>
                                        </div>

                                        {item.selected && (
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.qty`}
                                                render={({ field }) => (
                                                    <FormItem className="w-24">
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={item.max_qty}
                                                                {...field}
                                                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Proses {form.watch('is_credit_note') ? 'Credit Note' : 'Retur'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

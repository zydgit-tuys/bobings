import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Star, Search, X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { useProductSuppliers, useAddProductSupplier, useUpdateProductSupplier, useDeleteProductSupplier, useVariants } from "@/hooks/use-products";
import { useSuppliers } from "@/hooks/use-suppliers";
import { toast } from "sonner";
import { CustomSwitch } from "@/components/ui/custom-switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const productSupplierSchema = z.object({
    supplier_id: z.string().min(1, "Supplier is required"),
    variant_ids: z.array(z.string()).default([]),
    is_all_variants: z.boolean().default(false),
    purchase_price: z.coerce.number().min(0),
    is_preferred: z.boolean().default(false),
});

type ProductSupplierFormData = z.infer<typeof productSupplierSchema>;

interface ProductSuppliersProps {
    productId: string;
}

export function ProductSuppliers({ productId }: ProductSuppliersProps) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: productSuppliers, isLoading } = useProductSuppliers(productId);
    const { data: suppliers } = useSuppliers();
    const { data: variants } = useVariants(productId);

    const addSupplier = useAddProductSupplier();
    const updateSupplier = useUpdateProductSupplier();
    const deleteSupplier = useDeleteProductSupplier();

    const form = useForm<ProductSupplierFormData>({
        resolver: zodResolver(productSupplierSchema),
        defaultValues: {
            supplier_id: "",
            variant_ids: [],
            is_all_variants: false,
            purchase_price: 0,
            is_preferred: false,
        },
    });

    const onSubmit = async (data: ProductSupplierFormData) => {
        // Find Base Price (Variant ID = NULL) for this supplier
        const basePriceItem = productSuppliers?.find(ps =>
            ps.supplier_id === data.supplier_id && !ps.variant_id
        );
        const basePrice = basePriceItem?.purchase_price;

        if (editId) {
            // EDIT MODE
            // Optimization: If editing a specific variant and price matches base price, DELETE it to fall back to default
            if (!data.is_all_variants && basePrice !== undefined && Number(data.purchase_price) === Number(basePrice)) {
                if (window.confirm("Harga yang diinput sama dengan 'Harga Default/Base' (All Variants). Sistem akan menghapus pengaturan spesifik ini agar lebih efisien dan mengikuti harga default. Lanjutkan?")) {
                    deleteSupplier.mutate(editId, {
                        onSuccess: () => {
                            toast.info("Pengaturan spesifik dihapus. Varian ini sekarang mengikuti harga default.");
                            setOpen(false);
                            setEditId(null);
                            form.reset();
                        }
                    });
                    return;
                }
            }

            // Normal Update
            updateSupplier.mutate(
                { id: editId, data: { purchase_price: data.purchase_price, is_preferred: data.is_preferred } },
                { onSuccess: () => { setOpen(false); setEditId(null); form.reset(); } }
            );
        } else {
            // CREATE MODE
            const targets = data.is_all_variants ? [null] : data.variant_ids;

            if (targets.length === 0) {
                toast.error("Please select at least one variant or 'All Variants'");
                return;
            }

            try {
                let createdCount = 0;
                let skippedCount = 0;
                let optimizedCount = 0;

                for (const variantId of targets) {
                    // Check duplicate (Supplier + Variant)
                    const exists = productSuppliers?.some(ps =>
                        ps.supplier_id === data.supplier_id &&
                        (ps.variant_id || null) === variantId
                    );

                    if (exists) {
                        skippedCount++;
                        continue;
                    }

                    // Optimization: If specific variant price matches base price, SKIP creating
                    if (variantId !== null && basePrice !== undefined && Number(data.purchase_price) === Number(basePrice)) {
                        optimizedCount++;
                        continue;
                    }

                    await addSupplier.mutateAsync({
                        product_id: productId,
                        supplier_id: data.supplier_id,
                        variant_id: variantId,
                        purchase_price: data.purchase_price,
                        is_preferred: data.is_preferred,
                    });
                    createdCount++;
                }

                if (createdCount > 0) {
                    toast.success(`${createdCount} records created successfully`);
                }
                if (optimizedCount > 0) {
                    toast.info(`${optimizedCount} variants skipped (Match Base Price). Using default price to save DB space.`);
                }
                if (skippedCount > 0) {
                    toast.warning(`${skippedCount} variants skipped (already linked)`);
                }

                setOpen(false);
                form.reset();
            } catch (error: any) {
                toast.error(`Error: ${error.message}`);
            }
        }
    };

    const handleEdit = (item: any) => {
        setEditId(item.id);
        form.reset({
            supplier_id: item.supplier_id,
            variant_ids: item.variant_id ? [item.variant_id] : [],
            is_all_variants: !item.variant_id,
            purchase_price: item.purchase_price || 0,
            is_preferred: item.is_preferred || false,
        });
        setOpen(true);
    };

    const columns = [
        {
            key: "supplier_name",
            header: "Supplier",
            sortable: true,
            render: (item: any) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        {item.is_preferred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        <span className="font-medium">{item.supplier_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.supplier_code}</span>
                </div>
            )
        },
        {
            key: "variant_sku",
            header: "Variant",
            sortable: true,
            render: (item: any) => (
                <span className="text-sm">
                    {item.variant_sku ? (
                        item.variant_sku
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded textxs font-semibold border border-primary/20">
                                Base Price (Default)
                            </span>
                            <span className="text-xs text-muted-foreground italic">
                                - berlaku untuk varian lain
                            </span>
                        </div>
                    )}
                </span>
            )
        },
        {
            key: "purchase_price",
            header: "Purchase Price",
            sortable: true,
            render: (item: any) => (
                <span className="font-mono">
                    Rp {(item.purchase_price || 0).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            key: "actions",
            header: "",
            sortable: false,
            filterable: false,
            render: (item: any) => (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/purchases/new?supplier=${item.supplier_id}`);
                        }}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 active:scale-95 flex items-center gap-1 shadow-sm border-primary/20"
                    >
                        <ShoppingCart className="h-3 w-3" />
                        PO
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Remove this supplier connection?")) {
                                deleteSupplier.mutate(item.id);
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            )
        }
    ];

    const flattenedData = productSuppliers?.map(ps => ({
        ...ps,
        supplier_name: ps.suppliers?.name,
        supplier_code: ps.suppliers?.code,
        variant_sku: ps.product_variants?.sku_variant,
    })) ?? [];

    const filteredData = useMemo(() => {
        if (!searchQuery) return flattenedData;
        const query = searchQuery.toLowerCase();
        return flattenedData.filter(d =>
            d.supplier_name?.toLowerCase().includes(query) ||
            d.supplier_code?.toLowerCase().includes(query) ||
            d.variant_sku?.toLowerCase().includes(query)
        );
    }, [flattenedData, searchQuery]);

    return (
        <Card>
            <CardHeader className="p-3 md:p-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-sm md:text-base">Suppliers</CardTitle>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                className="h-8 pl-8 text-xs w-[150px] md:w-[200px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-8 w-8"
                                    onClick={() => setSearchQuery("")}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => {
                                        setEditId(null);
                                        form.reset();
                                    }}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    <span>Add</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md mx-2">
                                <DialogHeader>
                                    <DialogTitle className="text-base">{editId ? "Edit Supplier Price" : "Link Supplier"}</DialogTitle>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                                        {!editId && (
                                            <FormField
                                                control={form.control}
                                                name="supplier_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Select Supplier</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Choose supplier..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {suppliers?.map((supplier) => (
                                                                    <SelectItem key={supplier.id} value={supplier.id}>
                                                                        {supplier.name} ({supplier.code})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {!editId && (
                                            <div className="space-y-4">
                                                <FormField
                                                    control={form.control}
                                                    name="is_all_variants"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-sm">Apply to All Variants</FormLabel>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    Generic price for any size/color
                                                                </div>
                                                            </div>
                                                            <FormControl>
                                                                <CustomSwitch
                                                                    checked={field.value}
                                                                    onCheckedChange={(checked) => {
                                                                        field.onChange(checked);
                                                                        if (checked) form.setValue("variant_ids", []);
                                                                    }}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                {!form.watch("is_all_variants") && (
                                                    <FormField
                                                        control={form.control}
                                                        name="variant_ids"
                                                        render={() => {
                                                            const currentSupplierId = form.watch("supplier_id");
                                                            const linkedVariantIds = productSuppliers
                                                                ?.filter(ps => ps.supplier_id === currentSupplierId)
                                                                .map(ps => ps.variant_id)
                                                                .filter(Boolean) || [];

                                                            const availableVariants = variants?.filter(
                                                                v => !linkedVariantIds.includes(v.id)
                                                            );

                                                            if (!currentSupplierId) {
                                                                return (
                                                                    <div className="text-xs text-center py-4 border rounded-md text-muted-foreground italic">
                                                                        Silakan pilih Supplier terlebih dahulu
                                                                    </div>
                                                                );
                                                            }

                                                            if (availableVariants?.length === 0) {
                                                                return (
                                                                    <div className="text-xs text-center py-4 border rounded-md text-muted-foreground bg-slate-50">
                                                                        Semua varian sudah terhubung ke supplier ini
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <FormItem>
                                                                    <FormLabel className="text-sm">Select Varian (Bulk)</FormLabel>
                                                                    <div className="border rounded-md p-2">
                                                                        <ScrollArea className="h-[150px]">
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                {availableVariants?.map((variant) => (
                                                                                    <FormField
                                                                                        key={variant.id}
                                                                                        control={form.control}
                                                                                        name="variant_ids"
                                                                                        render={({ field }) => {
                                                                                            return (
                                                                                                <FormItem
                                                                                                    key={variant.id}
                                                                                                    className="flex flex-row items-start space-x-2 space-y-0"
                                                                                                >
                                                                                                    <FormControl>
                                                                                                        <Checkbox
                                                                                                            checked={field.value?.includes(variant.id)}
                                                                                                            onCheckedChange={(checked) => {
                                                                                                                return checked
                                                                                                                    ? field.onChange([...field.value, variant.id])
                                                                                                                    : field.onChange(
                                                                                                                        field.value?.filter(
                                                                                                                            (value) => value !== variant.id
                                                                                                                        )
                                                                                                                    );
                                                                                                            }}
                                                                                                        />
                                                                                                    </FormControl>
                                                                                                    <FormLabel className="text-xs font-normal">
                                                                                                        {variant.sku_variant}
                                                                                                    </FormLabel>
                                                                                                </FormItem>
                                                                                            );
                                                                                        }}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        </ScrollArea>
                                                                    </div>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            );
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <FormField
                                            control={form.control}
                                            name="purchase_price"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Purchase Price (Rp)</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} type="number" min={0} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="is_preferred"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base">Preferred Supplier</FormLabel>
                                                        <div className="text-sm text-muted-foreground">
                                                            Set as primary source
                                                        </div>
                                                    </div>
                                                    <FormControl>
                                                        <CustomSwitch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <Button type="submit" className="w-full">
                                            {editId ? "Update" : "Link Supplier"}
                                        </Button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-2 md:p-6 pt-0">
                <DataTable
                    columns={columns}
                    data={filteredData}
                    isLoading={isLoading}
                    emptyMessage={searchQuery ? "No matching suppliers/variants found." : "No suppliers linked yet."}
                    onRowClick={handleEdit}
                />
            </CardContent>
        </Card>
    );
}

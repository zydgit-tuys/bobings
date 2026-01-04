import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, History, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useSalesOrders, useCreateSalesOrder, useSalesOrder } from "@/hooks/use-sales";
import { useProducts } from "@/hooks/use-products";
import { useCustomers } from "@/hooks/use-customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PosProductGrid } from "./pos/PosProductGrid";
import { PosCart, CartItem } from "./pos/PosCart";
import { toast } from "sonner";
import { ProductVariant } from "@/types";
import { PosPaymentDialog, type PaymentData } from "./pos/PosPaymentDialog";
import { useEffect } from "react";
import { InvoiceTemplate } from "./pos/InvoiceTemplate";

export default function ManualSalesPage() {
    const [viewMode, setViewMode] = useState<'pos' | 'history'>('pos');
    const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

    // Data Hooks
    const { data: products, isLoading: isLoadingProducts } = useProducts();
    const { data: customers } = useCustomers();
    const { data: orders, isLoading: isLoadingOrders } = useSalesOrders({ marketplace: 'Offline' });
    const { data: printOrder } = useSalesOrder(printingOrderId || "");
    const createOrder = useCreateSalesOrder();

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("umum");
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

    // Dynamic Pricing Effect
    useEffect(() => {
        if (!products) return;

        const customer = customers?.find(c => c.id === selectedCustomerId);
        const useSpecialPrice = customer?.customer_type === 'khusus';

        setCart(prev => prev.map(item => {
            const variant = products.flatMap(p => p.variants).find(v => v.id === item.variant_id);
            if (!variant) return item;

            const newPrice = useSpecialPrice && (variant.harga_khusus ?? 0) > 0
                ? variant.harga_khusus ?? variant.price
                : variant.harga_jual_umum ?? variant.price;

            // Only update if price changed
            if (newPrice !== item.price) {
                return { ...item, price: newPrice };
            }
            return item;
        }));
    }, [selectedCustomerId, products, customers]);

    // Functions
    const handleAddToCart = (variant: ProductVariant) => {
        setCart(prev => {
            const existing = prev.find(item => item.variant_id === variant.id);
            if (existing) {
                // If adding same item, check stock
                if (existing.qty + 1 > variant.stock_qty) {
                    toast.error("Stok tidak mencukupi");
                    return prev;
                }
                return prev.map(item =>
                    item.variant_id === variant.id
                        ? { ...item, qty: item.qty + 1 }
                        : item
                );
            }

            // Add new item
            // For now, get product name from variant sku or parent lookup
            // Since we pass 'product' to card, maybe we can pass product name too
            // But variant doesn't have product name directly in type (only in join)
            // Ideally we pass full info.
            // Let's optimize: PosProductGrid has the product.
            // But onAddToCart only receives variant. 
            // We'll update onAddToCart signature in PosProductGrid/Card to pass product info too if needed 
            // OR find it here. 
            // Better: Let's find product here.
            const product = products?.find(p => p.id === variant.product_id);

            return [...prev, {
                variant_id: variant.id,
                product_name: product ? `${product.name} - ${variant.sku_variant}` : variant.sku_variant,
                sku: variant.sku_variant,
                price: selectedCustomerId !== 'umum' && customers?.find(c => c.id === selectedCustomerId)?.customer_type === 'khusus' && (variant.harga_khusus ?? 0) > 0
                    ? variant.harga_khusus ?? variant.price
                    : variant.harga_jual_umum ?? variant.price,
                qty: 1,
                stock: variant.stock_qty,
                hpp: variant.hpp ?? 0
            }];
        });
    };

    const handleUpdateQty = (variantId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.variant_id === variantId) {
                const newQty = item.qty + delta;
                if (newQty < 1) return item;
                if (newQty > item.stock) {
                    toast.error("Stok maks tercapai");
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const handleRemove = (variantId: string) => {
        setCart(prev => prev.filter(item => item.variant_id !== variantId));
    };

    const handleCheckoutClick = () => {
        if (cart.length === 0) return;
        setPaymentDialogOpen(true);
    };

    const handleConfirmPayment = async (data: PaymentData) => {
        const customer = customers?.find(c => c.id === selectedCustomerId);

        try {
            await createOrder.mutateAsync({
                order_date: new Date().toISOString().split('T')[0],
                status: 'completed',
                marketplace: 'Offline',
                customer_id: selectedCustomerId === 'umum' ? undefined : selectedCustomerId,
                customer_name: selectedCustomerId === 'umum' ? 'Umum' : customer?.name,
                // Logic based on requested accounting:
                // Gross Sales -> Cr Revenue.
                // Discount -> Dr Discount.
                // WE STORE GROSS in total_amount.
                // And we store discount in discount_amount.
                // So createOrder logic needs to handle this structure.
                // But wait, the previous createOrder logic calculates profit based on total_amount.
                // Let's pass the real values.

                // ISSUE: createSalesOrderInput doesn't have discount_amount yet (I need to update types).
                // But I added it to DB. I will update `src/lib/api/sales.ts` types next.
                // For now, let's assume I will update it.
                // Actually, I should pass the FULL GROSS amount as total_amount.
                total_amount: cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
                discount_amount: data.discountAmount,
                payment_method: data.paymentMethod,
                payment_account_id: data.paymentAccountId,
                paid_amount: data.paidAmount,
                notes: data.notes,

                total_fees: 0,
                items: cart.map(item => ({
                    variant_id: item.variant_id,
                    qty: item.qty,
                    unit_price: item.price,
                    hpp: item.hpp
                }))
            } as any); // Temporary cast until types updated

            setCart([]);
            setPaymentDialogOpen(false);
            // Success toast handled by hook
        } catch (error) {
            // Error handled by hook
        }
    };

    const handlePrintInvoice = (orderId: string) => {
        setPrintingOrderId(orderId);
    };

    // Trigger window.print when printOrder is loaded
    useEffect(() => {
        if (printOrder && printingOrderId) {
            // Wait for render
            setTimeout(() => {
                window.print();
                setPrintingOrderId(null);
            }, 500);
        }
    }, [printOrder, printingOrderId]);

    // --- RENDER HISTORY (Table) ---
    const columns = [
        { key: "desty_order_no", header: "No. Transaksi", primary: true },
        {
            key: "order_date",
            header: "Tanggal",
            render: (item: any) => format(new Date(item.order_date), "dd MMM yyyy"),
        },
        {
            key: "customer_name",
            header: "Pelanggan",
            render: (item: any) => (
                <div className="flex items-center gap-2">
                    {/* <User className="h-4 w-4 text-muted-foreground" /> */}
                    <span>{item.customer_name || "Umum"}</span>
                </div>
            )
        },
        {
            key: "status",
            header: "Status",
            render: (item: any) => <StatusBadge status={item.status} />,
        },
        {
            key: "payment_method",
            header: "Metode",
            render: (item: any) => (
                <span className="capitalize text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {item.payment_method || 'cash'}
                </span>
            )
        },
        {
            key: "total_amount",
            header: "Gross",
            render: (item: any) => (
                <span className="text-muted-foreground text-xs">
                    Rp {item.total_amount?.toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            key: "discount_amount",
            header: "Disc",
            render: (item: any) => (
                <span className="text-destructive text-xs">
                    {item.discount_amount > 0 ? `-Rp ${item.discount_amount.toLocaleString('id-ID')}` : '-'}
                </span>
            ),
        },
        {
            key: "net_total",
            header: "Total Net",
            render: (item: any) => {
                const netTotal = item.total_amount - (item.discount_amount || 0);
                return (
                    <span className="font-bold">
                        Rp {netTotal.toLocaleString('id-ID')}
                    </span>
                );
            }
        },
        {
            key: "actions",
            header: "",
            render: (item: any) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600"
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePrintInvoice(item.id);
                    }}
                >
                    <Printer className="h-4 w-4" />
                </Button>
            )
        }
    ];

    if (viewMode === 'history') {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>
                        <p className="text-muted-foreground">List penjualan offline yang sudah selesai.</p>
                    </div>
                    <Button variant="outline" onClick={() => setViewMode('pos')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kembali ke POS
                    </Button>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <DataTable
                            columns={columns}
                            data={orders ?? []}
                            isLoading={isLoadingOrders}
                            emptyMessage="Belum ada transaksi."
                            showFilters={true}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- RENDER POS ---
    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Point of Sale (POS)</h1>
                    <p className="text-muted-foreground text-sm">Mode Kasir Cepat</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setViewMode('history')}>
                        <History className="h-4 w-4 mr-2" />
                        Riwayat
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 pb-4">
                {/* Product Grid (Left) */}
                <div className="col-span-12 md:col-span-7 lg:col-span-8 h-full min-h-0 bg-card rounded-lg border p-4 shadow-sm">
                    {isLoadingProducts ? (
                        <div className="flex items-center justify-center h-full">Loading Produk...</div>
                    ) : (
                        <PosProductGrid
                            products={products || []}
                            onAddToCart={handleAddToCart}
                        />
                    )}
                </div>

                {/* Cart (Right) */}
                <div className="col-span-12 md:col-span-5 lg:col-span-4 h-full min-h-0">
                    <PosCart
                        items={cart}
                        onUpdateQty={handleUpdateQty}
                        onRemove={handleRemove}
                        onClear={() => setCart([])}
                        onCheckout={handleCheckoutClick}
                        customers={customers ?? []}
                        selectedCustomerId={selectedCustomerId}
                        onCustomerChange={setSelectedCustomerId}
                        isProcessing={false}
                    />
                </div>
            </div>

            <PosPaymentDialog
                open={paymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                totalAmount={cart.reduce((sum, item) => sum + (item.price * item.qty), 0)}
                customers={customers ?? []}
                selectedCustomerId={selectedCustomerId}
                onCustomerChange={setSelectedCustomerId}
                onConfirm={handleConfirmPayment}
            />

            {/* Hidden Print Area */}
            <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
                {printOrder && <InvoiceTemplate order={printOrder} />}
            </div>

            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print\\:block, .print\\:block * {
                        visibility: visible;
                    }
                    .print\\:block {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    @page {
                        margin: 0;
                        size: auto;
                    }
                }
            `}</style>
        </div>
    );
}


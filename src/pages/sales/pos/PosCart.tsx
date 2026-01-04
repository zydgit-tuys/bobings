
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingCart, User } from "lucide-react";
import { ProductVariant } from "@/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Simple Cart Item Type
export interface CartItem {
    variant_id: string;
    product_name: string;
    sku: string;
    price: number;
    qty: number;
    stock: number;
    hpp: number;
}

interface PosCartProps {
    items: CartItem[];
    onUpdateQty: (variantId: string, delta: number) => void;
    onRemove: (variantId: string) => void;
    onClear: () => void;
    onCheckout: () => void;
    customers: any[]; // Pass customers data
    selectedCustomerId: string;
    onCustomerChange: (id: string) => void;
    isProcessing: boolean;
}

export function PosCart({
    items,
    onUpdateQty,
    onRemove,
    onClear,
    onCheckout,
    customers,
    selectedCustomerId,
    onCustomerChange,
    isProcessing
}: PosCartProps) {

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

    return (
        <div className="flex flex-col h-full bg-card border rounded-lg shadow-sm overflow-hidden">
            {/* Header & Customer */}
            <div className="p-4 border-b space-y-3 bg-muted/20">
                <div className="flex items-center gap-2 font-semibold text-lg">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Keranjang Belanja</span>
                    <span className="ml-auto text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {totalQty} items
                    </span>
                </div>

                {/* Simple Customer Select */}
                <Select value={selectedCustomerId} onValueChange={onCustomerChange}>
                    <SelectTrigger className="w-full bg-background">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Pilih Customer (Umum)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="umum">Umum / Walk-in</SelectItem>
                        {customers?.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name} {c.customer_type === 'khusus' ? '(Khusus)' : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 p-4">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 opacity-50 py-10">
                        <ShoppingCart className="h-12 w-12" />
                        <p>Keranjang kosong</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.variant_id} className="flex gap-3">
                                {/* Qty Controls */}
                                <div className="flex flex-col items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 rounded-full"
                                        onClick={() => onUpdateQty(item.variant_id, 1)}
                                        disabled={item.qty >= item.stock}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 rounded-full"
                                        onClick={() => onUpdateQty(item.variant_id, -1)}
                                        disabled={item.qty <= 1}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                </div>

                                {/* Item Info */}
                                <div className="flex-1 space-y-1 py-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-medium leading-tight line-clamp-2">
                                            {item.product_name}
                                        </h4>
                                        <button
                                            onClick={() => onRemove(item.variant_id)}
                                            className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="text-xs text-muted-foreground">{item.sku}</div>
                                    <div className="flex justify-between items-center pt-1">
                                        <div className="text-xs text-muted-foreground">
                                            @{item.price.toLocaleString("id-ID")}
                                        </div>
                                        <div className="font-medium">
                                            Rp {(item.price * item.qty).toLocaleString("id-ID")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Footer Summary */}
            <div className="p-4 border-t bg-muted/20 space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>Rp {totalAmount.toLocaleString("id-ID")}</span>
                    </div>
                    {/* Discount placeholder */}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">Rp {totalAmount.toLocaleString("id-ID")}</span>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <Button
                        variant="outline"
                        className="col-span-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={onClear}
                        disabled={items.length === 0 || isProcessing}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        className="col-span-3 shadow-md"
                        size="lg"
                        onClick={onCheckout}
                        disabled={items.length === 0 || isProcessing}
                    >
                        {isProcessing ? "Processing..." : "Bayar / Checkout"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

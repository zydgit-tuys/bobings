import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface InvoiceTemplateProps {
    order: any;
}

export function InvoiceTemplate({ order }: InvoiceTemplateProps) {
    if (!order) return null;

    const netTotal = order.total_amount - (order.discount_amount || 0);

    return (
        <div className="bg-white text-black p-4 w-[80mm] mx-auto font-mono text-xs leading-tight print:w-full print:p-0">
            {/* Header */}
            <div className="text-center space-y-1 mb-4">
                <h1 className="text-lg font-bold uppercase tracking-wider">Ziyada Sport</h1>
                <p>Jl. Contoh No. 123, Jakarta</p>
                <p>Telp: 0812-3456-7890</p>
            </div>

            <Separator className="border-black border-dashed mb-2" />

            {/* Order Info */}
            <div className="space-y-1 mb-3">
                <div className="flex justify-between">
                    <span>No: {order.desty_order_no}</span>
                    <span>{format(new Date(order.order_date), "dd/MM/yy HH:mm")}</span>
                </div>
                <div>Kasir: Admin</div>
                <div>Pelanggan: {order.customer_name || "Umum"}</div>
            </div>

            <Separator className="border-black border-dashed mb-2" />

            {/* Items */}
            <div className="space-y-2 mb-4">
                {order.order_items?.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                        <div className="font-bold uppercase truncate">{item.product_name || "Produk"}</div>
                        <div className="flex justify-between pl-2">
                            <span>{item.qty} x {item.unit_price?.toLocaleString('id-ID')}</span>
                            <span>{(item.qty * item.unit_price)?.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>

            <Separator className="border-black border-dashed mb-2" />

            {/* Totals */}
            <div className="space-y-1 mb-4">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp {order.total_amount?.toLocaleString('id-ID')}</span>
                </div>
                {order.discount_amount > 0 && (
                    <div className="flex justify-between">
                        <span>Diskon:</span>
                        <span>-Rp {order.discount_amount?.toLocaleString('id-ID')}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1">
                    <span>TOTAL:</span>
                    <span>Rp {netTotal?.toLocaleString('id-ID')}</span>
                </div>
            </div>

            <Separator className="border-black border-dashed mb-2" />

            {/* Payment Method */}
            <div className="mb-6">
                <div className="flex justify-between uppercase">
                    <span>Metode:</span>
                    <span>{order.payment_method === 'bank' ? 'TRANSFER' : 'TUNAI'}</span>
                </div>
                {order.notes && (
                    <div className="text-[10px] mt-1 text-gray-600">
                        {order.notes}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center space-y-1 mt-4">
                <p className="font-bold">TERIMA KASIH</p>
                <p>Selamat Datang Kembali!</p>
                <div className="mt-4 pt-4 border-t border-dashed border-gray-300 print:hidden text-[10px] text-gray-400">
                    Sistem Kasir by ZydGit
                </div>
            </div>
        </div>
    );
}

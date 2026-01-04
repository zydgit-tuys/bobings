import { useState } from "react";
import { format } from "date-fns";
import { usePayouts, useCreatePayout, useConfirmPayout } from "@/hooks/use-marketplace-payouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

// Simplified Bank Selection (In real app, fetch from accounts)
const BANK_ACCOUNTS = [
    { id: 'acc_bank_bca', name: 'Bank BCA' }, // Placeholder, needs real UUIDs usually
];

export default function MarketplacePayoutsPage() {
    const { data: payouts, isLoading } = usePayouts();
    const createPayout = useCreatePayout();
    const confirmPayout = useConfirmPayout();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<any>(null);

    // Create Form State
    const [marketplace, setMarketplace] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Confirm Form State
    const [bankAccountId, setBankAccountId] = useState("");

    const handleCreate = async () => {
        if (!marketplace || !startDate || !endDate) {
            toast.error("Please fill all fields");
            return;
        }
        try {
            await createPayout.mutateAsync({ marketplace, start_date: startDate, end_date: endDate });
            setIsCreateOpen(false);
            // Reset form
            setMarketplace("");
            setStartDate("");
            setEndDate("");
        } catch (e) { }
    };

    const handleConfirm = async () => {
        if (!selectedPayout || !bankAccountId) return;
        try {
            // In real implementation, we need valid UUIDs for accounts. 
            // Ideally fetch from useAccounts where type='bank'.
            // For now, we assume user inputs a valid UUID or we pick from a list.
            // Let's create a temporary input for UUID if needed or just hardcode for demo if BANK_ACCOUNTS empty.

            await confirmPayout.mutateAsync({
                payoutId: selectedPayout.id,
                bankAccountId
            });
            setIsConfirmOpen(false);
            setSelectedPayout(null);
        } catch (e) { }
    };

    const columns = [
        { key: "payout_no", header: "Payout No", primary: true },
        { key: "marketplace", header: "Marketplace" },
        {
            key: "period",
            header: "Periode",
            render: (row: any) => `${format(new Date(row.start_date), 'dd/MM/yy')} - ${format(new Date(row.end_date), 'dd/MM/yy')}`
        },
        { key: "total_orders", header: "Orders" },
        {
            key: "total_amount",
            header: "Net Amount",
            render: (row: any) => `Rp ${Number(row.total_amount).toLocaleString('id-ID')}`
        },
        {
            key: "status",
            header: "Status",
            render: (row: any) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${row.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {row.status.toUpperCase()}
                </span>
            )
        },
        {
            key: "actions",
            header: "",
            render: (row: any) => (
                row.status === 'draft' ? (
                    <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayout(row);
                            setIsConfirmOpen(true);
                        }}
                    >
                        Confirm
                    </Button>
                ) : null
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Marketplace Payouts"
                description="Settlement & Pencairan Dana Marketplace"
                action={
                    <Button onClick={() => setIsCreateOpen(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Buat Payout
                    </Button>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Payout</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={payouts || []}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buat Payout Baru</DialogTitle>
                        <DialogDescription>Gabungkan order yang sudah selesai menjadi satu settlement.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Marketplace</Label>
                            <Select value={marketplace} onValueChange={setMarketplace}>
                                <SelectTrigger><SelectValue placeholder="Pilih Marketplace" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Shopee">Shopee</SelectItem>
                                    <SelectItem value="Tokopedia">Tokopedia</SelectItem>
                                    <SelectItem value="TikTok">TikTok</SelectItem>
                                    <SelectItem value="Lazada">Lazada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dari Tanggal</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Sampai Tanggal</Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                        <Button onClick={handleCreate} disabled={createPayout.isPending}>
                            {createPayout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Draft
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pencairan</DialogTitle>
                        <DialogDescription>
                            Dana sebesar <b>Rp {selectedPayout?.total_amount?.toLocaleString('id-ID')}</b> akan dicatat masuk ke Bank.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Masuk ke Akun Bank *</Label>
                            <Select value={bankAccountId} onValueChange={setBankAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih rekening bank" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* TODO: Replace with useBankAccounts hook */}
                                    <SelectItem value="temp-bank-1">Bank BCA - 1234567890</SelectItem>
                                    <SelectItem value="temp-bank-2">Bank Mandiri - 0987654321</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Pilih rekening bank tujuan pencairan dana marketplace
                            </p>
                        </div>

                        {/* Payout Details */}
                        {selectedPayout && (
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Payout No:</span>
                                    <span className="font-mono">{selectedPayout.payout_no}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Marketplace:</span>
                                    <span className="font-medium">{selectedPayout.marketplace}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Total Orders:</span>
                                    <span className="font-medium">{selectedPayout.total_orders}</span>
                                </div>
                                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                                    <span>Net Amount:</span>
                                    <span>Rp {selectedPayout.total_amount?.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Batal</Button>
                        <Button onClick={handleConfirm} disabled={confirmPayout.isPending || !bankAccountId}>
                            {confirmPayout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Konfirmasi & Jurnal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

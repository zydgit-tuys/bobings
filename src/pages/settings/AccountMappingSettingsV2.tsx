import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import {
    useJournalAccountMappings,
    useToggleMappingActive,
    useDeleteJournalAccountMapping,
} from "@/hooks/use-journal-mappings";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Event type labels for better UX
const EVENT_TYPE_LABELS: Record<string, string> = {
    confirm_purchase: "Penerimaan Barang (Purchase)",
    confirm_return_purchase: "Retur Pembelian",
    confirm_sales_order: "Pengiriman Barang (Sales)",
    credit_note: "Retur Penjualan",
    stock_adjustment: "Penyesuaian Stok",
    stock_opname: "Stock Opname",
    customer_payment: "Pembayaran Customer",
};

const CONTEXT_LABELS: Record<string, string> = {
    increase: "Tambah",
    decrease: "Kurang",
    cash: "Tunai",
    bank: "Transfer",
    manual: "Manual/Offline",
    marketplace: "Marketplace",
};

export function AccountMappingSettingsV2() {
    const { data: mappings, isLoading } = useJournalAccountMappings();
    const toggleMutation = useToggleMappingActive();
    const deleteMutation = useDeleteJournalAccountMapping();

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await toggleMutation.mutateAsync({ id, isActive: !currentStatus });
            toast.success(currentStatus ? "Mapping dinonaktifkan" : "Mapping diaktifkan");
        } catch (error) {
            toast.error("Gagal mengubah status mapping");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            await deleteMutation.mutateAsync(deleteId);
            toast.success("Mapping berhasil dihapus");
            setDeleteId(null);
        } catch (error) {
            toast.error("Gagal menghapus mapping");
        }
    };

    // Group mappings by event_type
    const groupedMappings = mappings?.reduce((acc, mapping) => {
        const key = mapping.event_type;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(mapping);
        return acc;
    }, {} as Record<string, typeof mappings>);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Mapping Akun V2 (Event-Driven)</h3>
                        <p className="text-sm text-muted-foreground">
                            Konfigurasi akun berdasarkan event type dan context untuk auto-journaling
                        </p>
                    </div>
                    <Button size="sm" disabled>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Mapping
                    </Button>
                </div>

                {/* Info Card */}
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium text-blue-900">
                                    ℹ️ Tentang V2 Mapping
                                </p>
                                <p className="text-xs text-blue-700">
                                    V2 menggunakan sistem event-driven yang lebih fleksibel. Setiap event (seperti penerimaan barang, penjualan, dll)
                                    dapat memiliki mapping akun yang berbeda berdasarkan context (manual, marketplace, dll).
                                </p>
                                <p className="text-xs text-blue-700 mt-2">
                                    <strong>Priority:</strong> Semakin tinggi nilai priority, semakin diprioritaskan saat ada multiple matches.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Mappings by Event Type */}
                {groupedMappings && Object.entries(groupedMappings).map(([eventType, eventMappings]) => (
                    <Card key={eventType}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                {EVENT_TYPE_LABELS[eventType] || eventType}
                                <Badge variant="outline" className="ml-2">
                                    {eventMappings.length} mapping(s)
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Event: <code className="text-xs bg-muted px-1 py-0.5 rounded">{eventType}</code>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Context</TableHead>
                                        <TableHead className="w-[80px]">Side</TableHead>
                                        <TableHead>Akun</TableHead>
                                        <TableHead className="w-[80px] text-center">Priority</TableHead>
                                        <TableHead className="w-[80px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eventMappings.map((mapping) => (
                                        <TableRow key={mapping.id} className={!mapping.is_active ? "opacity-50" : ""}>
                                            <TableCell className="font-mono text-xs">
                                                {mapping.event_context ? (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {CONTEXT_LABELS[mapping.event_context] || mapping.event_context}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={mapping.side === 'debit' ? 'default' : 'outline'} className="text-xs">
                                                    {mapping.side === 'debit' ? 'Debit' : 'Credit'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {mapping.account ? (
                                                    <div>
                                                        <div className="text-sm">{mapping.account.code} - {mapping.account.name}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Akun tidak ditemukan</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {mapping.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {mapping.is_active ? (
                                                    <Badge variant="default" className="bg-green-600 text-xs">
                                                        Aktif
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Nonaktif
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => handleToggleActive(mapping.id, mapping.is_active)}
                                                        disabled={toggleMutation.isPending}
                                                    >
                                                        {mapping.is_active ? (
                                                            <PowerOff className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Power className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        disabled
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive"
                                                        onClick={() => setDeleteId(mapping.id)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}

                {/* Empty State */}
                {(!mappings || mappings.length === 0) && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                            <p className="text-muted-foreground mb-4">
                                Belum ada mapping akun yang dikonfigurasi
                            </p>
                            <Button size="sm" disabled>
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah Mapping Pertama
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Mapping?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Mapping ini akan dihapus permanen. Edge Functions akan fallback ke mapping lain atau V1 settings.
                            Yakin ingin melanjutkan?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

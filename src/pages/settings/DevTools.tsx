import { useState } from "react";
import { AlertTriangle, Trash2, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataCounts, useResetTransactionalData } from "@/hooks/use-dev-tools";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DevTools() {
    const { data: counts, isLoading } = useDataCounts();
    const resetData = useResetTransactionalData();

    const [showFirstConfirm, setShowFirstConfirm] = useState(false);
    const [showSecondConfirm, setShowSecondConfirm] = useState(false);
    const [understood, setUnderstood] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const handleResetClick = () => {
        setShowFirstConfirm(true);
        setUnderstood(false);
    };

    const handleFirstConfirm = () => {
        if (!understood) return;
        setShowFirstConfirm(false);
        setShowSecondConfirm(true);
        setConfirmText("");
    };

    const handleSecondConfirm = async () => {
        if (confirmText !== "RESET") return;

        await resetData.mutateAsync();

        setShowSecondConfirm(false);
        setConfirmText("");
        setUnderstood(false);
    };

    const handleCancel = () => {
        setShowFirstConfirm(false);
        setShowSecondConfirm(false);
        setConfirmText("");
        setUnderstood(false);
    };

    return (
        <div className="space-y-6">
            {/* Warning Banner */}
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Development Tools - Use with Caution</AlertTitle>
                <AlertDescription>
                    Fitur ini hanya untuk development dan testing. Operasi di bawah ini bersifat destruktif dan tidak dapat dibatalkan.
                </AlertDescription>
            </Alert>

            {/* Data Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Data Overview
                    </CardTitle>
                    <CardDescription>
                        Jumlah data transaksional saat ini
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Loading...
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">{counts?.salesOrders || 0}</div>
                                <div className="text-sm text-muted-foreground">Sales Orders</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">{counts?.purchases || 0}</div>
                                <div className="text-sm text-muted-foreground">Purchases</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold">{counts?.journalEntries || 0}</div>
                                <div className="text-sm text-muted-foreground">Journal Entries</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reset Data Section */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Reset Transactional Data
                    </CardTitle>
                    <CardDescription>
                        Hapus semua data transaksi (sales, purchases, journals) dan reset stok ke nilai awal.
                        Master data (produk, customer, supplier, CoA) akan tetap ada.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="destructive"
                        onClick={handleResetClick}
                        disabled={resetData.isPending}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset All Data
                    </Button>
                </CardContent>
            </Card>

            {/* First Confirmation Dialog */}
            <Dialog open={showFirstConfirm} onOpenChange={setShowFirstConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Konfirmasi Reset Data
                        </DialogTitle>
                        <DialogDescription>
                            Operasi ini akan menghapus SEMUA data transaksi:
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-4">
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Sales Orders & Items</li>
                            <li>Purchase Orders & Lines</li>
                            <li>Purchase Returns</li>
                            <li>Journal Entries & Lines</li>
                            <li>Stock Movements</li>
                        </ul>

                        <div className="pt-4 border-t">
                            <div className="flex items-start space-x-2">
                                <Checkbox
                                    id="understand"
                                    checked={understood}
                                    onCheckedChange={(checked) => setUnderstood(checked === true)}
                                />
                                <label
                                    htmlFor="understand"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Saya mengerti bahwa ini akan menghapus semua data transaksi dan tidak dapat dibatalkan
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleFirstConfirm}
                            disabled={!understood}
                        >
                            Lanjutkan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Second Confirmation Dialog */}
            <Dialog open={showSecondConfirm} onOpenChange={setShowSecondConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Konfirmasi Akhir
                        </DialogTitle>
                        <DialogDescription>
                            Untuk melanjutkan, ketik <strong>RESET</strong> di bawah ini
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="confirm-text">Ketik "RESET" untuk konfirmasi</Label>
                            <Input
                                id="confirm-text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="RESET"
                                className="font-mono"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleSecondConfirm}
                            disabled={confirmText !== "RESET" || resetData.isPending}
                        >
                            {resetData.isPending ? "Mereset..." : "Reset Data"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

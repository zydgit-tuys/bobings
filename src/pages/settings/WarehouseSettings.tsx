import { useState } from "react";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from "@/hooks/use-warehouses";
import { Skeleton } from "@/components/ui/skeleton";

interface WarehouseFormData {
    code: string;
    name: string;
    address: string;
    is_active: boolean;
    is_default: boolean;
}

export function WarehouseSettings() {
    const [showDialog, setShowDialog] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
    const [formData, setFormData] = useState<WarehouseFormData>({
        code: "",
        name: "",
        address: "",
        is_active: true,
        is_default: false,
    });

    const { data: warehouses, isLoading } = useWarehouses();
    const createWarehouse = useCreateWarehouse();
    const updateWarehouse = useUpdateWarehouse();
    const deleteWarehouse = useDeleteWarehouse();

    const handleOpenDialog = (warehouse?: any) => {
        if (warehouse) {
            setEditingWarehouse(warehouse);
            setFormData({
                code: warehouse.code,
                name: warehouse.name,
                address: warehouse.address || "",
                is_active: warehouse.is_active,
                is_default: warehouse.is_default,
            });
        } else {
            setEditingWarehouse(null);
            setFormData({
                code: "",
                name: "",
                address: "",
                is_active: true,
                is_default: false,
            });
        }
        setShowDialog(true);
    };

    const handleSubmit = async () => {
        if (editingWarehouse) {
            await updateWarehouse.mutateAsync({
                id: editingWarehouse.id,
                updates: formData,
            });
        } else {
            await createWarehouse.mutateAsync(formData);
        }
        setShowDialog(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Yakin ingin menghapus gudang ini?")) {
            await deleteWarehouse.mutateAsync(id);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    const isSingleWarehouse = warehouses && warehouses.length === 1;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Manajemen Gudang
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {isSingleWarehouse
                                    ? "Mode: Single Warehouse"
                                    : `Mode: Multi Warehouse (${warehouses?.length || 0} gudang)`}
                            </p>
                        </div>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Gudang
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kode</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Alamat</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {warehouses?.map((warehouse) => (
                                <TableRow key={warehouse.id}>
                                    <TableCell className="font-medium">{warehouse.code}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {warehouse.name}
                                            {warehouse.is_default && (
                                                <Badge variant="default" className="text-xs">
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {warehouse.address || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                                            {warehouse.is_active ? "Aktif" : "Nonaktif"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenDialog(warehouse)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(warehouse.id)}
                                            disabled={warehouse.is_default}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {warehouses?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        Belum ada gudang. Klik "Tambah Gudang" untuk memulai.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingWarehouse ? "Edit Gudang" : "Tambah Gudang"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingWarehouse
                                ? "Update informasi gudang"
                                : "Tambahkan gudang baru ke sistem"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Kode Gudang</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="WH-001"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Gudang</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Gudang Utama"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Alamat</Label>
                            <Textarea
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Alamat lengkap gudang"
                                rows={3}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_active">Status Aktif</Label>
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_active: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_default">Gudang Default</Label>
                            <Switch
                                id="is_default"
                                checked={formData.is_default}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_default: checked })
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!formData.code || !formData.name}
                        >
                            {editingWarehouse ? "Update" : "Simpan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

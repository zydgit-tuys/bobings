import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { MobileCardList } from "@/components/shared/MobileCardList";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit } from "@/hooks/use-units";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

export function UnitList() {
    const isMobile = useIsMobile();
    const { data: units, isLoading } = useUnits();
    const createUnit = useCreateUnit();
    const updateUnit = useUpdateUnit();
    const deleteUnit = useDeleteUnit();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<any>(null);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        symbol: "",
        is_active: true,
    });
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const columns = [
        { key: "code", header: "Code", primary: true },
        { key: "name", header: "Name" },
        { key: "symbol", header: "Symbol" },
        {
            key: "is_active",
            header: "Status",
            render: (item: any) => (
                <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            key: "created_at",
            header: "Created",
            render: (item: any) => new Date(item.created_at).toLocaleDateString("id-ID"),
        },
        {
            key: "updated_at",
            header: "Last Updated",
            render: (item: any) => new Date(item.updated_at).toLocaleDateString("id-ID"),
        },
        {
            key: "actions",
            header: "",
            render: (item: any) => (
                <div className="flex gap-2 justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                        }}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(item.id);
                        }}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ];

    const handleEdit = (unit: any) => {
        setEditingUnit(unit);
        setFormData({
            code: unit.code,
            name: unit.name,
            symbol: unit.symbol || "",
            is_active: unit.is_active,
        });
        setDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingUnit(null);
        setFormData({
            code: "",
            name: "",
            symbol: "",
            is_active: true,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.code.trim() || !formData.name.trim()) {
            toast.error("Code and Name are required");
            return;
        }

        try {
            if (editingUnit) {
                await updateUnit.mutateAsync({
                    id: editingUnit.id,
                    data: {
                        name: formData.name.trim(),
                        symbol: formData.symbol.trim() || null,
                        is_active: formData.is_active,
                    }
                });
            } else {
                await createUnit.mutateAsync({
                    code: formData.code.trim().toUpperCase(),
                    name: formData.name.trim(),
                    symbol: formData.symbol.trim() || undefined,
                    is_active: formData.is_active,
                });
            }
            setDialogOpen(false);
        } catch (error: any) {
            // Error handled by hook, but we catch here to prevent dialog closing on error if needed
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteUnit.mutateAsync(deleteId);
            setDeleteId(null);
        } catch (error) {
            console.error(error);
        }
    };

    const renderUnitCard = (unit: any) => (
        <div className="p-4">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{unit.code}</p>
                        {unit.symbol && (
                            <span className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                {unit.symbol}
                            </span>
                        )}
                    </div>
                    <p className="font-medium text-foreground">{unit.name}</p>
                </div>
                <Badge variant={unit.is_active ? "default" : "secondary"}>
                    {unit.is_active ? "Active" : "Inactive"}
                </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
                Created: {new Date(unit.created_at).toLocaleDateString("id-ID")}
            </p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Unit
                </Button>
            </div>

            {isMobile ? (
                <MobileCardList
                    data={units ?? []}
                    isLoading={isLoading}
                    emptyMessage="No units found."
                    renderCard={renderUnitCard}
                    leftActions={[
                        {
                            icon: <Pencil className="h-5 w-5" />,
                            label: "Edit",
                            onClick: handleEdit,
                        },
                    ]}
                    rightActions={[
                        {
                            icon: <Trash2 className="h-5 w-5" />,
                            label: "Delete",
                            onClick: (item) => setDeleteId(item.id),
                            variant: "destructive",
                        },
                    ]}
                />
            ) : (
                <DataTable
                    columns={columns}
                    data={units ?? []}
                    isLoading={isLoading}
                    emptyMessage="No units found."
                />
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUnit ? "Edit Unit" : "Add Unit"}</DialogTitle>
                        <DialogDescription>
                            {editingUnit ? "Perbarui informasi satuan ukuran produk." : "Tambahkan satuan ukuran produk baru (mis: PCS, BOX)."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Unit Code (ex: PCS, BOX)</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g., PCS"
                                disabled={!!editingUnit}
                            />
                            {editingUnit && <p className="text-xs text-muted-foreground">Code cannot be changed.</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Unit Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Pieces"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="symbol">Symbol (Optional)</Label>
                            <Input
                                id="symbol"
                                value={formData.symbol}
                                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                                placeholder="e.g., pcs"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isActive"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label htmlFor="isActive">Active Status</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={createUnit.isPending || updateUnit.isPending}>
                            {createUnit.isPending || updateUnit.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Unit"
                description="Are you sure you want to delete this unit? This might affect products using this unit."
                onConfirm={handleDelete}
            />
        </div>
    );
}

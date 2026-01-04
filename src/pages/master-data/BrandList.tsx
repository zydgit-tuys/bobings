import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { MobileCardList } from "@/components/shared/MobileCardList";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
import { useBrands, useCreateBrand, useUpdateBrand } from "@/hooks/use-products";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function BrandList() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: brands, isLoading } = useBrands();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", is_active: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    { key: "name", header: "Brand Name" },
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

  const handleEdit = (brand: any) => {
    setEditingBrand(brand);
    setFormData({ name: brand.name, is_active: brand.is_active });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingBrand(null);
    setFormData({ name: "", is_active: true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    try {
      if (editingBrand) {
        await updateBrand.mutateAsync({
          id: editingBrand.id,
          data: { name: formData.name.trim(), is_active: formData.is_active }
        });
      } else {
        await createBrand.mutateAsync({
          name: formData.name.trim(),
          is_active: formData.is_active
        });
      }
      setDialogOpen(false);
    } catch (error: any) {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await updateBrand.mutateAsync({
        id: deleteId,
        data: { is_active: false }
      });
      setDeleteId(null);
    } catch (error: any) {
      // Error handled by hook
    }
  };

  const renderBrandCard = (brand: any) => (
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-foreground">{brand.name}</p>
          <p className="text-sm text-muted-foreground">
            Created: {new Date(brand.created_at).toLocaleDateString("id-ID")}
          </p>
        </div>
        <Badge variant={brand.is_active ? "default" : "secondary"}>
          {brand.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
          <Plus className="h-4 w-4 mr-2" />
          Add Brand
        </Button>
      </div>

      {isMobile ? (
        <MobileCardList
          data={brands ?? []}
          isLoading={isLoading}
          emptyMessage="No brands found."
          renderCard={renderBrandCard}
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
          data={brands ?? []}
          isLoading={isLoading}
          emptyMessage="No brands found."
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "Add Brand"}</DialogTitle>
            <DialogDescription>
              {editingBrand ? "Perbarui informasi brand yang sudah ada." : "Tambahkan brand produk baru ke sistem."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter brand name"
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
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Brand"
        description="Are you sure you want to delete this brand?"
        onConfirm={handleDelete}
      />
    </div>
  );
}

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { MobileCardList } from "@/components/shared/MobileCardList";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBrands, useCreateBrand } from "@/hooks/use-products";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [brandName, setBrandName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    { key: "name", header: "Brand Name" },
    {
      key: "created_at",
      header: "Created",
      render: (item: any) => new Date(item.created_at).toLocaleDateString("id-ID"),
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
    setBrandName(brand.name);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingBrand(null);
    setBrandName("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!brandName.trim()) {
      toast.error("Brand name is required");
      return;
    }

    try {
      if (editingBrand) {
        const { error } = await supabase
          .from("brands")
          .update({ name: brandName.trim() })
          .eq("id", editingBrand.id);
        if (error) throw error;
        toast.success("Brand updated");
      } else {
        await createBrand.mutateAsync(brandName.trim());
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("brands")
        .update({ is_active: false })
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("Brand deleted");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const renderBrandCard = (brand: any) => (
    <div className="p-4">
      <p className="font-medium text-foreground">{brand.name}</p>
      <p className="text-sm text-muted-foreground">
        Created: {new Date(brand.created_at).toLocaleDateString("id-ID")}
      </p>
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
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Enter brand name"
              />
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

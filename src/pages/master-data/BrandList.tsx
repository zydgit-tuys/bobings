import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
  const queryClient = useQueryClient();
  const { data: brands, isLoading } = useBrands();
  const createBrand = useCreateBrand();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [brandName, setBrandName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredBrands = (brands ?? []).filter((b: any) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: "name", header: "Brand Name", primary: true },
    {
      key: "created_at",
      header: "Created",
      hideOnMobile: true,
      render: (item: any) => new Date(item.created_at).toLocaleDateString("id-ID"),
    },
    {
      key: "actions",
      header: "",
      render: (item: any) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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

  const mobileCardRender = (brand: any) => (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{brand.name}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(brand.created_at).toLocaleDateString("id-ID")}
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(brand);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteId(brand.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Tambah</span>
          <span className="sm:hidden">+</span>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredBrands}
        isLoading={isLoading}
        emptyMessage="No brands found."
        onRowClick={handleEdit}
        mobileCardRender={mobileCardRender}
      />

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

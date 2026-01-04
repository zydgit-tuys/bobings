import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { MobileCardList } from "@/components/shared/MobileCardList";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
import { useCategories, useCreateCategory, useUpdateCategory } from "@/hooks/use-products";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function CategoryList() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryName, setCategoryName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "-";
    const parent = categories?.find((c: any) => c.id === parentId);
    return parent?.name ?? "-";
  };

  const columns = [
    { key: "name", header: "Category Name" },
    {
      key: "parent_id",
      header: "Parent",
      render: (item: any) => getParentName(item.parent_id),
    },
    { key: "level", header: "Level" },
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

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setParentId(category.parent_id);
    setIsActive(category.is_active);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setCategoryName("");
    setParentId(null);
    setIsActive(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const parentCategory = parentId ? categories?.find((c: any) => c.id === parentId) : null;
    const level = parentCategory ? parentCategory.level + 1 : 1;

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          data: {
            name: categoryName.trim(),
            parent_id: parentId,
            level,
            is_active: isActive
          }
        });
      } else {
        await createCategory.mutateAsync({
          name: categoryName.trim(),
          parent_id: parentId ?? undefined,
          level,
          is_active: isActive
        });
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await updateCategory.mutateAsync({
        id: deleteId,
        data: { is_active: false }
      });
      setDeleteId(null);
    } catch (error: any) {
      // Error handled by hook
    } finally {
      // no-op
    }
  };

  const renderCategoryCard = (category: any) => (
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-foreground">{category.name}</p>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            <span>Parent: {getParentName(category.parent_id)}</span>
            <span>Level: {category.level}</span>
          </div>
        </div>
        <Badge variant={category.is_active ? "default" : "secondary"}>
          {category.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {isMobile ? (
        <MobileCardList
          data={categories ?? []}
          isLoading={isLoading}
          emptyMessage="No categories found."
          renderCard={renderCategoryCard}
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
          data={categories ?? []}
          isLoading={isLoading}
          emptyMessage="No categories found."
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Ubah kategori untuk mengelompokkan produk Anda." : "Buat kategori baru untuk manajemen produk."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
              <Select
                value={parentId ?? "none"}
                onValueChange={(value) => setParentId(value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent</SelectItem>
                  {categories
                    ?.filter((c: any) => c.id !== editingCategory?.id)
                    .map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
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
        title="Delete Category"
        description="Are you sure you want to delete this category?"
        onConfirm={handleDelete}
      />
    </div>
  );
}

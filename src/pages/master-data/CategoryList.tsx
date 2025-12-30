import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import { MobileCardList } from "@/components/shared/MobileCardList";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCategories, useCreateCategory } from "@/hooks/use-products";
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
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryName, setCategoryName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
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

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setParentId(category.parent_id);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setCategoryName("");
    setParentId(null);
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
        const { error } = await supabase
          .from("categories")
          .update({ 
            name: categoryName.trim(),
            parent_id: parentId,
            level,
          })
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync({ 
          name: categoryName.trim(),
          parent_id: parentId ?? undefined,
          level,
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
      const { error } = await supabase
        .from("categories")
        .update({ is_active: false })
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const renderCategoryCard = (category: any) => (
    <div className="p-4">
      <p className="font-medium text-foreground">{category.name}</p>
      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
        <span>Parent: {getParentName(category.parent_id)}</span>
        <span>Level: {category.level}</span>
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

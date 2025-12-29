import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useSuppliers, useDeleteSupplier } from "@/hooks/use-suppliers";
import { SupplierDialog } from "./SupplierDialog";
import type { Supplier } from "@/types";

export default function SupplierList() {
  const { data: suppliers, isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    { key: "contact_person", header: "Contact Person" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "city", header: "City" },
    {
      key: "actions",
      header: "",
      render: (item: Supplier) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditSupplier(item);
              setShowDialog(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
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

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your supplier directory"
        action={
          <Button
            onClick={() => {
              setEditSupplier(null);
              setShowDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={suppliers ?? []}
        isLoading={isLoading}
        emptyMessage="No suppliers found. Add your first supplier."
        onRowClick={(item) => {
          setEditSupplier(item);
          setShowDialog(true);
        }}
      />

      <SupplierDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        supplier={editSupplier}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier?"
        onConfirm={() => {
          if (deleteId) {
            deleteSupplier.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        isLoading={deleteSupplier.isPending}
      />
    </div>
  );
}

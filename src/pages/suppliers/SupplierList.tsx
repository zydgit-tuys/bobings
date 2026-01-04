import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useSuppliers, useDeleteSupplier } from "@/hooks/use-suppliers";
import { SupplierDialog } from "./SupplierDialog";
import type { Supplier } from "@/types";

export default function SupplierList() {
  const navigate = useNavigate();
  const { data: suppliers, isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const columns = [
    {
      key: "po",
      header: "",
      render: (item: Supplier) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/purchases/new?supplier=${item.id}`);
          }}
          className="bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 active:scale-95 flex items-center gap-1 shadow-sm border-primary/20"
        >
          <ShoppingCart className="h-3 w-3" />
          Create PO
        </Button>
      ),
    },
    { key: "code", header: "Code", primary: true, sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "contact_person", header: "Contact Person", hideOnMobile: true, sortable: true },
    { key: "phone", header: "Phone", hideOnMobile: true },
    { key: "email", header: "Email", hideOnMobile: true },
    { key: "city", header: "City", hideOnMobile: true, sortable: true },
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

  const mobileCardRender = (item: Supplier) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">{item.code}</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(item.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {item.contact_person && (
        <p className="text-sm">Contact: {item.contact_person}</p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {item.phone && <span>{item.phone}</span>}
        {item.city && <span>{item.city}</span>}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/purchases/new?supplier=${item.id}`);
        }}
        className="mt-2 w-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm border-primary/20"
      >
        <ShoppingCart className="h-4 w-4" />
        Buat Purchase Order
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier directory"
        action={
          <Button
            onClick={() => {
              setEditSupplier(null);
              setShowDialog(true);
            }}
            size="sm"
            className="md:size-default"
          >
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add Supplier</span>
            <span className="sm:hidden">Add</span>
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
        mobileCardRender={mobileCardRender}
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

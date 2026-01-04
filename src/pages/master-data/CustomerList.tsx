import { useState } from "react";
import { Plus, Pencil, Trash2, Mail, Phone, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useCustomers, useDeleteCustomer } from "@/hooks/use-customers";
import { CustomerDialog } from "./CustomerDialog";

export default function CustomerList() {
    const { data: customers, isLoading } = useCustomers();
    const deleteCustomer = useDeleteCustomer();
    const [showDialog, setShowDialog] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAdd = () => {
        setSelectedCustomer(null);
        setShowDialog(true);
    };

    const handleEdit = (customer: any) => {
        setSelectedCustomer(customer);
        setShowDialog(true);
    };

    const columns = [
        { key: "code", header: "Kode", primary: true },
        { key: "name", header: "Nama", primary: true },
        {
            key: "customer_type",
            header: "Tipe",
            hideOnMobile: true,
            render: (item: any) => (
                <span className={`text-xs px-2 py-1 rounded font-medium ${item.customer_type === 'khusus'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                    }`}>
                    {item.customer_type === 'khusus' ? 'Khusus' : 'Umum'}
                </span>
            ),
        },
        {
            key: "contact",
            header: "Kontak",
            hideOnMobile: true,
            render: (item: any) => (
                <div className="flex flex-col gap-1 text-xs">
                    {item.email && (
                        <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {item.email}
                        </div>
                    )}
                    {item.phone && (
                        <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {item.phone}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "city",
            header: "Kota",
            hideOnMobile: true,
            render: (item: any) => item.city || "-",
        },
        {
            key: "actions",
            header: "",
            hideOnMobile: true,
            sortable: false,
            filterable: false,
            render: (item: any) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ),
        },
    ];

    const mobileCardRender = (customer: any) => (
        <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">{customer.code}</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded ${customer.customer_type === 'khusus'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                    {customer.customer_type === 'khusus' ? 'Khusus' : 'Umum'}
                </div>
            </div>
            {(customer.email || customer.phone) && (
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {customer.email && (
                        <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                        </div>
                    )}
                    {customer.phone && (
                        <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title="Customers"
                description="Kelola data customer dan tipe customer"
                action={
                    <Button onClick={handleAdd} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah Customer
                    </Button>
                }
            />

            {/* Info Banner: Pricing Model */}
            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                    <strong>Sistem Harga:</strong> Harga jual ditentukan berdasarkan <strong>Tipe Customer</strong>, bukan per customer individual.
                    Semua customer dengan tipe yang sama akan mendapat harga yang sama (misal: semua Reseller dapat diskon 10%).
                </AlertDescription>
            </Alert>

            <DataTable
                columns={columns}
                data={customers ?? []}
                isLoading={isLoading}
                emptyMessage="Belum ada customer. Tambahkan customer pertama."
                onRowClick={handleEdit}
                mobileCardRender={mobileCardRender}
            />

            <CustomerDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                customer={selectedCustomer}
            />

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Hapus Customer"
                description="Apakah Anda yakin ingin menghapus customer ini? Tindakan ini tidak dapat dibatalkan."
                onConfirm={() => {
                    if (deleteId) {
                        deleteCustomer.mutate(deleteId);
                        setDeleteId(null);
                    }
                }}
                isLoading={deleteCustomer.isPending}
            />
        </div>
    );
}

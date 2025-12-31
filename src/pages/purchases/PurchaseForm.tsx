import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowLeft, Save, Plus, Trash2, PackageCheck, CreditCard, Package, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useVariants } from "@/hooks/use-products";
import {
  usePurchase,
  useCreatePurchase,
  useUpdatePurchase,
  useGeneratePurchaseNo,
  useAddPurchaseLine,
  useDeletePurchaseLine,
  useReceivePurchaseLines,
} from "@/hooks/use-purchases";
import { PurchaseLineDialog } from "./PurchaseLineDialog";
import { ReceiveDialog } from "./ReceiveDialog";
import { PaymentDialog } from "./PaymentDialog";

const purchaseSchema = z.object({
  purchase_no: z.string().min(1, "PO number is required"),
  supplier_id: z.string().min(1, "Supplier is required"),
  order_date: z.string(),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function PurchaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "new";

  const { data: purchase, isLoading } = usePurchase(isEdit ? id : "");
  const { data: suppliers } = useSuppliers();
  const { data: purchaseNo } = useGeneratePurchaseNo();
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const deleteLine = useDeletePurchaseLine();

  const [showLineDialog, setShowLineDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      purchase_no: "",
      supplier_id: "",
      order_date: format(new Date(), "yyyy-MM-dd"),
      expected_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!isEdit && purchaseNo) {
      form.setValue("purchase_no", purchaseNo);
    }
  }, [purchaseNo, isEdit, form]);

  useEffect(() => {
    if (purchase) {
      form.reset({
        purchase_no: purchase.purchase_no,
        supplier_id: purchase.supplier_id,
        order_date: purchase.order_date,
        expected_date: purchase.expected_date ?? "",
        notes: purchase.notes ?? "",
      });
    }
  }, [purchase, form]);

  const onSubmit = (data: PurchaseFormData) => {
    if (isEdit) {
      updatePurchase.mutate({ id, data: { expected_date: data.expected_date || null, notes: data.notes || null } });
    } else {
      createPurchase.mutate({
        purchase_no: data.purchase_no,
        supplier_id: data.supplier_id,
        order_date: data.order_date,
        expected_date: data.expected_date || null,
        notes: data.notes || null,
      }, { onSuccess: (created) => navigate(`/purchases/${created.id}`) });
    }
  };

  const lineColumns = [
    {
      key: "variant",
      header: "Variant",
      render: (item: any) => item.product_variants?.sku_variant ?? "-",
    },
    { key: "qty_ordered", header: "Qty Ordered" },
    { key: "qty_received", header: "Qty Received" },
    {
      key: "unit_cost",
      header: "Unit Cost",
      render: (item: any) => `Rp ${item.unit_cost.toLocaleString()}`,
    },
    {
      key: "subtotal",
      header: "Subtotal",
      render: (item: any) => `Rp ${item.subtotal.toLocaleString()}`,
    },
    {
      key: "actions",
      header: "",
      render: (item: any) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteLine.mutate(item.id)}
          disabled={purchase?.status !== "draft"}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  if (isEdit && isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? `Purchase Order: ${purchase?.purchase_no}` : "New Purchase Order"}
        action={
          // Actions
          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/purchases')}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>

            {id && purchase?.status === 'ordered' && (
              <Button
                type="button"
                onClick={() => setShowReceiveDialog(true)}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Package className="mr-2 h-4 w-4" />
                Terima Barang
              </Button>
            )}

            {id && (purchase?.status === 'received' || purchase?.status === 'ordered') && (
              <Button
                type="button"
                onClick={() => setShowPaymentDialog(true)}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Bayar / Pelunasan
              </Button>
            )}

            <Button
              type="submit"
              disabled={createPurchase.isPending || updatePurchase.isPending}
              className="w-full sm:w-auto"
            >
              {(createPurchase.isPending || updatePurchase.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Simpan Draft
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order Details</CardTitle>
            {isEdit && <StatusBadge status={purchase?.status ?? "draft"} />}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="purchase_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PO Number</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={isEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isEdit && purchase?.status !== "draft"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="order_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expected_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createPurchase.isPending || updatePurchase.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEdit ? "Update Order" : "Create Order"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isEdit && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Order Lines</CardTitle>
              {purchase?.status === "draft" && (
                <Button size="sm" onClick={() => setShowLineDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable
                columns={lineColumns}
                data={purchase?.purchase_order_lines ?? []}
                emptyMessage="No items added yet"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {isEdit && (
        <>
          <PurchaseLineDialog
            open={showLineDialog}
            onOpenChange={setShowLineDialog}
            purchaseId={id}
          />
          <ReceiveDialog
            open={showReceiveDialog}
            onOpenChange={setShowReceiveDialog}
            purchase={purchase}
          />
          <PaymentDialog
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            purchase={purchase}
          />
        </>
      )}
    </div>
  );
}

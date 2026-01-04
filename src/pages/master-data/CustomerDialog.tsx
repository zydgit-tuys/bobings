import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import type { Customer } from "@/lib/api/customers";

const customerSchema = z.object({
    code: z.string().min(1, "Kode wajib diisi").max(50),
    name: z.string().min(1, "Nama wajib diisi").max(200),
    customer_type: z.enum(['umum', 'khusus']).default('umum'),  // Simple enum
    email: z.string().email("Email tidak valid").optional().or(z.literal("")),
    phone: z.string().max(50).optional(),
    address: z.string().optional(),
    city: z.string().max(100).optional(),
    contact_person: z.string().max(200).optional(),
    tax_id: z.string().max(50).optional(),
    notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: Customer;
}

export function CustomerDialog({ open, onOpenChange, customer }: CustomerDialogProps) {
    const createCustomer = useCreateCustomer();
    const updateCustomer = useUpdateCustomer();

    const form = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            code: "",
            name: "",
            customer_type: "umum" as 'umum' | 'khusus',
            email: "",
            phone: "",
            address: "",
            city: "",
            contact_person: "",
            tax_id: "",
            notes: "",
        },
    });

    useEffect(() => {
        if (open) {
            if (customer) {
                form.reset({
                    code: customer.code,
                    name: customer.name,
                    customer_type: customer.customer_type || 'umum',
                    email: customer.email || "",
                    phone: customer.phone || "",
                    address: customer.address || "",
                    city: customer.city || "",
                    contact_person: customer.contact_person || "",
                    tax_id: customer.tax_id || "",
                    notes: customer.notes || "",
                });
            } else {
                form.reset({
                    code: "",
                    name: "",
                    customer_type: "umum" as 'umum' | 'khusus',
                    email: "",
                    phone: "",
                    address: "",
                    city: "",
                    contact_person: "",
                    tax_id: "",
                    notes: "",
                });
            }
        }
    }, [open, customer, form]);

    const onSubmit = async (data: CustomerFormData) => {
        try {
            if (customer) {
                await updateCustomer.mutateAsync({ id: customer.id, data: data as any });
            } else {
                await createCustomer.mutateAsync(data as any);
            }
            form.reset();
            onOpenChange(false);
        } catch (error) {
            // Error handled in hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{customer ? "Edit Customer" : "Tambah Customer"}</DialogTitle>
                    <DialogDescription>
                        {customer ? "Ubah data customer" : "Tambahkan customer baru ke database"}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kode *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="CUST-001" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Nama customer" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="customer_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipe Customer *</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                className="flex gap-6"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="umum" id="umum" />
                                                    <Label htmlFor="umum" className="cursor-pointer font-normal">
                                                        Umum (Harga Normal)
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="khusus" id="khusus" />
                                                    <Label htmlFor="khusus" className="cursor-pointer font-normal">
                                                        Khusus (Harga Spesial)
                                                    </Label>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            💡 Harga jual ditentukan oleh <strong>Tipe Customer</strong> ini
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="email" placeholder="email@example.com" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telepon</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="08123456789" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contact_person"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Person</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Nama kontak" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kota</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Jakarta" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tax_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>NPWP</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="XX.XXX.XXX.X-XXX.XXX" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Alamat</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="Alamat lengkap customer" rows={2} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Catatan</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="Catatan tambahan" rows={2} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={createCustomer.isPending || updateCustomer.isPending}
                            >
                                {createCustomer.isPending || updateCustomer.isPending ? "Menyimpan..." : "Simpan"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

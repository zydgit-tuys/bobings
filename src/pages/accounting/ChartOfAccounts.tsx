import { useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { useChartOfAccounts, useCreateAccount } from "@/hooks/use-accounting";
import type { AccountType } from "@/types";

const accountSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
});

type AccountFormData = z.infer<typeof accountSchema>;

const typeColors: Record<AccountType, "default" | "secondary" | "destructive" | "outline"> = {
  asset: "default",
  liability: "destructive",
  equity: "secondary",
  revenue: "default",
  expense: "outline",
};

export function ChartOfAccounts() {
  const [open, setOpen] = useState(false);
  const { data: accounts, isLoading } = useChartOfAccounts();
  const createAccount = useCreateAccount();

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: "",
      name: "",
      account_type: "asset",
    },
  });

  const onSubmit = (data: AccountFormData) => {
    createAccount.mutate({ ...data, is_active: true }, {
      onSuccess: () => { setOpen(false); form.reset(); },
    });
  };

  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    {
      key: "account_type",
      header: "Type",
      render: (item: any) => (
        <Badge variant={typeColors[item.account_type as AccountType]}>
          {item.account_type}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Account</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 1000" />
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
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Cash" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="asset">Asset</SelectItem>
                          <SelectItem value="liability">Liability</SelectItem>
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createAccount.isPending}>
                  Create Account
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={accounts ?? []}
        isLoading={isLoading}
        emptyMessage="No accounts found"
      />
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { useChartOfAccounts } from "@/hooks/use-accounting";
import {
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  useSetDefaultBankAccount,
} from "@/hooks/use-bank-accounts";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { BankAccount } from "@/lib/api/bank-accounts";

interface BankAccountFormData {
  account_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
}

const emptyFormData: BankAccountFormData = {
  account_id: "",
  bank_name: "",
  account_number: "",
  account_holder: "",
  is_default: false,
};

export function BankAccountSettings() {
  const { data: bankAccounts, isLoading: bankAccountsLoading } = useBankAccounts();
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount();
  const deleteMutation = useDeleteBankAccount();
  const setDefaultMutation = useSetDefaultBankAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<BankAccountFormData>(emptyFormData);

  const isLoading = bankAccountsLoading || accountsLoading;

  // Filter only asset accounts for bank selection
  const assetAccounts = accounts?.filter((acc) => acc.account_type === "asset") || [];

  const handleOpenDialog = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        account_id: account.account_id,
        bank_name: account.bank_name,
        account_number: account.account_number || "",
        account_holder: account.account_holder || "",
        is_default: account.is_default,
      });
    } else {
      setEditingAccount(null);
      setFormData(emptyFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAccount(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.account_id || !formData.bank_name) {
      toast.error("Akun dan nama bank wajib diisi");
      return;
    }

    try {
      if (editingAccount) {
        await updateMutation.mutateAsync({
          id: editingAccount.id,
          ...formData,
        });
        toast.success("Bank account berhasil diupdate");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Bank account berhasil ditambahkan");
      }
      handleCloseDialog();
    } catch (error) {
      toast.error("Gagal menyimpan bank account");
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    try {
      await deleteMutation.mutateAsync(deletingAccount.id);
      toast.success("Bank account berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeletingAccount(null);
    } catch (error) {
      toast.error("Gagal menghapus bank account");
    }
  };

  const handleSetDefault = async (account: BankAccount) => {
    try {
      await setDefaultMutation.mutateAsync(account.id);
      toast.success(`${account.bank_name} dijadikan default`);
    } catch (error) {
      toast.error("Gagal mengubah default bank");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Akun Bank</h3>
          <p className="text-sm text-muted-foreground">
            Kelola akun bank untuk pembayaran transfer
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Bank
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Bank Account" : "Tambah Bank Account"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_id">Akun di Chart of Accounts *</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, account_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Nama Bank *</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bank_name: e.target.value }))
                  }
                  placeholder="contoh: BCA, Mandiri, BNI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Nomor Rekening</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, account_number: e.target.value }))
                  }
                  placeholder="1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder">Atas Nama</Label>
                <Input
                  id="account_holder"
                  value={formData.account_holder}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, account_holder: e.target.value }))
                  }
                  placeholder="Nama pemilik rekening"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_default: checked }))
                  }
                />
                <Label htmlFor="is_default">Jadikan default</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingAccount ? "Update" : "Simpan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {bankAccounts && bankAccounts.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {bankAccounts.map((account) => (
            <Card key={account.id} className={account.is_default ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {account.bank_name}
                      {account.is_default && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {account.chart_of_accounts?.code} - {account.chart_of_accounts?.name}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {!account.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSetDefault(account)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        setDeletingAccount(account);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground space-y-1">
                  {account.account_number && (
                    <p>No. Rek: {account.account_number}</p>
                  )}
                  {account.account_holder && (
                    <p>A/N: {account.account_holder}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Belum ada akun bank. Tambahkan akun bank untuk pembayaran transfer.</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Bank Account"
        description={`Yakin ingin menghapus ${deletingAccount?.bank_name}?`}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

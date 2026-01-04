import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useChartOfAccounts } from "@/hooks/use-accounting";
import { useSettings, useUpsertSettings } from "@/hooks/use-settings";
import { SETTING_KEYS } from "@/lib/api/settings";

interface AccountMapping {
  key: string;
  label: string;
  description: string;
  category: string;
}

// Asset & Liability accounts (Bank dikelola di tab Akun Bank)
// Full V1 Account Mapping Configuration
const ACCOUNT_MAPPINGS: AccountMapping[] = [
  // 1. ASSET (KAS & BANK)
  { key: SETTING_KEYS.ACCOUNT_KAS, label: "Kas", description: "Akun Kas Utama (Default)", category: "1. Asset (Kas & Bank)" },

  // 2. RECEIVABLE (PIUTANG)
  { key: SETTING_KEYS.ACCOUNT_PIUTANG_USAHA, label: "Piutang Usaha", description: "Piutang usaha default", category: "2. Asset (Piutang)" },

  // 3. INVENTORY (PERSEDIAAN)
  { key: SETTING_KEYS.ACCOUNT_PERSEDIAAN_BARANG_BELI_JADI, label: "Persediaan Barang Dagang", description: "Nilai stok barang trading/beli jadi", category: "3. Asset (Persediaan)" },

  // 4. LIABILITY (HUTANG)
  { key: SETTING_KEYS.ACCOUNT_HUTANG_SUPPLIER, label: "Hutang Usaha", description: "Hutang kepada supplier", category: "4. Liability" },

  // 5. REVENUE (PENJUALAN)
  { key: SETTING_KEYS.ACCOUNT_PENJUALAN_PRODUK_BELI_JADI, label: "Penjualan Barang Dagang", description: "Omzet penjualan barang trading", category: "5. Revenue" },
  { key: SETTING_KEYS.ACCOUNT_PENJUALAN_MANUAL, label: "Penjualan Manual/Offline", description: "Omzet penjualan offline/direct", category: "5. Revenue" },

  // 6. COGS (HPP)
  { key: SETTING_KEYS.ACCOUNT_HPP_BELI_JADI, label: "HPP Barang Dagang", description: "Harga Pokok Penjualan (Trading)", category: "6. COGS / HPP" },

  // 7. EXPENSES (BIAYA MARKETPLACE)
  // Tidak ditampilkan karena menggunakan Mapping V2 atau Net Settlement.
  // Jika dibutuhkan fallback, tambahkan 'Biaya Admin Marketplace' generic di sini.

  // 8. EXPENSES (PRODUCTION) -> Removed (Trading Model)

  // 9. CONTRA & ADJUSTMENT
  { key: SETTING_KEYS.ACCOUNT_DISKON_PENJUALAN, label: "Diskon Penjualan", description: "Potongan harga ke customer", category: "9. Contra & Others" },
  { key: SETTING_KEYS.ACCOUNT_DISKON_PEMBELIAN, label: "Diskon Pembelian", description: "Potongan harga dari supplier", category: "9. Contra & Others" },
  { key: SETTING_KEYS.ACCOUNT_BIAYA_PENYESUAIAN_STOK, label: "Penyesuaian Stok (Gain/Loss)", description: "Akun selisih stok opname/adjustment", category: "9. Contra & Others" },

  // 10. EQUITY
  { key: SETTING_KEYS.ACCOUNT_MODAL_PEMILIK, label: "Modal Pemilik", description: "Setoran modal owner", category: "10. Equity" },
  { key: SETTING_KEYS.ACCOUNT_LABA_DITAHAN, label: "Laba Ditahan", description: "Akumulasi laba tahun lalu", category: "10. Equity" },
];

export function AccountMappingSettings() {
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const upsertMutation = useUpsertSettings();

  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize mappings from settings
  useEffect(() => {
    if (settings) {
      const initialMappings: Record<string, string> = {};
      settings.forEach((setting) => {
        initialMappings[setting.setting_key] = setting.setting_value;
      });
      setMappings(initialMappings);
    }
  }, [settings]);

  const handleMappingChange = (key: string, value: string) => {
    setMappings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync(mappings);
      toast.success("Mapping akun berhasil disimpan");
      setHasChanges(false);
    } catch (error) {
      toast.error("Gagal menyimpan mapping akun");
    }
  };

  const isLoading = accountsLoading || settingsLoading;

  const groupedMappings = ACCOUNT_MAPPINGS.reduce((acc, mapping) => {
    if (!acc[mapping.category]) {
      acc[mapping.category] = [];
    }
    acc[mapping.category].push(mapping);
    return acc;
  }, {} as Record<string, AccountMapping[]>);

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
          <h3 className="text-lg font-medium">Mapping Akun untuk Auto Jurnal</h3>
          <p className="text-sm text-muted-foreground">
            Konfigurasi akun yang digunakan untuk pembuatan jurnal otomatis
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || upsertMutation.isPending}
          size="sm"
        >
          {upsertMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Simpan
        </Button>
      </div>

      {Object.entries(groupedMappings).map(([category, categoryMappings]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{category}</CardTitle>
            <CardDescription>
              Konfigurasi akun untuk kategori {category}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryMappings.map((mapping) => (
                <div key={mapping.key} className="space-y-2">
                  <Label htmlFor={mapping.key} className="text-sm">
                    {mapping.label}
                  </Label>
                  <Select
                    value={mappings[mapping.key] || ""}
                    onValueChange={(value) => handleMappingChange(mapping.key, value)}
                  >
                    <SelectTrigger id={mapping.key}>
                      <SelectValue placeholder="Pilih akun..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{mapping.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

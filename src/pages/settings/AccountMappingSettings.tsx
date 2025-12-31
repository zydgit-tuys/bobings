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

const ACCOUNT_MAPPINGS: AccountMapping[] = [
  // Asset & Liability accounts (Bank dikelola di tab Akun Bank)
  { key: SETTING_KEYS.ACCOUNT_KAS, label: "Kas", description: "Akun untuk pembayaran tunai", category: "Umum" },
  { key: SETTING_KEYS.ACCOUNT_PERSEDIAAN, label: "Persediaan", description: "Akun untuk nilai inventaris", category: "Umum" },
  { key: SETTING_KEYS.ACCOUNT_HUTANG_SUPPLIER, label: "Hutang Supplier", description: "Akun untuk hutang pembelian", category: "Umum" },
  { key: SETTING_KEYS.ACCOUNT_PIUTANG_MARKETPLACE, label: "Piutang Marketplace", description: "Akun untuk piutang dari marketplace", category: "Umum" },
  { key: SETTING_KEYS.ACCOUNT_HPP, label: "HPP", description: "Akun untuk harga pokok penjualan", category: "Umum" },
  { key: SETTING_KEYS.ACCOUNT_BIAYA_PENYESUAIAN_STOK, label: "Biaya Penyesuaian Stok", description: "Akun untuk adjustment stok", category: "Umum" },

  // Revenue accounts
  { key: SETTING_KEYS.ACCOUNT_PENJUALAN_SHOPEE, label: "Penjualan Shopee", description: "Akun pendapatan dari Shopee", category: "Pendapatan" },
  { key: SETTING_KEYS.ACCOUNT_PENJUALAN_TOKOPEDIA, label: "Penjualan Tokopedia", description: "Akun pendapatan dari Tokopedia", category: "Pendapatan" },
  { key: SETTING_KEYS.ACCOUNT_PENJUALAN_LAZADA, label: "Penjualan Lazada", description: "Akun pendapatan dari Lazada", category: "Pendapatan" },
  { key: SETTING_KEYS.ACCOUNT_PENJUALAN_TIKTOK, label: "Penjualan TikTok", description: "Akun pendapatan dari TikTok Shop", category: "Pendapatan" },
  { key: SETTING_KEYS.ACCOUNT_PENJUALAN_LAINNYA, label: "Penjualan Lainnya", description: "Akun pendapatan dari marketplace lain", category: "Pendapatan" },

  // Admin fee accounts
  { key: SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_SHOPEE, label: "Biaya Admin Shopee", description: "Akun biaya admin Shopee", category: "Biaya Admin" },
  { key: SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_TOKOPEDIA, label: "Biaya Admin Tokopedia", description: "Akun biaya admin Tokopedia", category: "Biaya Admin" },
  { key: SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_LAZADA, label: "Biaya Admin Lazada", description: "Akun biaya admin Lazada", category: "Biaya Admin" },
  { key: SETTING_KEYS.ACCOUNT_BIAYA_ADMIN_TIKTOK, label: "Biaya Admin TikTok", description: "Akun biaya admin TikTok", category: "Biaya Admin" },

  // Generic / Default Accounts (Fallback)
  { key: SETTING_KEYS.ACCOUNT_PENJUALAN, label: "Penjualan (Default)", description: "Akun penjualan default jika spesifik marketplace tidak ada", category: "Default / Fallback" },
  { key: SETTING_KEYS.ACCOUNT_PIUTANG, label: "Piutang (Default)", description: "Akun piutang default", category: "Default / Fallback" },
  { key: SETTING_KEYS.ACCOUNT_BIAYA_ADMIN, label: "Biaya Admin (Default)", description: "Akun biaya admin default", category: "Default / Fallback" },

  // Misc Accounts
  { key: SETTING_KEYS.ACCOUNT_RETUR_PENJUALAN, label: "Retur Penjualan", description: "Akun kontra pendapatan untuk retur", category: "Lainnya" },
  { key: SETTING_KEYS.ACCOUNT_DISKON_PENJUALAN, label: "Diskon Penjualan", description: "Akun kontra pendapatan untuk diskon", category: "Lainnya" },
  { key: SETTING_KEYS.ACCOUNT_PENDAPATAN_ONGKIR, label: "Pendapatan Ongkir", description: "Akun untuk selisih ongkir / pendapatan kirim", category: "Lainnya" },
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
              {category === "Umum" && "Akun-akun dasar untuk transaksi umum"}
              {category === "Pendapatan" && "Akun pendapatan per marketplace"}
              {category === "Biaya Admin" && "Akun biaya admin per marketplace"}
              {category === "Default / Fallback" && "Akun cadangan jika mapping spesifik tidak ditemukan"}
              {category === "Lainnya" && "Akun tambahan untuk Retur, Diskon, dll"}
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

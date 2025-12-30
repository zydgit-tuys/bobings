import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useSettings, useUpsertSettings } from "@/hooks/use-settings";
import { SETTING_KEYS } from "@/lib/api/settings";

export function GeneralSettings() {
  const { data: settings, isLoading } = useSettings();
  const upsertMutation = useUpsertSettings();
  
  const [formData, setFormData] = useState({
    companyName: "",
    defaultMinStockAlert: "5",
    adminPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      const settingsMap = new Map(settings.map(s => [s.setting_key, s.setting_value]));
      setFormData({
        companyName: settingsMap.get(SETTING_KEYS.COMPANY_NAME) || "",
        defaultMinStockAlert: settingsMap.get(SETTING_KEYS.DEFAULT_MIN_STOCK_ALERT) || "5",
        adminPassword: settingsMap.get(SETTING_KEYS.ADMIN_PASSWORD) || "",
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await upsertMutation.mutateAsync({
        [SETTING_KEYS.COMPANY_NAME]: formData.companyName,
        [SETTING_KEYS.DEFAULT_MIN_STOCK_ALERT]: formData.defaultMinStockAlert,
        [SETTING_KEYS.ADMIN_PASSWORD]: formData.adminPassword,
      });
      toast.success("Pengaturan berhasil disimpan");
      setHasChanges(false);
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
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
          <h3 className="text-lg font-medium">Pengaturan Umum</h3>
          <p className="text-sm text-muted-foreground">
            Konfigurasi dasar aplikasi
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Perusahaan</CardTitle>
          <CardDescription>Data dasar perusahaan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nama Perusahaan</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              placeholder="Masukkan nama perusahaan"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pengaturan Stok</CardTitle>
          <CardDescription>Konfigurasi default untuk manajemen stok</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultMinStockAlert">Default Minimum Stok Alert</Label>
            <Input
              id="defaultMinStockAlert"
              type="number"
              min="0"
              value={formData.defaultMinStockAlert}
              onChange={(e) => handleChange("defaultMinStockAlert", e.target.value)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              Nilai default untuk alert stok minimum pada produk baru
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Keamanan</CardTitle>
          <CardDescription>Password admin untuk akses fitur sensitif</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password Admin</Label>
            <div className="relative">
              <Input
                id="adminPassword"
                type={showPassword ? "text" : "password"}
                value={formData.adminPassword}
                onChange={(e) => handleChange("adminPassword", e.target.value)}
                placeholder="Masukkan password admin"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Digunakan untuk membuka kunci periode akuntansi dan aksi sensitif lainnya
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { AccountMappingSettings } from "./AccountMappingSettings";
import { GeneralSettings } from "./GeneralSettings";
import { BankAccountSettings } from "./BankAccountSettings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account-mapping");

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi sistem dan mapping akun"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="account-mapping" className="text-xs md:text-sm">
            Mapping Akun
          </TabsTrigger>
          <TabsTrigger value="bank-accounts" className="text-xs md:text-sm">
            Akun Bank
          </TabsTrigger>
          <TabsTrigger value="general" className="text-xs md:text-sm">
            Pengaturan Umum
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account-mapping" className="space-y-4">
          <AccountMappingSettings />
        </TabsContent>

        <TabsContent value="bank-accounts" className="space-y-4">
          <BankAccountSettings />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

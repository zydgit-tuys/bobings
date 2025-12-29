import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChartOfAccounts } from "./ChartOfAccounts";
import { JournalEntries } from "./JournalEntries";
import { TrialBalance } from "./TrialBalance";

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState("coa");

  return (
    <div>
      <PageHeader
        title="Accounting"
        description="Chart of accounts, journal entries, and reports"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 md:mb-6 flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="coa" className="text-xs md:text-sm">CoA</TabsTrigger>
          <TabsTrigger value="journals" className="text-xs md:text-sm">Journals</TabsTrigger>
          <TabsTrigger value="trial" className="text-xs md:text-sm">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="coa">
          <ChartOfAccounts />
        </TabsContent>

        <TabsContent value="journals">
          <JournalEntries />
        </TabsContent>

        <TabsContent value="trial">
          <TrialBalance />
        </TabsContent>
      </Tabs>
    </div>
  );
}

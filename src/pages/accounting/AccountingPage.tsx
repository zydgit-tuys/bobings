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
        <TabsList className="mb-6">
          <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journals">Journal Entries</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
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

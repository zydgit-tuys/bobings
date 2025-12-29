import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { StockTable } from "./StockTable";
import { StockAlerts } from "./StockAlerts";
import { StockMovements } from "./StockMovements";
import { OptimalStockPanel } from "./OptimalStockPanel";

export default function InventoryList() {
  const [activeTab, setActiveTab] = useState("stock");

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage stock levels and movements"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 md:mb-6 flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="stock" className="text-xs md:text-sm">Stock</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs md:text-sm">Alerts</TabsTrigger>
          <TabsTrigger value="movements" className="text-xs md:text-sm">Movements</TabsTrigger>
          <TabsTrigger value="optimal" className="text-xs md:text-sm">Optimal</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <StockTable />
        </TabsContent>

        <TabsContent value="alerts">
          <StockAlerts />
        </TabsContent>

        <TabsContent value="movements">
          <StockMovements />
        </TabsContent>

        <TabsContent value="optimal">
          <OptimalStockPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

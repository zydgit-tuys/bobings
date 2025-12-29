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
        <TabsList className="mb-6">
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="optimal">Optimal Stock</TabsTrigger>
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

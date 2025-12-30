import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Dashboard from "@/pages/Dashboard";
import ProductList from "@/pages/products/ProductList";
import ProductForm from "@/pages/products/ProductForm";
import MasterDataPage from "@/pages/master-data/MasterDataPage";
import SupplierList from "@/pages/suppliers/SupplierList";
import PurchaseList from "@/pages/purchases/PurchaseList";
import PurchaseForm from "@/pages/purchases/PurchaseForm";
import SalesList from "@/pages/sales/SalesList";
import InventoryList from "@/pages/inventory/InventoryList";
import AccountingPage from "@/pages/accounting/AccountingPage";
import VirtualStockPage from "@/pages/virtual-stock/VirtualStockPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/master-data" element={<MasterDataPage />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:id" element={<ProductForm />} />
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/purchases" element={<PurchaseList />} />
            <Route path="/purchases/:id" element={<PurchaseForm />} />
            <Route path="/sales" element={<SalesList />} />
            <Route path="/inventory" element={<InventoryList />} />
            <Route path="/virtual-stock" element={<VirtualStockPage />} />
            <Route path="/accounting" element={<AccountingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

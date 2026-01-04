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
import ProductVariantsPage from "@/pages/products/ProductVariantsPage";
import MasterDataPage from "@/pages/master-data/MasterDataPage";
import CustomerList from "@/pages/master-data/CustomerList"; // Add customer list
import SupplierList from "@/pages/suppliers/SupplierList";
import PurchaseList from "@/pages/purchases/PurchaseList";
import PurchaseForm from "@/pages/purchases/PurchaseForm";
import MarketplaceOrders from "@/pages/sales/MarketplaceOrders";
import ManualSalesPage from "@/pages/sales/ManualSalesPage";
import MarketplacePayoutsPage from "@/pages/sales/MarketplacePayouts";
import InventoryList from "@/pages/inventory/InventoryList";
import StockMovements from "@/pages/inventory/StockMovements";
import AccountingPage from "@/pages/accounting/AccountingPage";
import VirtualStockPage from "@/pages/virtual-stock/VirtualStockPage";
import StockOpnamePage from "@/pages/inventory/StockOpname";
import CustomerPaymentsPage from "@/pages/finance/CustomerPayments";
import SettingsPage from "@/pages/settings/SettingsPage";
import NotFound from "@/pages/NotFound";

// Auth
import { AuthLayout } from "@/components/layout/AuthLayout";
import Login from "@/pages/auth/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<AuthLayout />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/master-data" element={<MasterDataPage />} />
              <Route path="/master-data/customers" element={<CustomerList />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/:id" element={<ProductForm />} />
              <Route path="/products/:id/variants" element={<ProductVariantsPage />} />
              <Route path="/suppliers" element={<SupplierList />} />
              <Route path="/purchases" element={<PurchaseList />} />
              <Route path="/purchases/:id" element={<PurchaseForm />} />
              <Route path="/sales" element={<MarketplaceOrders />} />
              <Route path="/sales/manual" element={<ManualSalesPage />} />
              <Route path="/sales/payouts" element={<MarketplacePayoutsPage />} />
              <Route path="/inventory" element={<InventoryList />} />
              <Route path="/inventory/movements" element={<StockMovements />} />
              <Route path="/inventory/stock-opname" element={<StockOpnamePage />} />
              <Route path="/virtual-stock" element={<VirtualStockPage />} />
              <Route path="/finance/customer-payments" element={<CustomerPaymentsPage />} />
              <Route path="/accounting" element={<AccountingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

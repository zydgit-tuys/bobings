import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Users, ShoppingCart, Receipt, Archive } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-products";
import { useSuppliers } from "@/hooks/use-suppliers";
import { usePurchases } from "@/hooks/use-purchases";
import { useSalesOrders } from "@/hooks/use-sales";
import { useInventoryValuation } from "@/hooks/use-inventory";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const { data: purchases = [] } = usePurchases();
  const { data: salesOrders = [] } = useSalesOrders();
  const { data: inventoryData } = useInventoryValuation();
  const inventory = inventoryData?.items ?? [];

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback((path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  }, [navigate]);

  // Filter results based on query
  const lowerQuery = query.toLowerCase();

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(lowerQuery) ||
      p.sku_master?.toLowerCase().includes(lowerQuery)
  ).slice(0, 5);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name?.toLowerCase().includes(lowerQuery) ||
      s.code?.toLowerCase().includes(lowerQuery) ||
      s.city?.toLowerCase().includes(lowerQuery)
  ).slice(0, 5);

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchase_no?.toLowerCase().includes(lowerQuery) ||
      p.suppliers?.name?.toLowerCase().includes(lowerQuery)
  ).slice(0, 5);

  const filteredSales = salesOrders.filter(
    (s) =>
      s.desty_order_no?.toLowerCase().includes(lowerQuery) ||
      s.customer_name?.toLowerCase().includes(lowerQuery) ||
      s.marketplace?.toLowerCase().includes(lowerQuery)
  ).slice(0, 5);

  const filteredInventory = inventory.filter(
    (i) =>
      i.sku_variant?.toLowerCase().includes(lowerQuery) ||
      i.products?.name?.toLowerCase().includes(lowerQuery)
  ).slice(0, 5);

  const hasResults =
    filteredProducts.length > 0 ||
    filteredSuppliers.length > 0 ||
    filteredPurchases.length > 0 ||
    filteredSales.length > 0 ||
    filteredInventory.length > 0;

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm text-muted-foreground sm:pr-12 md:w-64 lg:w-80"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Cari di semua modul...</span>
        <span className="inline-flex lg:hidden">Cari...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Cari produk, supplier, PO, order..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Tidak ada hasil ditemukan.</CommandEmpty>

          {filteredProducts.length > 0 && (
            <CommandGroup heading="Produk">
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`product-${product.id}`}
                  onSelect={() => handleSelect(`/products/${product.id}`)}
                >
                  <Package className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.sku_master}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredSuppliers.length > 0 && (
            <CommandGroup heading="Supplier">
              {filteredSuppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={`supplier-${supplier.id}`}
                  onSelect={() => handleSelect("/suppliers")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{supplier.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {supplier.code} • {supplier.city}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredPurchases.length > 0 && (
            <CommandGroup heading="Purchase Order">
              {filteredPurchases.map((purchase) => (
                <CommandItem
                  key={purchase.id}
                  value={`purchase-${purchase.id}`}
                  onSelect={() => handleSelect(`/purchases/${purchase.id}`)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{purchase.purchase_no}</span>
                    <span className="text-xs text-muted-foreground">
                      {purchase.suppliers?.name} • {purchase.status}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredSales.length > 0 && (
            <CommandGroup heading="Sales Order">
              {filteredSales.map((order) => (
                <CommandItem
                  key={order.id}
                  value={`sales-${order.id}`}
                  onSelect={() => handleSelect("/sales")}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{order.desty_order_no}</span>
                    <span className="text-xs text-muted-foreground">
                      {order.marketplace} • {order.customer_name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredInventory.length > 0 && (
            <CommandGroup heading="Inventory">
              {filteredInventory.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`inventory-${item.id}`}
                  onSelect={() => handleSelect("/inventory")}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{item.products?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.sku_variant} • Stok: {item.stock_qty}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && !hasResults && (
            <CommandGroup heading="Navigasi Cepat">
              <CommandItem onSelect={() => handleSelect("/")}>
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/products")}>
                Produk
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/suppliers")}>
                Supplier
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/purchases")}>
                Purchase Order
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/sales")}>
                Sales Order
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/inventory")}>
                Inventory
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/accounting")}>
                Akuntansi
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

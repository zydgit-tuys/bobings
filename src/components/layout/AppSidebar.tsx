import {
  LayoutDashboard,
  Database,
  Truck,
  ShoppingCart,
  FileSpreadsheet,
  Warehouse,
  BookOpen,
  Boxes,
  LogOut,
  Package, // Added Package
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type MenuItem = {
  title: string;
  url?: string;
  icon: any;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Products",
    icon: Package,
    isActive: true,
    items: [
      { title: "Product List", url: "/products" },
      { title: "Settings / Attributes", url: "/master-data" },
    ],
  },
  {
    title: "Inventory",
    icon: Warehouse,
    items: [
      { title: "Stock List", url: "/inventory" },
      { title: "Stock Movements", url: "/inventory/movements" },
      { title: "Stock Opname", url: "/inventory/stock-opname" },
      { title: "Virtual Stock", url: "/virtual-stock" },
    ],
  },
  {
    title: "Transactions", // Changed from "Sales" to be broader or encompass Sales & POS
    icon: ShoppingCart,
    items: [
      { title: "Point of Sale (POS)", url: "/sales/manual" }, // Renamed from Manual Sales
      { title: "Marketplace Orders", url: "/sales" },
      { title: "Payouts (Settlement)", url: "/sales/payouts" },
      { title: "Customer Payments", url: "/finance/customer-payments" },
      { title: "Customers", url: "/master-data/customers" }, // Moved here
    ],
  },
  { title: "Purchases", url: "/purchases", icon: Truck }, // Swapped icon for variety? No, Truck usually Suppliers. Let's keep Truck for Suppliers.
  { title: "Suppliers", url: "/suppliers", icon: Truck },
  { title: "Accounting", url: "/accounting", icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed", {
        description: error.message,
      });
    } else {
      navigate("/login");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-6">
            {!isCollapsed && "MRP System"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    {item.items ? (
                      <>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                  <NavLink to={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </>
                    ) : (
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className="flex items-center gap-2"
                          activeClassName="font-medium"
                        >
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  tooltip="Logout"
                  className="text-red-500 hover:text-red-900 hover:bg-red-50"
                >
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

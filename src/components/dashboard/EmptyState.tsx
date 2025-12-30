import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Package, 
  Upload, 
  ShoppingCart, 
  TrendingUp,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    to: string;
  };
}

export function DashboardEmptyState() {
  const steps: Step[] = [
    {
      icon: <Package className="h-5 w-5 text-primary" />,
      title: "1. Tambah Produk",
      description: "Mulai dengan menambahkan produk dan varian (ukuran, warna)",
      action: { label: "Tambah Produk", to: "/products/new" }
    },
    {
      icon: <ShoppingCart className="h-5 w-5 text-primary" />,
      title: "2. Input Purchase Order",
      description: "Catat pembelian dari supplier untuk menambah stok",
      action: { label: "Buat PO", to: "/purchases/new" }
    },
    {
      icon: <Upload className="h-5 w-5 text-primary" />,
      title: "3. Import Penjualan",
      description: "Import data penjualan dari Desty atau marketplace lain",
      action: { label: "Import Sales", to: "/sales" }
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
      title: "4. Lihat Analytics",
      description: "Dashboard akan menampilkan trend, profit, dan insights",
    }
  ];

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 md:p-6">
        <div className="text-center mb-4 md:mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base md:text-lg font-semibold">Belum Ada Data Penjualan</h3>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Ikuti langkah berikut untuk mulai menggunakan dashboard analytics
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
            >
              <div className="shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
                {step.action && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 mt-1 text-xs"
                    asChild
                  >
                    <Link to={step.action.to}>
                      {step.action.label}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ChartEmptyStateProps {
  title: string;
  description?: string;
}

export function ChartEmptyState({ title, description }: ChartEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-48 md:h-64 text-center p-4">
      <TrendingUp className="h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
      )}
    </div>
  );
}

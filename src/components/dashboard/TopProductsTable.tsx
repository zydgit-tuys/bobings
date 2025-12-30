import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopProducts } from "@/hooks/use-dashboard";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { Link } from "react-router-dom";

interface TopProductsTableProps {
  limit?: number;
  days?: number;
}

export function TopProductsTable({ limit = 5, days = 30 }: TopProductsTableProps) {
  const { data, isLoading } = useTopProducts(limit, days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-4">
          <CardTitle className="text-sm md:text-base">Top Produk</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-4 md:pt-0 space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0;

  return (
    <Card>
      <CardHeader className="p-3 md:p-4">
        <CardTitle className="text-sm md:text-base">Top Produk ({days} Hari)</CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada data penjualan</p>
            <Link to="/sales" className="text-xs text-primary hover:underline mt-1">
              Import penjualan →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((product, index) => (
              <div 
                key={product.sku || product.name}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
              >
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium truncate">{product.name}</p>
                  {product.sku && (
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                      {product.sku}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs md:text-sm font-semibold">
                    Rp {product.revenue.toLocaleString('id-ID')}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    <Badge variant="secondary" className="text-[9px] md:text-[10px] px-1 py-0">
                      {product.qty} terjual
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

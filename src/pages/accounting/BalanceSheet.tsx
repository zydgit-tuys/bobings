import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalanceSheet } from "@/hooks/use-accounting";
import { Scale } from "lucide-react";

export function BalanceSheet() {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: sheet, isLoading } = useBalanceSheet(asOfDate);

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    return `Rp ${absValue.toLocaleString("id-ID")}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isBalanced = Math.abs((sheet?.totals.totalAssets ?? 0) - (sheet?.totals.liabilitiesAndEquity ?? 0)) < 1;

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Per Tanggal:</span>
          <Input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setAsOfDate(format(new Date(), "yyyy-MM-dd"))}
        >
          Hari Ini
        </Button>
      </div>

      {/* Balance Status */}
      {!isBalanced && (sheet?.totals.totalAssets ?? 0) > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-3 text-center text-destructive font-medium">
            ⚠️ Neraca TIDAK Seimbang! Selisih: {formatCurrency(Math.abs((sheet?.totals.totalAssets ?? 0) - (sheet?.totals.liabilitiesAndEquity ?? 0)))}
          </CardContent>
        </Card>
      )}

      {/* Balance Sheet Report */}
      <Card>
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-2">
            <Scale className="h-5 w-5" />
            <CardTitle>Neraca</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Per Tanggal: {format(new Date(asOfDate), "dd MMMM yyyy")}
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Assets */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">AKTIVA (Assets)</h3>
              <div className="space-y-2">
                {sheet?.assets.map((item) => (
                  <div key={item.account_id} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-sm">
                      <span className="text-muted-foreground">{item.account_code}</span> - {item.account_name}
                    </span>
                    <span className="font-mono text-sm">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
                {sheet?.assets.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Tidak ada data</p>
                )}
              </div>
              <div className="flex justify-between mt-4 pt-3 border-t-2 font-bold">
                <span>Total Aktiva</span>
                <span className="text-primary font-mono">{formatCurrency(sheet?.totals.totalAssets ?? 0)}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div>
              <h3 className="font-semibold text-lg mb-4 text-destructive border-b pb-2">PASIVA (Liabilities & Equity)</h3>
              
              {/* Liabilities */}
              <div className="mb-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Kewajiban (Liabilities)</h4>
                <div className="space-y-2 pl-2">
                  {sheet?.liabilities.map((item) => (
                    <div key={item.account_id} className="flex justify-between py-1 border-b border-dashed">
                      <span className="text-sm">
                        <span className="text-muted-foreground">{item.account_code}</span> - {item.account_name}
                      </span>
                      <span className="font-mono text-sm">{formatCurrency(Math.abs(item.balance))}</span>
                    </div>
                  ))}
                  {sheet?.liabilities.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Tidak ada data</p>
                  )}
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t text-sm font-medium">
                  <span>Total Kewajiban</span>
                  <span className="font-mono">{formatCurrency(Math.abs(sheet?.totals.totalLiabilities ?? 0))}</span>
                </div>
              </div>

              {/* Equity */}
              <div className="mb-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Ekuitas (Equity)</h4>
                <div className="space-y-2 pl-2">
                  {sheet?.equity.map((item) => (
                    <div key={item.account_id} className="flex justify-between py-1 border-b border-dashed">
                      <span className="text-sm">
                        <span className="text-muted-foreground">{item.account_code}</span> - {item.account_name}
                      </span>
                      <span className="font-mono text-sm">{formatCurrency(Math.abs(item.balance))}</span>
                    </div>
                  ))}
                  {sheet?.equity.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Tidak ada data</p>
                  )}
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t text-sm font-medium">
                  <span>Total Ekuitas</span>
                  <span className="font-mono">{formatCurrency(Math.abs(sheet?.totals.totalEquity ?? 0))}</span>
                </div>
              </div>

              <div className="flex justify-between mt-4 pt-3 border-t-2 font-bold">
                <span>Total Pasiva</span>
                <span className="text-destructive font-mono">{formatCurrency(Math.abs(sheet?.totals.liabilitiesAndEquity ?? 0))}</span>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          {isBalanced && (sheet?.totals.totalAssets ?? 0) > 0 && (
            <Card className="mt-6 bg-primary/10 border-primary">
              <CardContent className="py-3 text-center text-primary font-medium">
                ✓ Neraca Seimbang
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

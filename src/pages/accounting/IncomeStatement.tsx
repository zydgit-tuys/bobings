import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncomeStatement } from "@/hooks/use-accounting";
import { FileText } from "lucide-react";

export function IncomeStatement() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const { data: statement, isLoading } = useIncomeStatement(startDate, endDate);

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

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Periode:</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
            setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
          }}
        >
          Bulan Ini
        </Button>
      </div>

      {/* Income Statement Report */}
      <Card>
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Laporan Laba Rugi</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Periode: {format(new Date(startDate), "dd MMM yyyy")} - {format(new Date(endDate), "dd MMM yyyy")}
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Revenue Section */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 text-primary">Pendapatan</h3>
            <div className="space-y-2 pl-4">
              {statement?.revenue.map((item) => (
                <div key={item.account_id} className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-sm">
                    <span className="text-muted-foreground">{item.account_code}</span> - {item.account_name}
                  </span>
                  <span className="font-mono">{formatCurrency(Math.abs(item.balance))}</span>
                </div>
              ))}
              {statement?.revenue.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Tidak ada pendapatan</p>
              )}
            </div>
            <div className="flex justify-between mt-3 pt-2 border-t font-semibold">
              <span>Total Pendapatan</span>
              <span className="text-primary font-mono">
                {formatCurrency(Math.abs(statement?.totals.totalRevenue ?? 0))}
              </span>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 text-destructive">Beban / Biaya</h3>
            <div className="space-y-2 pl-4">
              {statement?.expenses.map((item) => (
                <div key={item.account_id} className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-sm">
                    <span className="text-muted-foreground">{item.account_code}</span> - {item.account_name}
                  </span>
                  <span className="font-mono">{formatCurrency(item.balance)}</span>
                </div>
              ))}
              {statement?.expenses.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Tidak ada beban</p>
              )}
            </div>
            <div className="flex justify-between mt-3 pt-2 border-t font-semibold">
              <span>Total Beban</span>
              <span className="text-destructive font-mono">
                {formatCurrency(statement?.totals.totalExpenses ?? 0)}
              </span>
            </div>
          </div>

          {/* Net Income */}
          <Card className={statement?.totals.netIncome && statement.totals.netIncome >= 0 ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive"}>
            <CardContent className="py-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">
                  {statement?.totals.netIncome && statement.totals.netIncome >= 0 ? "Laba Bersih" : "Rugi Bersih"}
                </span>
                <span className={`text-2xl font-bold font-mono ${statement?.totals.netIncome && statement.totals.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(statement?.totals.netIncome ?? 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

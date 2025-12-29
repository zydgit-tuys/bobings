import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { useTrialBalance } from "@/hooks/use-accounting";
import type { AccountType } from "@/types";

const typeColors: Record<AccountType, "default" | "secondary" | "destructive" | "outline"> = {
  asset: "default",
  liability: "destructive",
  equity: "secondary",
  revenue: "default",
  expense: "outline",
};

export function TrialBalance() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: trialBalance, isLoading } = useTrialBalance(
    startDate || undefined,
    endDate || undefined
  );

  const totalDebit = trialBalance?.reduce((sum, row) => sum + row.total_debit, 0) ?? 0;
  const totalCredit = trialBalance?.reduce((sum, row) => sum + row.total_credit, 0) ?? 0;

  const columns = [
    { key: "account_code", header: "Code" },
    { key: "account_name", header: "Account" },
    {
      key: "account_type",
      header: "Type",
      render: (item: any) => (
        <Badge variant={typeColors[item.account_type as AccountType]}>
          {item.account_type}
        </Badge>
      ),
    },
    {
      key: "total_debit",
      header: "Debit",
      render: (item: any) =>
        item.total_debit > 0 ? `Rp ${item.total_debit.toLocaleString()}` : "-",
    },
    {
      key: "total_credit",
      header: "Credit",
      render: (item: any) =>
        item.total_credit > 0 ? `Rp ${item.total_credit.toLocaleString()}` : "-",
    },
    {
      key: "balance",
      header: "Balance",
      render: (item: any) => (
        <span className={item.balance >= 0 ? "" : "text-destructive"}>
          Rp {item.balance.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40"
          placeholder="Start Date"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40"
          placeholder="End Date"
        />
        <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); }}>
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Rp {totalDebit.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Rp {totalCredit.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {totalDebit !== totalCredit && totalDebit > 0 && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-center text-destructive">
            Trial Balance is NOT balanced! Difference: Rp {Math.abs(totalDebit - totalCredit).toLocaleString()}
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={trialBalance ?? []}
        isLoading={isLoading}
        emptyMessage="No trial balance data"
      />
    </div>
  );
}

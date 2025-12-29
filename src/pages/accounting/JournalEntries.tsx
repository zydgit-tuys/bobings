import { useState } from "react";
import { format } from "date-fns";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/DataTable";
import { useJournalEntries, useJournalEntry } from "@/hooks/use-accounting";
import { JournalEntryForm } from "./JournalEntryForm";

export function JournalEntries() {
  const [showForm, setShowForm] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  const { data: entries, isLoading } = useJournalEntries(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
  );
  const { data: viewEntry } = useJournalEntry(viewId ?? "");

  const columns = [
    {
      key: "entry_date",
      header: "Date",
      render: (item: any) => format(new Date(item.entry_date), "dd MMM yyyy"),
    },
    { key: "description", header: "Description" },
    { key: "reference_type", header: "Reference" },
    {
      key: "total_debit",
      header: "Debit",
      render: (item: any) => `Rp ${item.total_debit.toLocaleString()}`,
    },
    {
      key: "total_credit",
      header: "Credit",
      render: (item: any) => `Rp ${item.total_credit.toLocaleString()}`,
    },
    {
      key: "actions",
      header: "",
      render: (item: any) => (
        <Button variant="ghost" size="icon" onClick={() => setViewId(item.id)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="w-40"
        />
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="w-40"
        />
        <Button
          variant="outline"
          onClick={() => setFilters({ startDate: "", endDate: "" })}
        >
          Clear
        </Button>
        <div className="flex-1" />
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={entries ?? []}
        isLoading={isLoading}
        emptyMessage="No journal entries found"
      />

      <JournalEntryForm open={showForm} onOpenChange={setShowForm} />

      {/* View Entry Dialog */}
      <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Journal Entry Details</DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {format(new Date(viewEntry.entry_date), "dd MMM yyyy")}
                </div>
                <div>
                  <span className="text-muted-foreground">Reference:</span>{" "}
                  {viewEntry.reference_type ?? "-"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Description:</span>{" "}
                {viewEntry.description}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Account</th>
                      <th className="text-right p-2">Debit</th>
                      <th className="text-right p-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewEntry.journal_lines?.map((line: any) => (
                      <tr key={line.id} className="border-t">
                        <td className="p-2">
                          {line.chart_of_accounts?.code} - {line.chart_of_accounts?.name}
                        </td>
                        <td className="text-right p-2">
                          {line.debit > 0 ? `Rp ${line.debit.toLocaleString()}` : "-"}
                        </td>
                        <td className="text-right p-2">
                          {line.credit > 0 ? `Rp ${line.credit.toLocaleString()}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-medium">
                    <tr>
                      <td className="p-2">Total</td>
                      <td className="text-right p-2">
                        Rp {viewEntry.total_debit.toLocaleString()}
                      </td>
                      <td className="text-right p-2">
                        Rp {viewEntry.total_credit.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { useJournalEntries } from "@/hooks/use-accounting";
import { JournalEntryForm } from "./JournalEntryForm";
import { JournalEntryDetailView } from "./JournalEntryDetailView";

export function JournalEntries() {
  const [showForm, setShowForm] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    startDate: searchParams.get("start") || "",
    endDate: searchParams.get("end") || "",
    referenceId: searchParams.get("ref_id") || "",
  });

  // Sync filters from URL
  useEffect(() => {
    setFilters({
      startDate: searchParams.get("start") || "",
      endDate: searchParams.get("end") || "",
      referenceId: searchParams.get("ref_id") || "",
    });
  }, [searchParams]);

  const { data: entries, isLoading } = useJournalEntries(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
  );

  const clearFilters = () => {
    setFilters({ startDate: "", endDate: "", referenceId: "" });
    setSearchParams({}); // Clear URL params
  };

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
        {filters.referenceId && (
          <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            <span>Filtered by Reference</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={clearFilters}
            >
              &times;
            </Button>
          </div>
        )}
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
          onClick={clearFilters}
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
          {viewId && <JournalEntryDetailView entryId={viewId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

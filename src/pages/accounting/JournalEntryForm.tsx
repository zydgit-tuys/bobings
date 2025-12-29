import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChartOfAccounts, useCreateJournalEntry } from "@/hooks/use-accounting";
import { toast } from "sonner";

interface JournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
}

export function JournalEntryForm({ open, onOpenChange }: JournalEntryFormProps) {
  const { data: accounts } = useChartOfAccounts();
  const createEntry = useCreateJournalEntry();

  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { id: "1", accountId: "", debit: 0, credit: 0 },
    { id: "2", accountId: "", debit: 0, credit: 0 },
  ]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: Date.now().toString(), accountId: "", debit: 0, credit: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = () => {
    if (!isBalanced) {
      toast.error("Journal entry must be balanced (Debit = Credit)");
      return;
    }

    const validLines = lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      toast.error("At least 2 lines are required");
      return;
    }

    createEntry.mutate(
      {
        entry_date: entryDate,
        description,
        lines: validLines.map((l) => ({
          account_id: l.accountId,
          debit: l.debit,
          credit: l.credit,
        })),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDescription("");
          setLines([
            { id: "1", accountId: "", debit: 0, credit: 0 },
            { id: "2", accountId: "", debit: 0, credit: 0 },
          ]);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Journal Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Entry Date</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Journal entry description"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lines</Label>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Account</th>
                    <th className="text-right p-2 w-32">Debit</th>
                    <th className="text-right p-2 w-32">Credit</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="p-2">
                        <Select
                          value={line.accountId}
                          onValueChange={(v) => updateLine(line.id, "accountId", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts?.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          value={line.debit || ""}
                          onChange={(e) =>
                            updateLine(line.id, "debit", parseFloat(e.target.value) || 0)
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          value={line.credit || ""}
                          onChange={(e) =>
                            updateLine(line.id, "credit", parseFloat(e.target.value) || 0)
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 2}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-medium">
                  <tr>
                    <td className="p-2">Total</td>
                    <td className="text-right p-2">Rp {totalDebit.toLocaleString()}</td>
                    <td className="text-right p-2">Rp {totalCredit.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {!isBalanced && totalDebit > 0 && (
              <p className="text-sm text-destructive">
                Entry is not balanced. Difference: Rp {Math.abs(totalDebit - totalCredit).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isBalanced || createEntry.isPending}>
            Create Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

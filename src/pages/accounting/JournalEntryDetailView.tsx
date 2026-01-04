import { format } from "date-fns";
import { useJournalEntry } from "@/hooks/use-accounting";
import { Loader2 } from "lucide-react";

interface JournalEntryDetailViewProps {
    entryId: string;
}

export function JournalEntryDetailView({ entryId }: JournalEntryDetailViewProps) {
    const { data: entry, isLoading } = useJournalEntry(entryId);

    if (isLoading) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Memuat rincian jurnal...</span>
            </div>
        );
    }

    if (!entry) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                Data jurnal tidak ditemukan.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-muted-foreground font-medium">Tanggal:</span>{" "}
                    {format(new Date(entry.entry_date), "dd MMM yyyy")}
                </div>
                <div>
                    <span className="text-muted-foreground font-medium">Referensi:</span>{" "}
                    {entry.reference_type ?? "-"}
                </div>
            </div>
            <div>
                <span className="text-muted-foreground font-medium">Deskripsi:</span>{" "}
                {entry.description}
            </div>
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted">
                        <tr>
                            <th className="text-left p-2">Akun</th>
                            <th className="text-right p-2">Debit</th>
                            <th className="text-right p-2">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entry.journal_lines?.map((line: any) => (
                            <tr key={line.id} className="border-t">
                                <td className="p-2">
                                    {line.chart_of_accounts?.code} - {line.chart_of_accounts?.name}
                                </td>
                                <td className="text-right p-2 text-green-600">
                                    {line.debit > 0 ? `Rp ${line.debit.toLocaleString()}` : "-"}
                                </td>
                                <td className="text-right p-2 text-red-600">
                                    {line.credit > 0 ? `Rp ${line.credit.toLocaleString()}` : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted font-bold">
                        <tr>
                            <td className="p-2">Total</td>
                            <td className="text-right p-2">
                                Rp {entry.total_debit.toLocaleString()}
                            </td>
                            <td className="text-right p-2">
                                Rp {entry.total_credit.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

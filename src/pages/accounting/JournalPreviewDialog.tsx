import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useJournalEntries } from "@/hooks/use-accounting";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface JournalPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    referenceId: string | null;
    referenceType: string;
    title?: string;
}

export function JournalPreviewDialog({
    open,
    onOpenChange,
    referenceId,
    referenceType,
    title = "Jurnal Transaksi"
}: JournalPreviewDialogProps) {

    // Only fetch if open and has ID
    const { data: journals, isLoading } = useJournalEntries(
        open && referenceId ? { referenceId, referenceType } : undefined
    );

    const journal = journals?.[0]; // Get the first matching journal

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !journal ? (
                    <div className="py-8 text-center text-muted-foreground">
                        Tidak ada jurnal ditemukan untuk transaksi ini.
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>No. Jurnal: <span className="font-medium text-foreground">{journal.entry_number}</span></span>
                            <span>Tanggal: <span className="font-medium text-foreground">{format(new Date(journal.entry_date), 'dd MMM yyyy')}</span></span>
                        </div>

                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-2 text-left font-medium">Akun</th>
                                        <th className="px-4 py-2 text-right font-medium">Debit</th>
                                        <th className="px-4 py-2 text-right font-medium">Kredit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {journal.journal_lines?.map((line: any) => (
                                        <tr key={line.id} className="border-b last:border-0 hover:bg-muted/50">
                                            <td className="px-4 py-2">
                                                <div className="font-medium">{line.chart_of_accounts?.code} - {line.chart_of_accounts?.name}</div>
                                                {line.description && <div className="text-xs text-muted-foreground">{line.description}</div>}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {line.debit > 0 ? `Rp ${line.debit.toLocaleString('id-ID')}` : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {line.credit > 0 ? `Rp ${line.credit.toLocaleString('id-ID')}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Total Row */}
                                    <tr className="bg-muted/50 font-medium">
                                        <td className="px-4 py-2">Total</td>
                                        <td className="px-4 py-2 text-right">
                                            Rp {journal.total_debit.toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            Rp {journal.total_credit.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            *Jurnal ini dibuat otomatis oleh sistem saat transaksi selesai.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

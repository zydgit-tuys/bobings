import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccountingPeriods, useCreatePeriod, useClosePeriod, useReopenPeriod } from "@/hooks/use-accounting";
import { Calendar, Plus, Lock, Download, FileText, ChevronLeft, ChevronRight, Unlock } from "lucide-react";
import { toast } from "sonner";
import { exportAllReports } from "@/lib/utils/export-reports";

export function AccountingPeriods() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  const { data: periods, isLoading } = useAccountingPeriods(year);
  const createPeriod = useCreatePeriod();
  const closePeriod = useClosePeriod();
  const reopenPeriod = useReopenPeriod();

  // Generate all months for the year
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i, 1);
    return {
      month: i,
      name: format(date, "MMMM", { locale: id }),
      startDate: format(startOfMonth(date), "yyyy-MM-dd"),
      endDate: format(endOfMonth(date), "yyyy-MM-dd"),
    };
  });

  const getPeriodForMonth = (startDate: string) => {
    return periods?.find(p => p.start_date === startDate);
  };

  const handleCreatePeriod = async (month: typeof months[0]) => {
    try {
      await createPeriod.mutateAsync({
        period_name: `${month.name} ${year}`,
        start_date: month.startDate,
        end_date: month.endDate,
        status: 'open',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleClosePeriod = async () => {
    if (!selectedPeriod) return;
    
    try {
      await closePeriod.mutateAsync(selectedPeriod.id);
      setShowCloseDialog(false);
      setSelectedPeriod(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleReopenPeriod = async () => {
    if (!selectedPeriod || !adminPassword) return;
    
    try {
      await reopenPeriod.mutateAsync({ 
        periodId: selectedPeriod.id, 
        password: adminPassword 
      });
      setShowReopenDialog(false);
      setSelectedPeriod(null);
      setAdminPassword("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleExport = async (period: any) => {
    setIsExporting(true);
    try {
      await exportAllReports(period.start_date, period.end_date, period.period_name);
      toast.success("Laporan berhasil di-export");
    } catch (error) {
      toast.error("Gagal export laporan");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
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
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xl font-bold w-20 text-center">{year}</span>
          <Button variant="outline" size="icon" onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Periods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map((month) => {
          const period = getPeriodForMonth(month.startDate);
          const isClosed = period?.status === 'closed';
          const isOpen = period?.status === 'open';
          
          return (
            <Card key={month.month} className={`${isClosed ? 'bg-muted/50' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{month.name}</CardTitle>
                  {period && (
                    <Badge variant={isClosed ? "secondary" : "default"}>
                      {isClosed ? <><Lock className="h-3 w-3 mr-1" /> Tutup</> : "Open"}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {format(new Date(month.startDate), "d MMM")} - {format(new Date(month.endDate), "d MMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {!period ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleCreatePeriod(month)}
                    disabled={createPeriod.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Buat Periode
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    {isOpen && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedPeriod(period);
                          setShowCloseDialog(true);
                        }}
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        Tutup
                      </Button>
                    )}
                    {isClosed && (
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleExport(period)}
                          disabled={isExporting}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPeriod(period);
                            setShowReopenDialog(true);
                          }}
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Closed Periods History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Riwayat Periode Tertutup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Tanggal Tutup</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods?.filter(p => p.status === 'closed').map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.period_name}</TableCell>
                  <TableCell>
                    {period.closed_at ? format(new Date(period.closed_at), "dd MMM yyyy HH:mm") : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Lock className="h-3 w-3 mr-1" />
                      Tertutup
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(period)}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPeriod(period);
                        setShowReopenDialog(true);
                      }}
                    >
                      <Unlock className="h-4 w-4 mr-1" />
                      Buka
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {periods?.filter(p => p.status === 'closed').length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Belum ada periode yang ditutup
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Close Period Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup Periode Akuntansi</DialogTitle>
            <DialogDescription>
              Anda akan menutup periode <strong>{selectedPeriod?.period_name}</strong>. 
              Setelah ditutup, tidak ada jurnal yang dapat dibuat pada periode ini.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Pastikan semua transaksi sudah dicatat dengan benar sebelum menutup periode.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClosePeriod}
              disabled={closePeriod.isPending}
            >
              <Lock className="h-4 w-4 mr-1" />
              Tutup Periode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Period Dialog */}
      <Dialog open={showReopenDialog} onOpenChange={(open) => {
        setShowReopenDialog(open);
        if (!open) setAdminPassword("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka Kembali Periode</DialogTitle>
            <DialogDescription>
              Anda akan membuka kembali periode <strong>{selectedPeriod?.period_name}</strong>. 
              Masukkan password admin untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password Admin</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Masukkan password admin"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Password default: admin123 (harap ganti segera)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowReopenDialog(false);
              setAdminPassword("");
            }}>
              Batal
            </Button>
            <Button 
              onClick={handleReopenPeriod}
              disabled={reopenPeriod.isPending || !adminPassword}
            >
              <Unlock className="h-4 w-4 mr-1" />
              Buka Periode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
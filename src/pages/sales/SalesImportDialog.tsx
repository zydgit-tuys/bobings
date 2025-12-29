import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParseDestyFile, useProcessSalesImport } from "@/hooks/use-sales";
import type { DestyRow } from "@/types";

interface SalesImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesImportDialog({ open, onOpenChange }: SalesImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<DestyRow[] | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "processing" | "done">("upload");

  const parseFile = useParseDestyFile();
  const processImport = useProcessSalesImport();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile.mutate(selectedFile, {
      onSuccess: (data) => {
        setParsedData(data);
        setStep("preview");
      },
    });
  };

  const handleProcess = () => {
    if (!parsedData || !file) return;
    setStep("processing");
    processImport.mutate(
      { rows: parsedData, filename: file.name },
      {
        onSuccess: () => setStep("done"),
        onError: () => setStep("preview"),
      }
    );
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setStep("upload");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Sales from Desty</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Upload your Desty export file (.xlsx)
              </p>
              <label>
                <Button asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </span>
                </Button>
              </label>
            </div>
            {parseFile.isPending && (
              <div className="text-center">
                <Progress value={50} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">Parsing file...</p>
              </div>
            )}
          </div>
        )}

        {step === "preview" && parsedData && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">File: {file?.name}</p>
              <p className="text-sm text-muted-foreground">
                Found {parsedData.length} orders to import
              </p>
            </div>

            <ScrollArea className="h-60 border rounded-lg">
            <div className="p-4 space-y-2">
                {parsedData.slice(0, 10).map((row, i) => (
                  <div key={i} className="text-sm flex justify-between">
                    <span>{row.orderNo}</span>
                    <span className="text-muted-foreground">{row.marketplace}</span>
                    <span>Rp {row.amount?.toLocaleString() ?? 0}</span>
                  </div>
                ))}
                {parsedData.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center">
                    ... and {parsedData.length - 10} more
                  </p>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleProcess}>
                Import {parsedData.length} Orders
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-8 text-center">
            <Progress value={70} className="w-full mb-4" />
            <p className="text-muted-foreground">Processing orders...</p>
          </div>
        )}

        {step === "done" && (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-medium">Import Completed!</p>
            {processImport.data && (
              <div className="text-sm text-muted-foreground">
                <p>Success: {processImport.data.summary?.successCount ?? 0}</p>
                <p>Skipped: {processImport.data.summary?.skippedCount ?? 0}</p>
              </div>
            )}
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { Badge } from "@/components/ui/badge";

type StatusType =
  | "draft" | "ordered" | "partial" | "received" | "cancelled"
  | "pending" | "processing" | "completed" | "failed"
  | "returned";

const statusConfig: Record<StatusType, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { label: "Draft", variant: "secondary", className: "bg-slate-100 text-slate-700 hover:bg-slate-200" },
  ordered: { label: "Ordered", variant: "default", className: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200" },
  partial: { label: "Partial", variant: "outline", className: "text-amber-600 border-amber-200 bg-amber-50" },
  received: { label: "Received", variant: "default", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" },
  cancelled: { label: "Cancelled", variant: "destructive", className: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" },
  pending: { label: "Pending", variant: "secondary", className: "bg-slate-100 text-slate-700" },
  processing: { label: "Processing", variant: "outline", className: "text-blue-600 border-blue-200 bg-blue-50" },
  completed: { label: "Completed", variant: "default", className: "bg-emerald-600 text-white hover:bg-emerald-700" }, // Completed is solid green
  failed: { label: "Failed", variant: "destructive", className: "bg-red-600 text-white" },
  returned: { label: "Returned", variant: "outline", className: "text-orange-600 border-orange-200 bg-orange-50" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || { label: status, variant: "secondary" as const };

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";

type StatusType = 
  | "draft" | "ordered" | "partial" | "received" | "cancelled"
  | "pending" | "processing" | "completed" | "failed"
  | "returned";

const statusConfig: Record<StatusType, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  ordered: { label: "Ordered", variant: "default" },
  partial: { label: "Partial", variant: "outline" },
  received: { label: "Received", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  returned: { label: "Returned", variant: "outline" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || { label: status, variant: "secondary" as const };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}

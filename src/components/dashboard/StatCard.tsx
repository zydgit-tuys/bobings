import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  isLoading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend,
  isLoading,
  variant = 'default'
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-emerald-500/10 border-emerald-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    danger: 'bg-destructive/10 border-destructive/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-destructive',
  };

  return (
    <Card className={cn(variantStyles[variant])}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-5 md:h-7 w-16 md:w-24 mt-1" />
            ) : (
              <p className="text-base md:text-xl font-bold mt-0.5 truncate">{value}</p>
            )}
            {subtitle && (
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <p className={cn(
                "text-[10px] md:text-xs mt-1",
                trend.value >= 0 ? "text-emerald-500" : "text-destructive"
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn(
            "p-1.5 md:p-2 rounded-lg bg-background/50 shrink-0",
            iconStyles[variant]
          )}>
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

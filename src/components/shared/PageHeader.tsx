interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 md:mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

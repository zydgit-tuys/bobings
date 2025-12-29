interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-4 md:mb-6 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 md:mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

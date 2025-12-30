interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Filter/search elements to show inline with action on mobile */
  filter?: React.ReactNode;
}

export function PageHeader({ title, description, action, filter }: PageHeaderProps) {
  return (
    <div className="mb-3 md:mb-6 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
          {description && (
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
        {/* On desktop, show action in header */}
        {action && <div className="shrink-0 hidden md:block">{action}</div>}
      </div>
      {/* Filter row - on mobile shows filter + action side by side */}
      {(filter || action) && (
        <div className="flex items-center gap-2">
          {filter && <div className="flex-1 min-w-0">{filter}</div>}
          {action && <div className="shrink-0 md:hidden">{action}</div>}
        </div>
      )}
    </div>
  );
}

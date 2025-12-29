import { ReactNode } from "react";
import { SwipeableCard } from "./SwipeableCard";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "./TablePagination";
import { usePagination } from "@/hooks/use-pagination";

interface SwipeAction<T> {
  icon: ReactNode;
  label: string;
  onClick: (item: T) => void;
  variant?: "default" | "destructive" | "warning";
}

interface MobileCardListProps<T> {
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  renderCard: (item: T) => ReactNode;
  onCardClick?: (item: T) => void;
  leftActions?: SwipeAction<T>[];
  rightActions?: SwipeAction<T>[];
  pageSize?: number;
  showPagination?: boolean;
}

export function MobileCardList<T extends { id: string }>({
  data,
  isLoading,
  emptyMessage = "No data found",
  renderCard,
  onCardClick,
  leftActions = [],
  rightActions = [],
  pageSize: initialPageSize = 10,
  showPagination = true,
}: MobileCardListProps<T>) {
  const pagination = usePagination<T>({
    totalItems: data.length,
    initialPageSize,
  });

  const displayData = showPagination ? pagination.paginatedData(data) : data;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {displayData.map((item) => (
          <SwipeableCard
            key={item.id}
            onClick={() => onCardClick?.(item)}
            leftActions={leftActions.map((action) => ({
              ...action,
              onClick: () => action.onClick(item),
            }))}
            rightActions={rightActions.map((action) => ({
              ...action,
              onClick: () => action.onClick(item),
            }))}
          >
            {renderCard(item)}
          </SwipeableCard>
        ))}
      </div>

      {showPagination && data.length > 0 && (
        <TablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalPages={pagination.totalPages}
          totalItems={data.length}
          startIndex={pagination.startIndex}
          endIndex={Math.min(pagination.endIndex, data.length)}
          hasNextPage={pagination.hasNextPage}
          hasPrevPage={pagination.hasPrevPage}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          onNextPage={pagination.goToNextPage}
          onPrevPage={pagination.goToPrevPage}
          onFirstPage={pagination.goToFirstPage}
          onLastPage={pagination.goToLastPage}
        />
      )}
    </div>
  );
}

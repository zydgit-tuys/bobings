import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "./TablePagination";
import { usePagination } from "@/hooks/use-pagination";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number; // Custom sort function
  filterable?: boolean;
  hideOnMobile?: boolean;
  primary?: boolean; // Primary columns show prominently on mobile card
}

type SortDirection = "asc" | "desc" | null;

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  showPagination?: boolean;
  showFilters?: boolean;
  mobileCardRender?: (item: T) => React.ReactNode;
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  emptyMessage = "No data found",
  onRowClick,
  pageSize: initialPageSize = 10,
  showPagination = true,
  showFilters = true,
  mobileCardRender,
  enableSelection = false,
  selectedIds = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilterRow, setShowFilterRow] = useState(false);

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const itemValue = (item as Record<string, unknown>)[key];
        if (itemValue == null) return false;
        return String(itemValue).toLowerCase().includes(value.toLowerCase());
      });
    });
  }, [data, filters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData;

    const column = columns.find(col => col.key === sortKey);

    return [...filteredData].sort((a, b) => {
      // Use custom sortFn if provided
      if (column?.sortFn) {
        const result = column.sortFn(a, b);
        return sortDirection === "asc" ? result : -result;
      }

      // Default sorting logic
      const aValue = (a as Record<string, unknown>)[sortKey];
      const bValue = (b as Record<string, unknown>)[sortKey];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? 1 : -1;
      if (bValue == null) return sortDirection === "asc" ? -1 : 1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === "asc") {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [filteredData, sortKey, sortDirection, columns]);

  const pagination = usePagination<T>({
    totalItems: sortedData.length,
    initialPageSize,
  });

  const displayData = showPagination ? pagination.paginatedData(sortedData) : sortedData;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    pagination.setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    pagination.setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);
  const filterableColumns = columns.filter((col) => col.filterable !== false);

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = data.map(item => item.id);
      onSelectionChange?.(allIds);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedIds, id]);
    } else {
      onSelectionChange?.(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // Mobile Card View
  const renderMobileCard = (item: T) => {
    if (mobileCardRender) {
      return mobileCardRender(item);
    }

    // Auto-generate card from columns
    const primaryCols = columns.filter(c => c.primary);
    const secondaryCols = columns.filter(c => !c.primary && !c.hideOnMobile);

    return (
      <div className="p-3">
        {primaryCols.length > 0 ? (
          <div className="mb-1">
            {primaryCols.map(col => (
              <div key={col.key} className="font-medium text-sm">
                {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key]?.toString() ?? "-"}
              </div>
            ))}
          </div>
        ) : (
          <div className="font-medium text-sm mb-1">
            {columns[0]?.render ? columns[0].render(item) : (item as Record<string, unknown>)[columns[0]?.key]?.toString() ?? "-"}
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {(primaryCols.length > 0 ? secondaryCols : columns.slice(1)).slice(0, 4).map(col => (
            <span key={col.key}>
              <span className="text-muted-foreground/60">{col.header}: </span>
              {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key]?.toString() ?? "-"}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-2">
        {showFilters && filterableColumns.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant={showFilterRow ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilterRow(!showFilterRow)}
              className="gap-1 h-8"
            >
              <Search className="h-3.5 w-3.5" />
              Filter
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-8 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {hasActiveFilters && (
              <span className="text-xs text-muted-foreground">
                {sortedData.length}/{data.length}
              </span>
            )}
          </div>
        )}

        {showFilterRow && showFilters && (
          <Input
            placeholder="Cari..."
            value={filters[columns[0]?.key] || ""}
            onChange={(e) => handleFilterChange(columns[0]?.key, e.target.value)}
            className="h-9 text-sm"
          />
        )}

        {displayData.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            {hasActiveFilters ? "Tidak ada hasil" : emptyMessage}
          </div>
        ) : (
          <div className="space-y-2">
            {displayData.map((item) => (
              <Card
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? "cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors" : ""}
              >
                {renderMobileCard(item)}
              </Card>
            ))}
          </div>
        )}

        {showPagination && sortedData.length > 0 && (
          <TablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalPages={pagination.totalPages}
            totalItems={sortedData.length}
            startIndex={pagination.startIndex}
            endIndex={Math.min(pagination.endIndex, sortedData.length)}
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

  // Desktop table view
  return (
    <div className="space-y-2">
      {showFilters && filterableColumns.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showFilterRow ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilterRow(!showFilterRow)}
            className="gap-1 md:gap-2"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
          {hasActiveFilters && (
            <span className="text-xs md:text-sm text-muted-foreground">
              {sortedData.length}/{data.length}
            </span>
          )}
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {showFilterRow && showFilters && (
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {enableSelection && <TableHead />}
                {columns.map((col) => (
                  <TableHead key={`filter-${col.key}`} className="py-2">
                    {col.filterable !== false ? (
                      <Input
                        placeholder={`Filter ${col.header.toLowerCase()}...`}
                        value={filters[col.key] || ""}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        className="h-8 text-sm"
                      />
                    ) : null}
                  </TableHead>
                ))}
              </TableRow>
            )}
            <TableRow>
              {enableSelection && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={col.sortable !== false ? "cursor-pointer select-none hover:bg-muted/50" : ""}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable !== false && getSortIcon(col.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  {hasActiveFilters ? "No matching results" : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                >
                  {enableSelection && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectRow(item.id, checked as boolean)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(item)
                        : (item as Record<string, unknown>)[col.key]?.toString() ?? "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && sortedData.length > 0 && (
        <TablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalPages={pagination.totalPages}
          totalItems={sortedData.length}
          startIndex={pagination.startIndex}
          endIndex={Math.min(pagination.endIndex, sortedData.length)}
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

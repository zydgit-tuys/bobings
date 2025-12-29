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
import { Button } from "@/components/ui/button";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
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
}: DataTableProps<T>) {
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
    
    return [...filteredData].sort((a, b) => {
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
  }, [filteredData, sortKey, sortDirection]);

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showFilters && filterableColumns.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant={showFilterRow ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilterRow(!showFilterRow)}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Filter
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
          {hasActiveFilters && (
            <span className="text-sm text-muted-foreground">
              {sortedData.length} of {data.length} items
            </span>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {showFilterRow && showFilters && (
              <TableRow className="bg-muted/30 hover:bg-muted/30">
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

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function TablePagination({
  page,
  pageSize,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onPageSizeChange,
  onNextPage,
  onPrevPage,
  onFirstPage,
  onLastPage,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-2 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:py-4">
      <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground">
        <span>
          {startIndex + 1}-{endIndex} dari {totalItems}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">Per halaman:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="h-8 w-[60px] md:w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 mx-auto sm:mx-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onFirstPage}
            disabled={!hasPrevPage}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onPrevPage}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-2">
            <span className="text-sm font-medium">{page}</span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onNextPage}
            disabled={!hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onLastPage}
            disabled={!hasNextPage}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

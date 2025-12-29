import { useState, useMemo } from "react";

interface UsePaginationProps {
  totalItems: number;
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  paginatedData: (data: T[]) => T[];
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

export function usePagination<T>({
  totalItems,
  initialPage = 1,
  initialPageSize = 10,
}: UsePaginationProps): UsePaginationReturn<T> {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 if current page exceeds total
  const safePage = Math.min(page, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const hasNextPage = safePage < totalPages;
  const hasPrevPage = safePage > 1;

  const paginatedData = useMemo(
    () => (data: T[]) => data.slice(startIndex, endIndex),
    [startIndex, endIndex]
  );

  const goToNextPage = () => {
    if (hasNextPage) setPage(safePage + 1);
  };

  const goToPrevPage = () => {
    if (hasPrevPage) setPage(safePage - 1);
  };

  const goToFirstPage = () => setPage(1);
  const goToLastPage = () => setPage(totalPages);

  return {
    page: safePage,
    pageSize,
    totalPages,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1); // Reset to first page when changing page size
    },
    paginatedData,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
  };
}

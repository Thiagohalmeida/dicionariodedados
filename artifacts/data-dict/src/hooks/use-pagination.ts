"use client";

import { useState, useCallback } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  maxLimit?: number;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
}

export interface UsePaginationReturn extends PaginationState {
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  goPrev: () => void;
  goNext: () => void;
  setTotal: (total: number) => void;
  rangeStart: number;
  rangeEnd: number;
}

export function usePagination({
  initialPage = 1,
  initialLimit = 20,
  maxLimit = 100,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const setPageClamped = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    if (canPrev) setPageClamped(page - 1);
  }, [canPrev, page, setPageClamped]);

  const goNext = useCallback(() => {
    if (canNext) setPageClamped(page + 1);
  }, [canNext, page, setPageClamped]);

  const setLimitClamped = useCallback((newLimit: number) => {
    const clamped = Math.max(1, Math.min(newLimit, maxLimit));
    setLimit(clamped);
    if (page > Math.ceil(total / clamped)) {
      setPage(Math.ceil(total / clamped));
    }
  }, [maxLimit, page, total]);

  return {
    page,
    limit,
    total,
    totalPages,
    canPrev,
    canNext,
    rangeStart,
    rangeEnd,
    setPage: setPageClamped,
    setLimit: setLimitClamped,
    goPrev,
    goNext,
    setTotal,
  };
}

export function getPaginationLabel(
  total: number,
  rangeStart: number,
  rangeEnd: number,
  itemLabelSingular: string,
  itemLabelPlural: string = itemLabelSingular + "s",
): string {
  if (total === 0) {
    return `Nenhum ${itemLabelSingular}`;
  }
  return `Exibindo ${rangeStart}–${rangeEnd} de ${total} ${total === 1 ? itemLabelSingular : itemLabelPlural}`;
}
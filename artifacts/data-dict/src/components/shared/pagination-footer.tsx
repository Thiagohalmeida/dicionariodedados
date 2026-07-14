"use client";

import { Button } from "@/components/ui/button";
import { usePagination, getPaginationLabel } from "@/hooks/use-pagination";

interface PaginationFooterProps {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  itemLabel?: string;
}

export function PaginationFooter({
  total,
  page,
  totalPages,
  limit,
  onPrev,
  onNext,
  canPrev,
  canNext,
  itemLabel = "item",
}: PaginationFooterProps) {
  const { rangeStart, rangeEnd } = usePagination({ initialPage: page, initialLimit: limit });
  // Override with actual values
  const actualRangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const actualRangeEnd = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>{getPaginationLabel(total, actualRangeStart, actualRangeEnd, itemLabel)}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={onPrev}>
          Anterior
        </Button>
        <span className="px-2">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" disabled={!canNext} onClick={onNext}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
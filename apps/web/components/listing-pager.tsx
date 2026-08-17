"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const PAGE_SIZES = [10, 20, 30, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_STORAGE_KEY = "dataroom-page-size";

export function isPageSize(value: number): value is (typeof PAGE_SIZES)[number] {
  return (PAGE_SIZES as readonly number[]).includes(value);
}

function pageWindow(current: number, last: number) {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(last, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export function ListingPager({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { t } = useI18n();
  if (total < 10) return null;

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const pages = pageWindow(page, lastPage);
  const showNumbers = total > pageSize;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        {t("pager.perPage")}
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      {showNumbers ? (
        <nav className="flex items-center gap-1" aria-label={t("pager.pages")}>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            {t("pager.prev")}
          </Button>
          {pages[0] > 1 ? (
            <>
              <PageButton current={page} value={1} onClick={onPageChange} />
              {pages[0] > 2 ? <span className="px-1 text-muted-foreground">…</span> : null}
            </>
          ) : null}
          {pages.map((value) => (
            <PageButton key={value} current={page} value={value} onClick={onPageChange} />
          ))}
          {pages[pages.length - 1] < lastPage ? (
            <>
              {pages[pages.length - 1] < lastPage - 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
              <PageButton current={page} value={lastPage} onClick={onPageChange} />
            </>
          ) : null}
          <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
            {t("pager.next")}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

function PageButton({
  current,
  value,
  onClick,
}: {
  current: number;
  value: number;
  onClick: (page: number) => void;
}) {
  return (
    <Button
      variant={current === value ? "default" : "outline"}
      size="sm"
      className={cn("min-w-8 px-2")}
      onClick={() => onClick(value)}
    >
      {value}
    </Button>
  );
}

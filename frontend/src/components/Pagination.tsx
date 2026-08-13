"use client";

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className="flex items-center justify-between px-4 py-3 text-sm"
      style={{ borderTop: "1px solid #d5dbdb", color: "#545b64" }}
    >
      <div className="flex items-center gap-2">
        <span>Showing</span>
        {onPageSizeChange ? (
          <select
            className="aws-select"
            style={{ width: "auto", padding: "2px 28px 2px 8px" }}
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-medium">{pageSize}</span>
        )}
        <span>
          of <strong>{total}</strong> results
        </span>
        {total > 0 && (
          <span>
            ({from}–{to})
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          className="btn-secondary px-2 py-1 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          «
        </button>
        <button
          className="btn-secondary px-2 py-1 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>
        {/* Page numbers */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              className={`px-3 py-1 text-xs rounded border ${
                pageNum === page
                  ? "border-[#0073bb] text-[#0073bb] bg-[#f0f8ff] font-semibold"
                  : "border-[#d5dbdb] bg-white hover:bg-[#f2f3f3]"
              }`}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          className="btn-secondary px-2 py-1 text-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next ›
        </button>
        <button
          className="btn-secondary px-2 py-1 text-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

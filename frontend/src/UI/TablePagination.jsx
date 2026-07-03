import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  const getPages = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push("...");

    pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex justify-end pt-2">
      <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-2 shadow-sm">
        {/* Back */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-2 text-teal-600 font-medium disabled:opacity-40"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Pages */}
        <div className="flex items-center gap-2">
          {getPages().map((page, index) =>
            page === "..." ? (
              <span key={index} className="px-2 text-lg text-slate-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`h-6 w-6 rounded-lg text-xs font-semibold transition
                  ${
                    currentPage === page
                      ? "bg-teal-50 border border-teal-600 text-teal-600 shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-teal-100"
                  }`}
              >
                {page}
              </button>
            ),
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2 text-teal-600 font-medium disabled:opacity-40"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

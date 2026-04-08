import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

function DateSortHeader({ label = "Date", direction = null, onToggle }) {
  const icon =
    direction === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : direction === "desc" ? (
      <ArrowDown className="h-4 w-4" />
    ) : (
      <ArrowUpDown className="h-4 w-4" />
    );

  const directionLabel =
    direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "unsorted";

  return (
    <th className="px-5 py-4 font-medium">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 text-left font-medium text-slate-500 hover:text-slate-800 transition"
        aria-label={`${label} sort ${directionLabel}`}
        title={`Sort ${label} ${direction === "asc" ? "descending" : "ascending"}`}
      >
        <span>{label}</span>
        {icon}
      </button>
    </th>
  );
}

export default DateSortHeader;

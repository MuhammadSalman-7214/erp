function DateSortHeader({ label = "Date" }) {
  return (
    <span className="inline-flex items-center text-left font-semibold text-slate-500">
      {label}
    </span>
  );
}

export default DateSortHeader;

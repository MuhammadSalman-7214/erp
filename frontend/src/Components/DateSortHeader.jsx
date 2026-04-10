function DateSortHeader({ label = "Date" }) {
  return (
    <th className="px-5 py-4 font-medium">
      <span className="inline-flex items-center text-left font-medium text-slate-500">
        {label}
      </span>
    </th>
  );
}

export default DateSortHeader;

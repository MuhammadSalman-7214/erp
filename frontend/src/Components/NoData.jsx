import { Database } from "lucide-react";

const NoData = ({
  title = "No Data Available",
  description = "No records match the current criteria. Try adjusting filters or adding new entries.",
  icon: Icon = Database,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(77,0,0,0.12),transparent_34%),radial-gradient(circle_at_88%_14%,rgba(109,16,16,0.08),transparent_30%)]" />
      {/* <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-teal-700" /> */}
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 ring-1 ring-teal-200 shadow-inner">
        <div className="absolute -inset-1 -z-10 rounded-2xl bg-teal-200/40 blur-md" />
        <Icon className="h-10 w-10 text-teal-700" />
      </div>
      <h3 className="relative text-lg font-extrabold tracking-tight text-slate-800">
        {title}
      </h3>
      <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      <div className="relative mx-auto mt-6 h-2 w-64 flex items-center justify-center">
        <div className="absolute left-0 h-1 w-[75%] bg-gradient-to-r from-teal-100 via-teal-300 to-transparent rounded-full" />
        <div className="absolute right-0 h-1 w-[75%] bg-gradient-to-l from-teal-100 via-teal-300 to-transparent rounded-full" />
        <div className="relative z-10 h-6 w-6 rounded-full bg-teal-700 shadow-lg ring-2 ring-teal-300" />
      </div>
    </div>
  );
};

export default NoData;

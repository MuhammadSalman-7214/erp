import { Database } from "lucide-react";

const NoData = ({
  title = "No Data Available",
  description = "No records match the current criteria. Try adjusting filters or adding new entries.",
  icon: Icon = Database,
}) => {
  return (
    <div className="px-6 py-12 text-center bg-transparent">
      {/* Icon */}
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md border border-2 border-teal-600/40">
        <Icon className="h-10 w-10 text-teal-600/80" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-extrabold tracking-tight text-slate-700">
        {title}
      </h3>

      {/* Description */}
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {description}
      </p>

      {/* Decorative line (soft + transparent look) */}
      <div className="relative mx-auto mt-6 h-2 w-64 flex items-center justify-center">
        <div className="absolute left-0 h-[2px] w-[75%] bg-gradient-to-r from-teal-600/40 via-teal-600/40 to-transparent rounded-full" />
        <div className="absolute right-0 h-[2px] w-[75%] bg-gradient-to-l from-teal-600/40 via-teal-600/40 to-transparent rounded-full" />
        <div className="relative z-10 h-4 w-4 rounded-full bg-teal-600" />
      </div>
    </div>
  );
};

export default NoData;

import { PackageSearch } from "lucide-react";

const NoData = ({
  title = "No Data Found",
  description = "We couldn’t find any records to display.",
  icon: Icon = PackageSearch,
}) => {
  return (
    <div className="app-card-soft flex flex-col items-center justify-center border border-dashed border-slate-300 px-6 py-10 text-center">
      {/* Icon */}
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-7 w-7 text-slate-500" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>

      {/* Description */}
      <p className="mt-2 text-sm text-slate-500 max-w-sm">{description}</p>
    </div>
  );
};

export default NoData;

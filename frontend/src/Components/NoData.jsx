import { Database } from "lucide-react";

const NoData = ({
  title = "No Data Available",
  description = "No records match the current criteria. Try adjusting filters or adding new entries.",
  icon: Icon = Database,
}) => {
  return (
    <div className="px-6 py-12 text-center bg-transparent">
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md border border-2 border-teal-600/40">
        <Icon className="h-10 w-10 text-teal-600/80" />
      </div>
      <h3 className="text-lg font-extrabold tracking-tight text-slate-700">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      <div className="relative mx-auto mt-6 h-4 w-72 flex items-center justify-center">
        <div className="absolute -left-[54px] h-[3px] w-[65%] bg-gradient-to-r from-teal-600/80 via-teal-600/40 to-teal-600/10 rounded-full" />
        <div className="absolute -right-[54px] h-[3px] w-[65%] bg-gradient-to-l from-teal-600/80 via-teal-600/40 to-teal-600/10 rounded-full" />
        <div className="relative z-10 h-8 w-8 rounded-full border-[14px] border-teal-600 bg-transparent" />
      </div>
    </div>
  );
};

export default NoData;

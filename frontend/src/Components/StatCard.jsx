function StatCard({ title, value, accent, icon }) {
  return (
    <div className="app-card group p-5">
      {/* <div
        className={`absolute top-0 left-0 z-[2] h-full w-1 ${accent} rounded-l-2xl`}
      /> */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <h3 className="mt-3 text-3xl font-bold text-slate-900">{value}</h3>
          <p className="mt-1 text-xs text-slate-400">Total Registered</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg transition group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}
export default StatCard;

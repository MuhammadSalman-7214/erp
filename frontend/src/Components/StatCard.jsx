function StatCard({ title, value, accent, icon }) {
  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Accent Line */}
      <div
        className={`absolute top-0 left-0 h-full w-1 ${accent} rounded-l-2xl`}
      />

      {/* Content */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold text-slate-900">{value}</h3>

          <p className="mt-1 text-xs text-slate-400">Total Registered</p>
        </div>

        {/* Icon Bubble */}
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg transition group-hover:bg-slate-900 group-hover:text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}
export default StatCard;

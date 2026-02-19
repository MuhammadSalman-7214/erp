function InfoStatCard({
  title,
  value,
  subtitle,
  icon,
  accentClass = "bg-teal-600",
  iconShellClass = "bg-teal-50 text-teal-700",
}) {
  return (
    <div className="app-card group p-5">
      <span className={`absolute inset-y-0 left-0 z-[2] w-1 ${accentClass}`} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold leading-none text-slate-900">
            {value}
          </p>
          {subtitle && (
            <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-colors duration-300 ${iconShellClass}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default InfoStatCard;

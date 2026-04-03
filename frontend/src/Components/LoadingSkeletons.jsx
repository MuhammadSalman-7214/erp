const SkeletonBlock = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />
);

const SkeletonLine = ({ className = "" }) => (
  <div className={`animate-pulse rounded-full bg-slate-200/80 ${className}`} />
);

export function DashboardSkeleton() {
  return (
    <div className="min-h-[92vh] bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <SkeletonLine className="h-4 w-72 mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border-2 border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonBlock className="h-5 w-5 rounded-md" />
            </div>
            <SkeletonLine className="h-8 w-32" />
          </div>
        ))}
      </div>

      <div className="mb-10">
        <SkeletonLine className="h-6 w-36 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <SkeletonBlock className="h-14 w-14 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="h-4 w-20" />
                  <SkeletonLine className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border-2 border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <SkeletonLine className="h-4 w-40" />
              <SkeletonBlock className="h-5 w-5" />
            </div>
            <SkeletonLine className="h-8 w-36" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl bg-white border-2 border-gray-100 p-5 shadow-md"
          >
            <div className="flex items-center justify-between mb-4">
              <SkeletonLine className="h-6 w-32" />
              <SkeletonBlock className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-3"
                >
                  <SkeletonLine className="h-4 w-28" />
                  <SkeletonLine className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, showFilters = true }) {
  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      {showFilters && (
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <SkeletonBlock className="h-10 w-full md:w-96 rounded-xl" />
          <SkeletonBlock className="h-10 w-full md:w-56 rounded-xl" />
          <SkeletonBlock className="h-10 w-full md:w-44 rounded-xl" />
        </div>
      )}

      <div className="mt-4 rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b px-5 py-4">
          <SkeletonLine className="h-5 w-40" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {Array.from({ length: 8 }).map((_, index) => (
                  <th key={index} className="px-5 py-4">
                    <SkeletonLine className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-b-0">
                  {Array.from({ length: 8 }).map((__, colIndex) => (
                    <td key={colIndex} className="px-5 py-4">
                      <SkeletonLine className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton({ stats = 4, tableRows = 5 }) {
  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="mb-4">
        <SkeletonLine className="h-8 w-56 mb-2" />
        <SkeletonLine className="h-4 w-80" />
      </div>

      <div className="bg-white rounded-2xl border p-5 shadow-sm mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-7 w-48" />
          </div>
          <div className="space-y-3">
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="h-4 w-52" />
            <SkeletonLine className="h-4 w-44" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {Array.from({ length: stats }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border-2 border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonBlock className="h-5 w-5" />
            </div>
            <SkeletonLine className="h-8 w-32" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <SkeletonLine className="h-6 w-40" />
          <SkeletonLine className="h-4 w-32" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {Array.from({ length: 6 }).map((_, index) => (
                  <th key={index} className="px-5 py-4">
                    <SkeletonLine className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: tableRows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-b-0">
                  {Array.from({ length: 6 }).map((__, colIndex) => (
                    <td key={colIndex} className="px-5 py-4">
                      <SkeletonLine className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm border">
        <SkeletonLine className="h-8 w-48 mb-6" />
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonBlock className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <SkeletonBlock className="h-10 w-32 rounded-lg" />
          <SkeletonBlock className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 6 }) {
  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex justify-end mb-4">
        <SkeletonBlock className="h-10 w-52 rounded-xl" />
      </div>
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        {Array.from({ length: items }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b last:border-b-0 px-6 py-4"
          >
            <SkeletonBlock className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-4 w-40" />
              <SkeletonLine className="h-3 w-64" />
            </div>
            <SkeletonBlock className="h-10 w-10 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <SkeletonBlock className="h-10 w-28 rounded-lg" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10 w-32 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white shadow p-8">
        <SkeletonLine className="h-8 w-64 mb-6" />
        <SkeletonBlock className="h-[297mm] w-full rounded-xl" />
      </div>
    </div>
  );
}

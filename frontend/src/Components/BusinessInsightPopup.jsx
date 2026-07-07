import { X, Sparkles, Trophy, BarChart3 } from "lucide-react";

const formatCurrency = (value) => {
  const numeric = Number(value);
  return `Rs ${Number.isFinite(numeric) ? numeric.toLocaleString() : "0"}`;
};

const formatAiSummary = (summary) =>
  String(summary || "")
    .replace(/\$\s*/g, "Rs ")
    .replace(/\bUSD\s*/gi, "Rs ")
    .replace(/\bUS\$\s*/gi, "Rs ")
    .replace(/\s{2,}/g, " ")
    .trim();

function BusinessInsightPopup({ open, insight, onConfirm, loading = false }) {
  if (!open || !insight) {
    return null;
  }

  const bestProduct = insight?.stats?.overallBestSellingProduct || {};
  const recommendations = Array.isArray(insight?.aiRecommendations)
    ? insight.aiRecommendations.filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl overflow-hidden rounded-lg border border-teal-100 bg-white text-slate-800 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-100/80 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-48 w-48 rounded-full bg-cyan-100/70 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(180deg,_rgba(240,253,250,0.9),_rgba(255,255,255,0.98))] px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-200">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-600">
                Daily Intelligence
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                AI Business Insights
              </h2>
            </div>
          </div>
        </div>

        <div className="relative grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            <div className="rounded-lg border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
                <Trophy className="h-4 w-4" />
                Overall Best Selling Product
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-slate-900">
                  {bestProduct?.name || "No sales recorded"}
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Units Sold
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {(
                        Number(bestProduct?.quantitySold) || 0
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-white p-4 sm:col-span-2 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Revenue Generated
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {formatCurrency(bestProduct?.revenueGenerated)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
                <BarChart3 className="h-4 w-4" />
                Business Summary
              </div>
              <p className="text-sm leading-7 text-slate-700">
                {formatAiSummary(insight?.aiSummary) ||
                  "No AI summary was generated for today."}
              </p>
            </div>
          </section>

          <aside className="max-h-[55vh] overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
              <Sparkles className="h-4 w-4" />
              AI Recommendations
            </div>

            {recommendations.length > 0 ? (
              <ul className="space-y-3">
                {recommendations.slice(0, 6).map((recommendation, index) => (
                  <li
                    key={`${index}-${recommendation}`}
                    className="flex gap-3 rounded-lg border border-teal-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-7 text-slate-600">
                No recommendations are available for today.
              </p>
            )}

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Saving..." : "Got It"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default BusinessInsightPopup;

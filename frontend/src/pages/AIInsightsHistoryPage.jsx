import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../lib/axios";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
} from "lucide-react";

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

const formatDate = (dateValue) => {
  if (!dateValue) return "Unknown date";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

function AIInsightsHistoryPage() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(
          "/dashboard/insights/history?limit=14",
        );
        setInsights(
          Array.isArray(response.data?.insights) ? response.data.insights : [],
        );
        setExpandedId(response.data?.insights?.[0]?.id || null);
      } catch (err) {
        console.error("Failed to load AI insight history:", err);
        setError(
          err?.response?.data?.message || "Unable to load insight history",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  const totalInsights = insights.length;

  const latestInsight = useMemo(() => insights[0] || null, [insights]);

  return (
    <div className="min-h-[92vh] bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-4">
      <div className="mb-4 rounded-lg border border-teal-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              <Sparkles className="h-3.5 w-3.5" />
              AI Insights Archive
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Business Insights History
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review the latest 14 AI insights, recommendations, and product
              performance snapshots.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Total Reports
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {totalInsights}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Latest Date
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {formatDate(latestInsight?.date)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Status
              </p>
              <p className="mt-2 text-base font-semibold text-teal-700">
                {loading ? "Loading" : "Ready"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm animate-pulse"
              >
                <div className="h-5 w-44 rounded-full bg-slate-200" />
                <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
                <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100" />
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="h-24 rounded-lg bg-slate-100" />
                  <div className="h-24 rounded-lg bg-slate-100" />
                  <div className="h-24 rounded-lg bg-slate-100" />
                </div>
              </div>
            ))
          : insights.map((insight) => {
              const expanded = expandedId === insight.id;
              const recommendations = Array.isArray(insight.aiRecommendations)
                ? insight.aiRecommendations
                : [];
              const bestProduct =
                insight?.stats?.overallBestSellingProduct || {};
              const lowSellingProducts = Array.isArray(
                insight?.stats?.lowestSellingProducts,
              )
                ? insight.stats.lowestSellingProducts.slice(0, 3)
                : [];
              const neverSoldProducts = Array.isArray(
                insight?.stats?.productsNeverSold,
              )
                ? insight.stats.productsNeverSold.slice(0, 3)
                : [];

              return (
                <div
                  key={insight.id}
                  className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : insight.id)}
                    className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition hover:bg-slate-50"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(insight.date)}
                      </div>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">
                        Daily Insight
                      </h2>
                      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                        {formatAiSummary(insight.aiSummary) ||
                          "No summary available."}
                      </p>
                    </div>

                    <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
                      {expanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </button>

                  {expanded ? (
                    <div className="border-t border-slate-100 px-5 py-5">
                      <div className="grid gap-4 xl:grid-cols-3">
                        <div className="rounded-lg border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                            <Trophy className="h-4 w-4" />
                            Best Selling Product
                          </div>
                          <p className="text-lg font-semibold text-slate-900">
                            {bestProduct?.name || "No sales recorded"}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            Units Sold:{" "}
                            {Number(
                              bestProduct?.quantitySold || 0,
                            ).toLocaleString()}
                          </p>
                          <p className="text-sm text-slate-600">
                            Revenue:{" "}
                            {formatCurrency(bestProduct?.revenueGenerated)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                            <BarChart3 className="h-4 w-4" />
                            AI Summary
                          </div>
                          <p className="text-sm leading-7 text-slate-700">
                            {formatAiSummary(insight.aiSummary) ||
                              "No summary available."}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                            <Sparkles className="h-4 w-4" />
                            Recommendations
                          </div>
                          <ul className="space-y-2">
                            {recommendations.length > 0 ? (
                              recommendations.slice(0, 6).map((item, index) => (
                                <li
                                  key={`${insight.id}-${index}`}
                                  className="rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                                >
                                  {item}
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-slate-500">
                                No recommendations available.
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">
                            Low Selling Products
                          </h3>
                          <ul className="mt-3 space-y-2">
                            {lowSellingProducts.length > 0 ? (
                              lowSellingProducts.map((product, index) => (
                                <li
                                  key={`${insight.id}-low-${index}`}
                                  className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-slate-700"
                                >
                                  {product?.name || "Unknown Product"} - Units
                                  Sold:{" "}
                                  {Number(
                                    product?.quantitySold || 0,
                                  ).toLocaleString()}
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-slate-500">
                                No low-selling products found.
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">
                            Never Sold Products
                          </h3>
                          <ul className="mt-3 space-y-2">
                            {neverSoldProducts.length > 0 ? (
                              neverSoldProducts.map((product, index) => (
                                <li
                                  key={`${insight.id}-never-${index}`}
                                  className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-slate-700"
                                >
                                  {product?.name || "Unknown Product"}
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-slate-500">
                                No never-sold products found.
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
      </div>
    </div>
  );
}

export default AIInsightsHistoryPage;

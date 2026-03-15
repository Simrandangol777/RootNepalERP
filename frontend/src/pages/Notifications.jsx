import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import DashboardLayout from "../components/DashboardLayout";
import {
  EMPTY_REPORT_DATA,
  getApiErrorMessage,
  getRestockPriorityMeta,
  normalizeReportData,
} from "../utils/reportData";

const priorityFilters = ["All", "High", "Medium", "Low"];

const priorityDescriptions = {
  High: "Critical restock pressure",
  Medium: "Needs action soon",
  Low: "Can be bundled later",
};

const Notifications = () => {
  const [reportData, setReportData] = useState(EMPTY_REPORT_DATA);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("reports/dashboard/", { params: { date_range: "all_time" } });
      setReportData(normalizeReportData(res.data));
      setMessage((prev) => (prev.type === "error" ? { type: "", text: "" } : prev));
    } catch (error) {
      setReportData(EMPTY_REPORT_DATA);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to load smart restock notifications."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const restockSuggestions = Array.isArray(reportData.restockSuggestions)
    ? reportData.restockSuggestions
    : [];

  const counts = useMemo(
    () =>
      restockSuggestions.reduce(
        (acc, item) => {
          const priority = item?.priority;
          acc.total += 1;
          if (priority === "High") acc.high += 1;
          if (priority === "Medium") acc.medium += 1;
          if (priority === "Low") acc.low += 1;
          return acc;
        },
        { total: 0, high: 0, medium: 0, low: 0 }
      ),
    [restockSuggestions]
  );

  const filteredSuggestions = useMemo(() => {
    const ranked = [...restockSuggestions].sort((left, right) => {
      const leftMeta = getRestockPriorityMeta(left?.priority);
      const rightMeta = getRestockPriorityMeta(right?.priority);

      if (leftMeta.order !== rightMeta.order) return leftMeta.order - rightMeta.order;
      return Number(left?.currentStock ?? 0) - Number(right?.currentStock ?? 0);
    });

    if (severityFilter === "All") return ranked;
    return ranked.filter((item) => item?.priority === severityFilter);
  }, [restockSuggestions, severityFilter]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Smart Restock Feed
            </div>
            <h2 className="text-3xl font-bold text-white">Notifications</h2>
            <p className="mt-2 max-w-2xl text-white/70">
              A focused restock view for the products that need attention first. Red means urgent,
              amber means act soon, and green means it can wait for the next buying cycle.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/reports"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
            >
              Open full reports
            </Link>
            <button
              type="button"
              onClick={fetchNotifications}
              className="group relative px-5 py-2"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-50 blur-lg transition-opacity group-hover:opacity-75"></div>
              <div className="relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white transition-transform group-hover:scale-[1.02]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh alerts
              </div>
            </button>
          </div>
        </div>

        {message.text && (
          <div
            className={`rounded-2xl border p-4 ${
              message.type === "error"
                ? "border-red-500/25 bg-red-500/10 text-red-200"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
            <p className="text-sm text-white/60">Total active notifications</p>
            <p className="mt-3 text-3xl font-bold text-white">{counts.total}</p>
            <p className="mt-2 text-sm text-cyan-300">Smart restock items being tracked</p>
          </div>

          <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.08] p-5">
            <p className="text-sm text-red-200/80">High priority</p>
            <p className="mt-3 text-3xl font-bold text-red-200">{counts.high}</p>
            <p className="mt-2 text-sm text-red-300">Immediate reorder recommended</p>
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-5">
            <p className="text-sm text-amber-200/80">Medium priority</p>
            <p className="mt-3 text-3xl font-bold text-amber-200">{counts.medium}</p>
            <p className="mt-2 text-sm text-amber-300">Needs attention in the next cycle</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-5">
            <p className="text-sm text-emerald-200/80">Low priority</p>
            <p className="mt-3 text-3xl font-bold text-emerald-200">{counts.low}</p>
            <p className="mt-2 text-sm text-emerald-300">Safe to batch into future purchasing</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Alert priority</h3>
              <p className="text-sm text-white/60">
                Filter by urgency to focus on the products that need the fastest response.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {priorityFilters.map((priority) => {
                const isActive = severityFilter === priority;
                const meta =
                  priority === "All"
                    ? {
                        badgeClass: "border border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
                      }
                    : getRestockPriorityMeta(priority);

                return (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setSeverityFilter(priority)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? meta.badgeClass
                        : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {priority === "All" ? "All alerts" : priorityDescriptions[priority]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading && (
            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white/70 backdrop-blur-xl">
              Loading smart restock notifications...
            </div>
          )}

          {!isLoading && filteredSuggestions.length === 0 && (
            <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center backdrop-blur-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">No notifications in this view</h3>
              <p className="mt-2 text-white/60">
                The current filter has no smart restock suggestions right now.
              </p>
            </div>
          )}

          {!isLoading &&
            filteredSuggestions.map((item, index) => {
              const meta = getRestockPriorityMeta(item.priority);
              const currentStock = Number(item.currentStock ?? 0);
              const reorderLevel = Number(item.reorderLevel ?? 0);
              const predictedDemand = Number(item.predictedDemand ?? 0);
              const suggestedQty = Number(item.suggestedQty ?? 0);
              const shortfall = Math.max(reorderLevel - currentStock, 0);
              const demandGap = Math.max(predictedDemand - currentStock, 0);

              return (
                <div
                  key={`${item.product}-${index}`}
                  className={`overflow-hidden rounded-3xl border bg-white/10 backdrop-blur-xl ${meta.softCardClass}`}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${meta.accentClass}`}></div>
                  <div className="p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${meta.iconClass}`}>
                          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-4.418 0-8 2.239-8 5s3.582 5 8 5 8-2.239 8-5-3.582-5-8-5zm0 0V5m0 13v1m0-14a3 3 0 013 3m-3-3a3 3 0 00-3 3" />
                          </svg>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-white">{item.product}</h3>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-white/70">
                            {currentStock === 0
                              ? "Currently out of stock and at immediate risk of missed sales."
                              : `Running ${shortfall} units below the reorder level and ${demandGap} units behind projected demand.`}
                          </p>
                          <p className={`mt-3 text-sm font-medium ${meta.textClass}`}>{meta.message}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[28rem]">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/50">In stock</p>
                          <p className="mt-2 text-2xl font-bold text-white">{currentStock}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Reorder at</p>
                          <p className="mt-2 text-2xl font-bold text-white">{reorderLevel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Demand</p>
                          <p className="mt-2 text-2xl font-bold text-white">{predictedDemand}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Restock qty</p>
                          <p className="mt-2 text-2xl font-bold text-white">{suggestedQty}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/60">Lead time</p>
                        <p className="mt-1 text-base font-semibold text-white">{item.leadTime}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/60">Restock risk</p>
                        <p className={`mt-1 text-base font-semibold ${meta.textClass}`}>
                          {currentStock === 0 ? "Zero stock on hand" : `${shortfall} unit reorder gap`}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/60">Next action</p>
                        <p className="mt-1 text-base font-semibold text-white">
                          {item.priority === "High"
                            ? "Place order now"
                            : item.priority === "Medium"
                              ? "Schedule supplier follow-up"
                              : "Bundle with upcoming PO"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;

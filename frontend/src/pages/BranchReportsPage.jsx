// src/pages/BranchReportsPage.jsx - NEW

import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import {
  fetchSummaryReport,
  fetchShipmentPnlReport,
} from "../features/reportSlice";
import { AnimatedNumber } from "../lib/animatedNumber.js";
import NoData from "../Components/NoData";

const formatNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
};

const BranchReportsPage = () => {
  const { summary, shipmentPnl, isLoadingSummary, isLoadingShipmentPnl } =
    useSelector((state) => state.reports);
  const dispatch = useDispatch();
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  useEffect(() => {
    dispatch(fetchSummaryReport({ startDate, endDate }));
    dispatch(fetchShipmentPnlReport({ startDate, endDate, limit: 50 }));
  }, [dispatch, startDate, endDate]);

  const handleExport = (format) => {
    const url = `/api/reports/summary/export?format=${format}&startDate=${startDate}&endDate=${endDate}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="app-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start Date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="app-input"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                End Date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="app-input"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="app-button-secondary"
              onClick={() => handleExport("csv")}
            >
              Export CSV
            </button>
            <button className="app-button" onClick={() => handleExport("pdf")}>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="">
        {isLoadingSummary ? (
          <p className="text-sm text-slate-500">Loading summary...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summary?.totals &&
              Object.entries(summary.totals).map(([key, value]) => (
                <div key={key} className="app-metric-card">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {key}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    Local {formatNumber(value.totalLocal)}
                  </p>
                  <p className="text-sm text-slate-600">
                    USD {formatNumber(value.totalUSD)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Count: {value.count}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Shipment P&L (Latest 50)
          </h2>
          <div className="rounded-xl bg-[#fdf4f4] px-4 py-2 text-right ring-1 ring-[#520505]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#520505]">
              Total Profit USD:{" "}
            </span>
            <AnimatedNumber value={shipmentPnl?.totals?.totalProfitUSD} />
          </div>
        </div>
        {isLoadingShipmentPnl ? (
          <p className="text-sm text-slate-500">Loading shipment P&L...</p>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>Profit USD</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(shipmentPnl?.data || []).map((row) => (
                  <tr key={row._id}>
                    <td>{row.shipmentNumber}</td>
                    <td>{row.shipmentType}</td>
                    <td>{row.transportMode}</td>
                    <td>
                      {row.currency} {formatNumber(row.sellingPrice)}
                    </td>
                    <td>
                      {row.currency} {formatNumber(row.totalCost)}
                    </td>
                    <td>
                      {row.currency} {formatNumber(row.profitLoss)}
                    </td>
                    <td>USD {formatNumber(row.profitLossUSD)}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
                {(!shipmentPnl?.data || shipmentPnl.data.length === 0) && (
                  <tr>
                    <td
                      className="px-2 py-4 text-center text-slate-500"
                      colSpan={10}
                    >
                      <NoData
                        title="Shipment"
                        description="No shipments in this range."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchReportsPage;

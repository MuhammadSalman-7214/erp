// src/pages/CountryReportsPage.jsx - NEW

import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { fetchSummaryReport, fetchShipmentPnlReport } from "../features/reportSlice";

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

const CountryReportsPage = () => {
  const { user } = useSelector((state) => state.auth);
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Country Reports</h1>
      <p className="text-gray-600">
        Reports for {user?.country?.name || "all countries"}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <div className="flex gap-2">
          <button
            className="px-3 py-2 bg-slate-900 text-white rounded"
            onClick={() => handleExport("csv")}
          >
            Export CSV
          </button>
          <button
            className="px-3 py-2 bg-slate-900 text-white rounded"
            onClick={() => handleExport("pdf")}
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {isLoadingSummary ? (
          <p className="text-gray-600">Loading summary...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary?.totals &&
              Object.entries(summary.totals).map(([key, value]) => (
                <div key={key} className="border rounded p-4">
                  <p className="text-sm text-slate-500 uppercase">{key}</p>
                  <p className="text-lg font-semibold">
                    Local {formatNumber(value.totalLocal)}
                  </p>
                  <p className="text-sm text-slate-600">
                    USD {formatNumber(value.totalUSD)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Count: {value.count}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Shipment P&L (Latest 50)
          </h2>
          <div className="text-xs text-slate-500">
            Total Profit USD:{" "}
            {formatNumber(shipmentPnl?.totals?.totalProfitUSD)}
          </div>
        </div>
        {isLoadingShipmentPnl ? (
          <p className="text-gray-600">Loading shipment P&L...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Shipment</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Mode</th>
                  <th className="py-2">Revenue</th>
                  <th className="py-2">Cost</th>
                  <th className="py-2">Profit</th>
                  <th className="py-2">Profit USD</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(shipmentPnl?.data || []).map((row) => (
                  <tr key={row._id} className="border-t">
                    <td className="py-2">{row.shipmentNumber}</td>
                    <td className="py-2">{row.shipmentType}</td>
                    <td className="py-2">{row.transportMode}</td>
                    <td className="py-2">
                      {row.currency} {formatNumber(row.sellingPrice)}
                    </td>
                    <td className="py-2">
                      {row.currency} {formatNumber(row.totalCost)}
                    </td>
                    <td className="py-2">
                      {row.currency} {formatNumber(row.profitLoss)}
                    </td>
                    <td className="py-2">
                      USD {formatNumber(row.profitLossUSD)}
                    </td>
                    <td className="py-2">{row.status}</td>
                  </tr>
                ))}
                {(!shipmentPnl?.data || shipmentPnl.data.length === 0) && (
                  <tr>
                    <td className="py-3 text-slate-500" colSpan={8}>
                      No shipments in this range.
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

export default CountryReportsPage;

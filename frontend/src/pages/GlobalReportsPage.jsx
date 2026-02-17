// src/pages/GlobalReportsPage.jsx - NEW

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSummaryReport,
  fetchCountryReport,
  fetchShipmentPnlReport,
} from "../features/reportSlice";
import NoData from "../Components/NoData";
import { AnimatedNumber } from "../lib/animatedNumber";

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

const GlobalReportsPage = () => {
  const dispatch = useDispatch();
  const {
    summary,
    byCountry,
    shipmentPnl,
    isLoadingSummary,
    isLoadingByCountry,
    isLoadingShipmentPnl,
  } = useSelector((state) => state.reports);
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  useEffect(() => {
    dispatch(fetchSummaryReport({ startDate, endDate }));
    dispatch(fetchCountryReport({ startDate, endDate }));
    dispatch(fetchShipmentPnlReport({ startDate, endDate, limit: 50 }));
  }, [dispatch, startDate, endDate]);

  const handleExport = (endpoint, format) => {
    const url = `/api/reports/${endpoint}/export?format=${format}&startDate=${startDate}&endDate=${endDate}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Global Reports (USD)</h1>
      <p className="text-gray-600">All figures displayed in USD</p>

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
            className="px-3 py-2 bg-teal-700 hover:bg-teal-800 transition duration-300 text-white rounded"
            onClick={() => handleExport("summary", "csv")}
          >
            Export Summary CSV
          </button>
          <button
            className="px-3 py-2 bg-teal-700 hover:bg-teal-800 transition duration-300 text-white rounded"
            onClick={() => handleExport("summary", "pdf")}
          >
            Export Summary PDF
          </button>
          <button
            className="px-3 py-2 bg-teal-700 hover:bg-teal-800 transition duration-300 text-white rounded"
            onClick={() => handleExport("by-country", "csv")}
          >
            Export Country CSV
          </button>
          <button
            className="px-3 py-2 bg-teal-700 hover:bg-teal-800 transition duration-300 text-white rounded"
            onClick={() => handleExport("by-country", "pdf")}
          >
            Export Country PDF
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
                    USD {formatNumber(value.totalUSD)}
                  </p>
                  <p className="text-xs text-slate-400">Count: {value.count}</p>
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
          <div className="inline-block bg-gradient-to-r from-teal-600 via-teal-400 to-teal-600 text-teal-800 font-extrabold text-lg px-5 py-2 rounded-2xl shadow-sm transform transition duration-500 hover:scale-105 animate-breath-slow animate-glow-slow">
            <span className="text-sm">TOTAL PROFIT USD: </span>
            <AnimatedNumber value={shipmentPnl?.totals?.totalProfitUSD} />
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
                  <th className="py-2">Country</th>
                  <th className="py-2">Branch</th>
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
                    <td className="py-2">{row.countryId?.name || "Unknown"}</td>
                    <td className="py-2">{row.branchId?.name || "-"}</td>
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
                    <td
                      className="py-3 text-slate-500 text-center"
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

      <div className="bg-white rounded-lg shadow p-6">
        {isLoadingByCountry ? (
          <p className="text-gray-600">Loading country consolidation...</p>
        ) : (
          <div className="space-y-4">
            {byCountry?.byCountry &&
              Object.entries(byCountry.byCountry).map(([moduleName, rows]) => (
                <div key={moduleName}>
                  <h3 className="text-lg font-semibold">{moduleName}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-2">Country</th>
                          <th className="py-2">Currency</th>
                          <th className="py-2">Count</th>
                          <th className="py-2">Local</th>
                          <th className="py-2">USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rows || []).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="py-2">
                              {row.countryName || "Unknown"}
                            </td>
                            <td className="py-2">{row.currency || "-"}</td>
                            <td className="py-2">{row.count}</td>
                            <td className="py-2">
                              {formatNumber(row.totalLocal)}
                            </td>
                            <td className="py-2">
                              {formatNumber(row.totalUSD)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalReportsPage;

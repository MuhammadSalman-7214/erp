import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiTruck, FiArrowRight, FiPlus } from "react-icons/fi";
import Button from "../UI/Button";
import { fetchWarehouses } from "../features/warehouseSlice";
import { fetchFulfillments, createFulfillment } from "../features/fulfillmentSlice";
import { gettingallSales } from "../features/salesSlice";

const OPEN_SALE_STATUSES = ["pending"];

const statusBadge = (status) => {
  const styles = {
    RESERVED: "bg-sky-100 text-sky-800",
    PICKING: "bg-amber-100 text-amber-800",
    PICKED: "bg-violet-100 text-violet-800",
    DISPATCHED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-slate-100 text-slate-500",
  };
  return styles[status] || "bg-slate-100 text-slate-700";
};

const FulfillmentTasksPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { warehouses } = useSelector((state) => state.warehouse);
  const { fulfillments, isLoadingFulfillments } = useSelector((state) => state.fulfillment);
  const { getallsales } = useSelector((state) => state.sales);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    dispatch(fetchWarehouses());
    dispatch(fetchFulfillments());
    dispatch(gettingallSales({ pageSize: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length) {
      const defaultWarehouse = warehouses.find((w) => w.is_default) || warehouses[0];
      setSelectedWarehouseId(String(defaultWarehouse.id));
    }
  }, [warehouses, selectedWarehouseId]);

  const eligibleSales = useMemo(
    () => (getallsales || []).filter((sale) => OPEN_SALE_STATUSES.includes(sale.status)),
    [getallsales],
  );

  const handleStartFulfillment = async () => {
    if (!selectedSaleId || !selectedWarehouseId) {
      toast.error("Choose a warehouse and a sale first");
      return;
    }
    setIsStarting(true);
    const result = await dispatch(
      createFulfillment({ saleId: Number(selectedSaleId), warehouseId: Number(selectedWarehouseId) }),
    );
    setIsStarting(false);
    if (createFulfillment.fulfilled.match(result)) {
      navigate(`/warehouse/fulfillment/${result.payload.fulfillment.id}`);
    } else {
      toast.error(result.payload || "Could not start fulfillment");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
            <FiTruck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Fulfillment</h1>
            <p className="text-sm text-slate-500">Reserve, pick &amp; dispatch sales</p>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Start a new fulfillment</h2>

          {warehouses.length > 1 && (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">Warehouse</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="mb-1 block text-xs font-medium text-slate-600">Sale</label>
          <select
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
            value={selectedSaleId}
            onChange={(e) => setSelectedSaleId(e.target.value)}
          >
            <option value="">Select a sale…</option>
            {eligibleSales.map((sale) => (
              <option key={sale.id} value={sale.id}>
                {sale.invoiceNumber || `Sale #${sale.id}`} — {sale.customerName} — Rs.{" "}
                {sale.totalAmount}
              </option>
            ))}
          </select>

          <Button
            size="lg"
            className="w-full"
            onClick={handleStartFulfillment}
            loading={isStarting}
            disabled={!eligibleSales.length}
          >
            <FiPlus /> Start Fulfillment
          </Button>
          {!eligibleSales.length && (
            <p className="mt-2 text-xs text-slate-500">
              No pending sales are currently open for fulfillment.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-800">My fulfillment tasks</h2>
          {isLoadingFulfillments ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : fulfillments.length ? (
            <ul className="space-y-2">
              {fulfillments.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => navigate(`/warehouse/fulfillment/${f.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm active:bg-slate-100"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{f.fulfillment_no}</p>
                      <p className="text-xs text-slate-500">{f.warehouseName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(f.status)}`}
                      >
                        {f.status}
                      </span>
                      <FiArrowRight className="text-slate-400" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No fulfillment tasks yet.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default FulfillmentTasksPage;

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiPackage, FiArrowRight, FiPlus } from "react-icons/fi";
import Button from "../UI/Button";
import { fetchWarehouses } from "../features/warehouseSlice";
import { fetchReceipts, createReceipt } from "../features/receivingSlice";
import { gettingallOrder } from "../features/orderSlice";

const OPEN_ORDER_STATUSES = ["pending", "shipped", "partially_received"];

const statusBadge = (status) => {
  const styles = {
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
  };
  return styles[status] || "bg-slate-100 text-slate-700";
};

const ReceivingTasksPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { warehouses } = useSelector((state) => state.warehouse);
  const { receipts, isLoadingReceipts } = useSelector((state) => state.receiving);
  const { getorder } = useSelector((state) => state.order);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    dispatch(fetchWarehouses());
    dispatch(fetchReceipts());
    dispatch(gettingallOrder({ pageSize: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length) {
      const defaultWarehouse = warehouses.find((w) => w.is_default) || warehouses[0];
      setSelectedWarehouseId(String(defaultWarehouse.id));
    }
  }, [warehouses, selectedWarehouseId]);

  const eligibleOrders = useMemo(
    () => (getorder || []).filter((order) => OPEN_ORDER_STATUSES.includes(order.status)),
    [getorder],
  );

  const handleStartReceipt = async () => {
    if (!selectedOrderId || !selectedWarehouseId) {
      toast.error("Choose a warehouse and a purchase order first");
      return;
    }
    setIsStarting(true);
    const result = await dispatch(
      createReceipt({ orderId: Number(selectedOrderId), warehouseId: Number(selectedWarehouseId) }),
    );
    setIsStarting(false);
    if (createReceipt.fulfilled.match(result)) {
      navigate(`/warehouse/receiving/${result.payload.receipt.id}`);
    } else {
      toast.error(result.payload || "Could not start goods receipt");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
            <FiPackage size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Receiving</h1>
            <p className="text-sm text-slate-500">Scan-first goods receiving</p>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Start a new receipt</h2>

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

          <label className="mb-1 block text-xs font-medium text-slate-600">Purchase order</label>
          <select
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
          >
            <option value="">Select an order…</option>
            {eligibleOrders.map((order) => (
              <option key={order.id} value={order.id}>
                Order #{order.id} — {order.status} — Rs. {order.totalAmount}
              </option>
            ))}
          </select>

          <Button
            size="lg"
            className="w-full"
            onClick={handleStartReceipt}
            loading={isStarting}
            disabled={!eligibleOrders.length}
          >
            <FiPlus /> Start Receiving
          </Button>
          {!eligibleOrders.length && (
            <p className="mt-2 text-xs text-slate-500">
              No purchase orders are currently open for receiving.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-800">My receiving tasks</h2>
          {isLoadingReceipts ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : receipts.length ? (
            <ul className="space-y-2">
              {receipts.map((receipt) => (
                <li key={receipt.id}>
                  <button
                    onClick={() => navigate(`/warehouse/receiving/${receipt.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm active:bg-slate-100"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{receipt.receipt_no}</p>
                      <p className="text-xs text-slate-500">{receipt.warehouseName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(receipt.status)}`}
                      >
                        {receipt.status}
                      </span>
                      <FiArrowRight className="text-slate-400" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No receiving tasks yet.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReceivingTasksPage;

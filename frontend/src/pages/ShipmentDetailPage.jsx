// src/pages/ShipmentDetailPage.jsx - NEW

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { toast } from "react-hot-toast";

const ShipmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useRolePermissions();
  const [shipment, setShipment] = useState(null);
  const [profit, setProfit] = useState(null);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [docType, setDocType] = useState("");
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchShipment = async () => {
    try {
      const res = await axiosInstance.get(`/shipment/${id}`);
      setShipment(res.data);
      setStatus(res.data.status || "");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shipment");
    }
  };

  const fetchProfit = async () => {
    try {
      const res = await axiosInstance.get(`/shipment/${id}/profit`);
      setProfit(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchShipment();
      await fetchProfit();
      setLoading(false);
    };
    load();
  }, [id]);

  const updateStatus = async () => {
    try {
      await axiosInstance.patch(`/shipment/${id}/status`, { status, note });
      toast.success("Status updated");
      fetchShipment();
      fetchProfit();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const addDocument = async () => {
    if (!docType || !docName || !docUrl) {
      return toast.error("Document type, name and URL are required");
    }
    try {
      await axiosInstance.post(`/shipment/${id}/document`, {
        documentType: docType,
        documentName: docName,
        documentUrl: docUrl,
      });
      toast.success("Document added");
      setDocType("");
      setDocName("");
      setDocUrl("");
      fetchShipment();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add document");
    }
  };

  const addExpense = async () => {
    if (!expenseType || expenseAmount === "") {
      return toast.error("Expense type and amount are required");
    }
    try {
      await axiosInstance.post(`/shipment/${id}/expense`, {
        expenseType,
        amount: Number(expenseAmount),
        currency: expenseCurrency || shipment?.currency || "USD",
        description: expenseNote || undefined,
      });
      toast.success("Expense added");
      setExpenseType("");
      setExpenseAmount("");
      setExpenseCurrency("");
      setExpenseNote("");
      fetchShipment();
      fetchProfit();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expense");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 bg-slate-200 rounded"
        >
          Back
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-gray-600">
          Loading shipment...
        </div>
      ) : !shipment ? (
        <div className="bg-white rounded-lg shadow p-6 text-gray-600">
          Shipment not found.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-6 space-y-2">
            <div className="font-semibold">{shipment.shipmentNumber}</div>
            <div>Type: {shipment.shipmentType}</div>
            <div>Mode: {shipment.transportMode}</div>
            <div>Status: {shipment.status}</div>
            <div>Container: {shipment.containerNumber || "-"}</div>
            <div>Container Type: {shipment.containerType || "-"}</div>
            <div>Packages: {shipment.numberOfPackages || "-"}</div>
            <div>
              Origin Country: {shipment.originCountry || "-"}
            </div>
            <div>
              Destination Country: {shipment.destinationCountry || "-"}
            </div>
            <div>Origin: {shipment.originPort || shipment.originCountry || "-"}</div>
            <div>
              Destination: {shipment.destinationPort || shipment.destinationCountry || "-"}
            </div>
            <div>
              Total Cost: {shipment.currency}{" "}
              {Number(shipment.totalCost || 0).toLocaleString()}
            </div>
            <div>
              Duties: {shipment.currency}{" "}
              {Number(shipment.customsDuty || 0).toLocaleString()}
            </div>
            <div>
              Freight: {shipment.currency}{" "}
              {Number(shipment.freightCharges || 0).toLocaleString()}
            </div>
            <div>
              Port/Other: {shipment.currency}{" "}
              {Number(shipment.otherExpenses || 0).toLocaleString()}
            </div>
          </div>

          {profit && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">Shipment P&L</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  Revenue: {profit.currency}{" "}
                  {Number(profit.revenue?.sellingPrice || 0).toLocaleString()}
                </div>
                <div>
                  Cost: {profit.currency}{" "}
                  {Number(profit.costs?.totalCost || 0).toLocaleString()}
                </div>
                <div>
                  Profit: {profit.currency}{" "}
                  {Number(profit.profitLoss?.amount || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {hasPermission("shipment", "write") && (
            <div className="bg-white rounded-lg shadow p-6 space-y-3">
              <h2 className="text-lg font-semibold">Update Status</h2>
              <select
                className="border rounded px-3 py-2 w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  "Booking",
                  "Confirmed",
                  "In Transit",
                  "Arrived",
                  "Customs Clearance",
                  "Cleared",
                  "Out for Delivery",
                  "Delivered",
                  "Cancelled",
                  "On Hold",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                onClick={updateStatus}
                className="px-4 py-2 bg-teal-600 text-white rounded"
              >
                Update Status
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">Documents</h2>
            <div className="space-y-2">
              {(shipment.documents || []).map((doc, idx) => (
                <div key={idx} className="border rounded p-3 text-sm">
                  <div className="font-semibold">{doc.documentName}</div>
                  <div>Type: {doc.documentType}</div>
                  <div className="truncate">URL: {doc.documentUrl}</div>
                </div>
              ))}
              {(!shipment.documents || shipment.documents.length === 0) && (
                <div className="text-sm text-slate-500">No documents yet.</div>
              )}
            </div>

            {hasPermission("shipment", "write") && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Document Type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Document Name"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Document URL"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                />
                <div>
                  <button
                    onClick={addDocument}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Add Document
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">Expenses</h2>
            <div className="space-y-2">
              {(shipment.expenses || []).map((expense, idx) => (
                <div key={idx} className="border rounded p-3 text-sm">
                  <div className="font-semibold">{expense.expenseType}</div>
                  <div>
                    {expense.currency}{" "}
                    {Number(expense.amount || 0).toLocaleString()}
                  </div>
                  {expense.description && <div>{expense.description}</div>}
                </div>
              ))}
              {(!shipment.expenses || shipment.expenses.length === 0) && (
                <div className="text-sm text-slate-500">No expenses yet.</div>
              )}
            </div>

            {hasPermission("shipment", "write") && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Expense Type"
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value)}
                />
                <input
                  type="number"
                  className="border rounded px-3 py-2"
                  placeholder="Amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Currency"
                  value={expenseCurrency}
                  onChange={(e) => setExpenseCurrency(e.target.value)}
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Description"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                />
                <div>
                  <button
                    onClick={addExpense}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ShipmentDetailPage;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { toast } from "react-hot-toast";

const ClearingJobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useRolePermissions();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [docType, setDocType] = useState("");
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState("");
  const [expenseNote, setExpenseNote] = useState("");

  const fetchJob = async () => {
    try {
      const res = await axiosInstance.get(`/clearing-job/${id}`);
      setJob(res.data);
      setStatus(res.data.status || "");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load clearing job");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchJob();
      setLoading(false);
    };
    load();
  }, [id]);

  const updateStatus = async () => {
    try {
      await axiosInstance.patch(`/clearing-job/${id}/status`, { status, note });
      toast.success("Status updated");
      fetchJob();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const addNote = async () => {
    try {
      await axiosInstance.post(`/clearing-job/${id}/note`, { message });
      toast.success("Note added");
      setMessage("");
      fetchJob();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add note");
    }
  };

  const addDocument = async () => {
    if (!docType || !docName || !docUrl) {
      return toast.error("Document type, name and URL are required");
    }
    try {
      await axiosInstance.post(`/clearing-job/${id}/document`, {
        documentType: docType,
        documentName: docName,
        documentUrl: docUrl,
      });
      toast.success("Document added");
      setDocType("");
      setDocName("");
      setDocUrl("");
      fetchJob();
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
      await axiosInstance.post(`/clearing-job/${id}/expense`, {
        expenseType,
        amount: Number(expenseAmount),
        currency: expenseCurrency || job?.currency || "USD",
        description: expenseNote || undefined,
      });
      toast.success("Expense added");
      setExpenseType("");
      setExpenseAmount("");
      setExpenseCurrency("");
      setExpenseNote("");
      fetchJob();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expense");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clearing Job Details</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 bg-slate-200 rounded"
        >
          Back
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-gray-600">
          Loading job...
        </div>
      ) : !job ? (
        <div className="bg-white rounded-lg shadow p-6 text-gray-600">
          Job not found.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-6 space-y-2">
            <div className="font-semibold">{job.jobNumber}</div>
            <div>Status: {job.status}</div>
            <div>Shipment: {job.shipmentId?.shipmentNumber || "-"}</div>
            <div>Agent: {job.agentName || "-"}</div>
            <div>
              Duties & Taxes: {job.currency}{" "}
              {Number(job.totalDutiesAndTaxes || 0).toLocaleString()}
            </div>
            <div>
              Agent Charges: {job.currency}{" "}
              {Number(job.totalAgentCharges || 0).toLocaleString()}
            </div>
            <div>
              Total Clearing Cost: {job.currency}{" "}
              {Number(job.totalClearingCost || 0).toLocaleString()}
            </div>
          </div>

          {hasPermission("clearingJob", "write") && (
            <div className="bg-white rounded-lg shadow p-6 space-y-3">
              <h2 className="text-lg font-semibold">Update Status</h2>
              <select
                className="border rounded px-3 py-2 w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  "Pending",
                  "Assigned",
                  "Documents Submitted",
                  "Under Inspection",
                  "Duties Assessed",
                  "Payment Pending",
                  "Payment Completed",
                  "Goods Released",
                  "Completed",
                  "On Hold",
                  "Cancelled",
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

          {hasPermission("clearingJob", "write") && (
            <div className="bg-white rounded-lg shadow p-6 space-y-3">
              <h2 className="text-lg font-semibold">Add Note</h2>
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Note"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                onClick={addNote}
                className="px-4 py-2 bg-teal-600 text-white rounded"
              >
                Add Note
              </button>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">Documents</h2>
            <div className="space-y-2">
              {(job.documents || []).map((doc, idx) => (
                <div key={idx} className="border rounded p-3 text-sm">
                  <div className="font-semibold">{doc.documentName}</div>
                  <div>Type: {doc.documentType}</div>
                  <div className="truncate">URL: {doc.documentUrl}</div>
                </div>
              ))}
              {(!job.documents || job.documents.length === 0) && (
                <div className="text-sm text-slate-500">No documents yet.</div>
              )}
            </div>

            {hasPermission("clearingJob", "write") && (
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
                    className="px-4 py-2 bg-teal-600 text-white rounded"
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
              {(job.expenses || []).map((expense, idx) => (
                <div key={idx} className="border rounded p-3 text-sm">
                  <div className="font-semibold">{expense.expenseType}</div>
                  <div>
                    {expense.currency}{" "}
                    {Number(expense.amount || 0).toLocaleString()}
                  </div>
                  {expense.description && <div>{expense.description}</div>}
                </div>
              ))}
              {(!job.expenses || job.expenses.length === 0) && (
                <div className="text-sm text-slate-500">No expenses yet.</div>
              )}
            </div>

            {hasPermission("clearingJob", "write") && (
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
                    className="px-4 py-2 bg-teal-600 text-white rounded"
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

export default ClearingJobDetailPage;

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOutstanding, fetchLedger } from "../features/ledgerSlice";
import { useRolePermissions } from "../hooks/useRolePermissions";

const formatNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function LedgerPage() {
  const dispatch = useDispatch();
  const { outstanding, entries, balance } = useSelector(
    (state) => state.ledger,
  );
  const { hasPermission } = useRolePermissions();
  const [partyType, setPartyType] = useState("customer");
  const [selectedParty, setSelectedParty] = useState(null);

  useEffect(() => {
    if (hasPermission("ledger", "read")) {
      dispatch(fetchOutstanding(partyType));
    }
  }, [dispatch, partyType, hasPermission]);

  const loadLedger = (partyId) => {
    setSelectedParty(partyId);
    dispatch(fetchLedger({ partyType, partyId }));
  };

  return (
    <div className="min-h-[92vh]">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPartyType("customer")}
          className={`px-4 py-2 rounded ${
            partyType === "customer" ? "bg-teal-600 text-white" : "bg-white"
          }`}
        >
          Customer Ledger
        </button>
        <button
          onClick={() => setPartyType("supplier")}
          className={`px-4 py-2 rounded ${
            partyType === "supplier" ? "bg-teal-600 text-white" : "bg-white"
          }`}
        >
          Supplier Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="app-card p-4">
          <h2 className="text-lg font-semibold mb-3">Outstanding</h2>
          <div className="space-y-2">
            {(outstanding || []).map((o) => (
              <button
                key={o.partyId}
                onClick={() => loadLedger(o.partyId)}
                className={`w-full text-left px-3 py-2 rounded border ${
                  selectedParty === o.partyId
                    ? "border-teal-500"
                    : "border-gray-200"
                }`}
              >
                <div className="text-sm text-slate-600">Party ID</div>
                <div className="font-medium">{o.partyId}</div>
                <div className="text-sm text-slate-500">
                  Outstanding: {formatNumber(o.outstanding)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 app-card p-4">
          <h2 className="text-lg font-semibold mb-3">Ledger Entries</h2>
          {!selectedParty ? (
            <div className="text-slate-500">Select a party to view ledger.</div>
          ) : (
            <>
              <div className="mb-3 text-slate-600">
                Running Balance:{" "}
                <span className="font-semibold">{formatNumber(balance)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(entries || []).map((e) => (
                      <tr key={e._id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">{e.entryType}</td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(e.debit)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(e.credit)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatNumber(e.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LedgerPage;

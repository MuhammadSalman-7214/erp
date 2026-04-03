import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../lib/axios";
import FormattedTime from "../lib/FormattedTime";
import NoData from "../Components/NoData";
import { TrendingUp, CreditCard, AlertCircle, Clipboard } from "lucide-react";
import { DetailSkeleton } from "../Components/LoadingSkeletons";

function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    paid: 0,
    remaining: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerSales = async () => {
      try {
        const response = await axiosInstance.get(`/sales/customer/${id}`);
        const payload = response.data || {};
        setCustomer(payload.customer || null);
        setSales(payload.sales || []);
        setSummary(
          payload.summary || { total: 0, paid: 0, remaining: 0, count: 0 },
        );
      } catch (error) {
        console.error("Failed to load customer history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerSales();
  }, [id]);

  const currency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
  const getPaymentStatusBadge = (status) => {
    const normalized = String(status || "unpaid").toLowerCase();
    if (normalized === "paid") return "bg-green-100 text-green-700";
    if (normalized === "partial") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Customer Details
          </h1>
          <p className="text-sm text-slate-500">
            Sales history and balances for this customer
          </p>
        </div>
      </div>

      {loading ? (
        <DetailSkeleton />
      ) : (
        <>
          <div className="bg-white rounded-2xl border p-5 shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500">Customer</div>
                <div className="text-xl font-semibold text-slate-800">
                  {customer?.name || "Unknown"}
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div>Phone: {customer?.contactInfo?.phone || "-"}</div>
                <div>Address: {customer?.contactInfo?.address || "-"}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              {
                label: "Total Sales",
                value: currency(summary.total),
                bg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
                icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
                borderColor: "border-emerald-200",
              },
              {
                label: "Collected",
                value: currency(summary.paid),
                bg: "bg-gradient-to-br from-teal-50 to-teal-100",
                icon: <CreditCard className="w-5 h-5 text-teal-600" />,
                borderColor: "border-teal-200",
              },
              {
                label: "Remaining",
                value: currency(summary.remaining),
                bg: "bg-gradient-to-br from-rose-50 to-rose-100",
                icon: <AlertCircle className="w-5 h-5 text-rose-600" />,
                borderColor: "border-rose-200",
              },
              {
                label: "Total Orders",
                value: summary.count || 0,
                bg: "bg-gradient-to-br from-blue-50 to-blue-100",
                icon: <Clipboard className="w-5 h-5 text-blue-600" />,
                borderColor: "border-blue-200",
              },
            ].map(({ label, value, bg, icon, borderColor }) => (
              <div
                key={label}
                className={`rounded-xl p-5 border-2 ${borderColor} ${bg} shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    {label}
                  </div>
                  {icon}
                </div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {sales.length === 0 ? (
              <div className="p-10">
                <NoData
                  title="No Sales Found"
                  description="This customer has no sales recorded yet."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-left text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">Date</th>
                      <th className="px-5 py-4 font-medium">Items</th>
                      <th className="px-5 py-4 font-medium">Qty</th>
                      <th className="px-5 py-4 font-medium">Total</th>
                      <th className="px-5 py-4 font-medium">Payment</th>
                      <th className="px-5 py-4 font-medium">Sale Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => {
                      const totalQty = (sale.products || []).reduce(
                        (acc, item) => acc + Number(item.quantity || 0),
                        0,
                      );
                      const itemsLabel = (sale.products || [])
                        .map((item) => {
                          const name = item.product?.name || "Product";
                          const company =
                            item.product?.company || item.product?.brand || "";
                          return company ? `${name} • ${company}` : name;
                        })
                        .join(", ");
                      return (
                        <tr
                          key={sale.id}
                          className="border-b last:border-b-0 hover:bg-slate-50 transition"
                        >
                          <td className="px-5 py-4 text-slate-600">
                            <FormattedTime timestamp={sale.createdAt} />
                          </td>
                          <td className="px-5 py-4 text-slate-800 max-w-xs truncate">
                            {itemsLabel || "-"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {totalQty}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {currency(sale.totalAmount)}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${getPaymentStatusBadge(sale.paymentStatus)}`}
                            >
                              {sale.paymentStatus || "unpaid"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {sale.status || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CustomerDetailPage;

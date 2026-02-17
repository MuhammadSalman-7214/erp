// src/pages/ShipmentsPage.jsx - NEW

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { toast } from "react-hot-toast";

const ShipmentsPage = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = useRolePermissions();

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/shipment");
      setShipments(res.data.shipments || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch shipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-600 mt-1">Manage import/export shipments</p>
        </div>
        {hasPermission("shipment", "write") && (
          <button
            onClick={() => navigate("../createShipment")}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Create Shipment
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <p className="text-gray-600">Loading shipments...</p>
        ) : shipments.length === 0 ? (
          <p className="text-gray-600">No shipments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-3">Shipment</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total Cost</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s._id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{s.shipmentNumber}</td>
                    <td className="px-4 py-3">{s.shipmentType}</td>
                    <td className="px-4 py-3">{s.transportMode}</td>
                    <td className="px-4 py-3">{s.status}</td>
                    <td className="px-4 py-3">
                      {s.currency} {Number(s.totalCost || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`../shipment/${s._id}`)}
                        className="px-3 py-2 bg-slate-200 rounded hover:bg-slate-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentsPage;

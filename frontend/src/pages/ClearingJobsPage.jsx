// src/pages/ClearingJobsPage.jsx - NEW

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../lib/axios";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { toast } from "react-hot-toast";

const ClearingJobsPage = ({ agentView = false }) => {
  const navigate = useNavigate();
  const { hasPermission } = useRolePermissions();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shipmentId, setShipmentId] = useState("");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const url = agentView ? "/clearing-job/my-jobs" : "/clearing-job";
      const res = await axiosInstance.get(url);
      setJobs(res.data.clearingJobs || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch clearing jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const createJob = async () => {
    if (!shipmentId) return toast.error("Shipment ID required");
    try {
      await axiosInstance.post("/clearing-job", { shipmentId });
      toast.success("Clearing job created");
      setShipmentId("");
      fetchJobs();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create clearing job");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {agentView ? "My Clearing Jobs" : "Clearing Jobs"}
          </h1>
          <p className="text-gray-600 mt-1">Manage customs clearing jobs</p>
        </div>
        {!agentView && hasPermission("clearingJob", "write") && (
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2"
              placeholder="Shipment ID"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
            />
            <button
              onClick={createJob}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Create Job
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <p className="text-gray-600">Loading clearing jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="text-gray-600">No clearing jobs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Shipment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j._id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{j.jobNumber}</td>
                    <td className="px-4 py-3">
                      {j.shipmentId?.shipmentNumber || "-"}
                    </td>
                    <td className="px-4 py-3">{j.status}</td>
                    <td className="px-4 py-3">{j.priority}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`../clearing-job/${j._id}`)}
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

export default ClearingJobsPage;

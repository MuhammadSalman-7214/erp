import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  getAllActivityLogs,
  getsingleUserActivityLogs,
} from "../features/activitySlice";
import TopNavbar from "../Components/TopNavbar";
import { useSocket } from "../lib/useSocket";
import FormattedTime from "../lib/FormattedTime ";

function Activitylogpage() {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const { activityLogs, myLogs } = useSelector((state) => state.activity);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // 🔹 HANDLE REAL-TIME LOGS VIA SOCKET.IO
  useSocket((newLog) => {
    setLogs((prev) => [newLog, ...prev]);
  });

  // 🔹 FETCH LOGS BASED ON ROLE
  useEffect(() => {
    if (!user) return;

    if (user.role === "admin") {
      dispatch(getAllActivityLogs());
    } else {
      dispatch(getsingleUserActivityLogs());
    }
  }, [dispatch, user]);

  // 🔹 MERGE AND NORMALIZE LOGS
  useEffect(() => {
    // Admin sees all logs
    if (user?.role === "admin") {
      setLogs(activityLogs ?? []);
    }
    // Regular user sees own logs
    else {
      setLogs(myLogs ?? []);
    }
  }, [activityLogs, myLogs, user]);

  // 🔹 PAGINATION
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  return (
    <div className="bg-base-100 min-h-screen">
      <TopNavbar />
      <div className="mt-10 ml-5">
        <h1 className="text-xl font-semibold mb-4">Activity Logs</h1>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-base-100 mb-24 border-gray-200 rounded-lg shadow-md">
            <thead className="bg-base-100">
              <tr>
                <th className="px-3 py-2 border w-5">#</th>
                <th className="px-3 py-2 border">Name</th>
                <th className="px-3 py-2 border">Email</th>
                <th className="px-3 py-2 border">Action</th>
                <th className="px-3 py-2 border">Affected Part</th>
                <th className="px-3 py-2 border">Description</th>
                <th className="px-3 py-2 border">Time</th>
                <th className="px-3 py-2 border">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.length > 0 ? (
                currentLogs.map((log, index) => (
                  <tr key={log._id}>
                    <td className="px-3 py-2 border">
                      {indexOfFirstLog + index + 1}
                    </td>
                    <td className="px-3 py-2 border">
                      {log.userId?.name || "N/A"}
                    </td>
                    <td className="px-3 py-2 border">
                      {log.userId?.email || "N/A"}
                    </td>
                    <td className="px-3 py-2 border">{log.action}</td>
                    <td className="px-3 py-2 border">{log.entity}</td>
                    <td className="px-3 py-2 border">{log.description}</td>
                    <td className="px-4 py-2 border">
                      <FormattedTime timestamp={log.createdAt} />
                    </td>
                    <td className="px-4 py-2 border">
                      {log.ipAddress || "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    <p>No activity logs available</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 🔹 PAGINATION CONTROLS */}
        <div className="join mt-4 mb-20 ml-72 flex justify-center">
          <button
            className="join-item btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              className={`join-item btn ${currentPage === index + 1 ? "btn-active" : ""}`}
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}

          <button
            className="join-item btn"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Activitylogpage;

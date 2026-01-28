import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  getAllActivityLogs,
  getsingleUserActivityLogs,
} from "../features/activitySlice";
import { useSocket } from "../lib/useSocket";
import FormattedTime from "../lib/FormattedTime";

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
    <div className="min-h-[92vh] bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {currentLogs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-500">No activity logs available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-left text-slate-500">
                  <th className="px-5 py-4 font-medium">#</th>
                  <th className="px-5 py-4 font-medium">Name</th>
                  <th className="px-5 py-4 font-medium">Email</th>
                  <th className="px-5 py-4 font-medium">Action</th>
                  <th className="px-5 py-4 font-medium">Affected Part</th>
                  <th className="px-5 py-4 font-medium">Description</th>
                  <th className="px-5 py-4 font-medium">Time</th>
                  {/* <th className="px-5 py-4 font-medium">IP Address</th> */}
                </tr>
              </thead>

              <tbody>
                {currentLogs.map((log, index) => (
                  <tr
                    key={log._id}
                    className="border-b last:border-b-0 hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 text-slate-500">
                      {indexOfFirstLog + index + 1}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800">
                      {log.userId?.name}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {log.userId?.email}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex px-2 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-semibold">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-700">{log.entity}</td>

                    <td className="px-5 py-4 text-slate-600 max-w-xs truncate">
                      {log.description}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      <FormattedTime timestamp={log.createdAt} />
                    </td>

                    {/* <td className="px-5 py-4 text-slate-600">
                        {log.ipAddress}
                      </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <div className="join mt-4">
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

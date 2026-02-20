import { Bar } from "react-chartjs-2";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

function OrderStatusChart() {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  );

  const { getorder, statusgraph, isshowgraph, errorGraph, isgetorder } = useSelector(
    (state) => state.order,
  );

  const chartSource = useMemo(() => {
    if (Array.isArray(getorder) && getorder.length > 0) {
      const statusMap = new Map();
      getorder.forEach((order) => {
        const status = (order?.status || "unknown").toLowerCase();
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      return Array.from(statusMap.entries()).map(([status, count]) => ({
        _id: status,
        count,
      }));
    }

    return Array.isArray(statusgraph) ? statusgraph : [];
  }, [getorder, statusgraph]);

  if (isgetorder || isshowgraph) return <div>Loading...</div>;
  if (errorGraph)
    return <div className="text-red-500">Error: {errorGraph}</div>;

  const data = {
    labels: chartSource.map((stat) => stat._id), // Order statuses
    datasets: [
      {
        label: "Order Count",
        data: chartSource.map((stat) => stat.count), // Order count for each status
        backgroundColor: [
          "rgb(255, 255, 0)",
          "rgb(0, 255, 0)",
          "rgba(255,0,0)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(255, 99, 132, 1)",
        ],
        borderWidth: 1,
        borderRadius: 10,
        hoverBackgroundColor: "rgba(255, 159, 64, 0.8)", // Hover effect
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false, // Prevents expanding to fit container
    plugins: {
      title: {
        display: true,
        text: "Orders by Status",
        font: {
          size: 24,
          weight: "bold",
          family: "Arial, sans-serif",
        },
        color: "#333",
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: {
          size: 16,
          weight: "bold",
        },
        bodyFont: {
          size: 14,
        },
      },
    },
  };

  return (
    <div className="app-card w-full h-[40vh] p-4 sm:p-6">
      <Bar data={data} options={options} /> {/* Rendering the Bar chart */}
    </div>
  );
}

export default OrderStatusChart;

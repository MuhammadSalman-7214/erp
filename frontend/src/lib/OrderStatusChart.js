import { Bar } from "react-chartjs-2";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getstatusgraphOrder } from "../features/orderSlice";
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
  const dispatch = useDispatch();
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  );

  const { statusgraph, isshowgraph, errorGraph } = useSelector(
    (state) => state.order,
  );

  useEffect(() => {
    dispatch(getstatusgraphOrder());
  }, [dispatch]);
  // If statusgraph is empty, chart will render but with no bars
  const chartData = {
    labels: statusgraph.map((stat) => stat._id) || [],
    datasets: [
      {
        label: "Order Count",
        data: statusgraph.map((stat) => stat.count) || [],
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
        hoverBackgroundColor: "rgba(255, 159, 64, 0.8)",
      },
    ],
  };

  if (isshowgraph) return <div>Loading...</div>;
  if (errorGraph)
    return <div className="text-red-500">Error: {errorGraph}</div>;

  const data = {
    labels: statusgraph.map((stat) => stat._id), // Order statuses
    datasets: [
      {
        label: "Order Count",
        data: statusgraph.map((stat) => stat.count), // Order count for each status
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
    <div className="bg-white w-full h-[50vh] p-4 sm:p-6 rounded-2xl shadow-sm border">
      <Bar data={data} options={options} /> {/* Rendering the Bar chart */}
    </div>
  );
}

export default OrderStatusChart;

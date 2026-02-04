import { FaArrowRightLong } from "react-icons/fa6";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBox,
  FiFileText,
  FiTrendingUp,
  FiShoppingCart,
} from "react-icons/fi";
import { useEffect } from "react";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";

function HomePage() {
  // Add a check in HomePage to guide first-time users
  const navigate = useNavigate();
  useEffect(() => {
    const checkIfSetupNeeded = async () => {
      try {
        const response = await axiosInstance.get("/auth/check-setup");
        if (!response.data.setupComplete) {
          // Show banner or redirect to setup
          toast.info("Please complete initial setup");
          setTimeout(() => navigate("/setup"), 2000);
        }
      } catch (error) {
        // Ignore errors
      }
    };

    checkIfSetupNeeded();
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 flex justify-center item-center px-4 sm:px-6 md:px-10 lg:px-16 py-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        {/* LEFT – Auth Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight mb-4">
            Welcome to <br />
            <span className="text-teal-700">InventoryPro</span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg mb-8">
            A modern ERP platform to manage inventory, sales, orders, and
            business operations — all in one place.
          </p>

          <div className="flex flex-col gap-4">
            <Link to="/login">
              <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition flex items-center justify-between">
                <span>Sign In To Your Account</span>
                <FaArrowRightLong />
              </button>
            </Link>

            <Link to="/signup">
              <button className="w-full bg-white hover:bg-slate-100 text-teal-700 font-semibold py-3 sm:py-4 px-6 rounded-xl border border-slate-200 transition flex items-center justify-between">
                <span>Create New Account</span>
                <FaArrowRightLong />
              </button>
            </Link>
          </div>
        </div>

        {/* RIGHT – Feature Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Feature
            icon={<FiBox size={22} />}
            title="Inventory Management"
            color="teal"
            desc="Monitor stock levels, manage warehouses, and track inventory movements in real time."
          />

          <Feature
            icon={<FiFileText size={22} />}
            title="Invoice & Billing"
            color="blue"
            desc="Create professional invoices, manage billing cycles, and keep financial records organized."
          />

          <Feature
            icon={<FiTrendingUp size={22} />}
            title="Sales Analytics"
            color="emerald"
            desc="Analyze sales performance, track revenue trends, and make data-driven decisions."
          />

          <Feature
            icon={<FiShoppingCart size={22} />}
            title="Order Processing"
            color="purple"
            desc="Manage customer orders, track fulfillment status, and ensure smooth delivery workflows."
          />
        </div>
      </div>
    </div>
  );
}

export default HomePage;

function Feature({ icon, title, desc, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-700`}>
          {icon}
        </div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

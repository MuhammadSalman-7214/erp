import { FaArrowRightLong } from "react-icons/fa6";
import { Link } from "react-router-dom";
import {
  FiBox,
  FiFileText,
  FiTrendingUp,
  FiShoppingCart,
} from "react-icons/fi";

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
        {/* Left Side - Auth Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12 lg:sticky lg:top-24">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-3">
            Welcome <br />
            to Your <span className="text-teal-700">InventoryPro</span>
          </h1>

          <p className="text-slate-600 text-lg mb-10">
            A modern ERP platform to manage inventory, sales, orders, and
            business operations — all in one place.
          </p>

          <div className="flex flex-col gap-4">
            <Link to="/login">
              <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 px-6 rounded-xl transition flex items-center justify-between">
                <span>Sign In To Your Account</span>
                <FaArrowRightLong />
              </button>
            </Link>

            <Link to="/signup">
              <button className="w-full bg-white hover:bg-slate-100 text-teal-700 font-semibold py-4 px-6 rounded-xl border border-slate-200 transition flex items-center justify-between">
                <span>Create New Account</span>
                <FaArrowRightLong />
              </button>
            </Link>
          </div>
        </div>

        {/* RIGHT – Professional Feature Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Feature 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-teal-50 text-teal-700">
                <FiBox size={22} />
              </div>
              <h3 className="font-semibold text-slate-800">
                Inventory Management
              </h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Monitor stock levels, manage warehouses, and track inventory
              movements in real time.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-700">
                <FiFileText size={22} />
              </div>
              <h3 className="font-semibold text-slate-800">
                Invoice & Billing
              </h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Create professional invoices, manage billing cycles, and keep
              financial records organized.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
                <FiTrendingUp size={22} />
              </div>
              <h3 className="font-semibold text-slate-800">Sales Analytics</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Analyze sales performance, track revenue trends, and make
              data-driven decisions.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-purple-50 text-purple-700">
                <FiShoppingCart size={22} />
              </div>
              <h3 className="font-semibold text-slate-800">Order Processing</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Manage customer orders, track fulfillment status, and ensure
              smooth delivery workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

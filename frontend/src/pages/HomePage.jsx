import { FaArrowRightLong } from "react-icons/fa6";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
        {/* Left Side - Auth Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12 lg:sticky lg:top-24">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-3">
            Welcome <br />
            to Your <span className="text-teal-700">InventoryPro</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Streamline your business operations with our comprehensive ERP
            solution
          </p>

          <div className="flex flex-col gap-4 ">
            <Link to="/login">
              <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-between group">
                <span className="text-lg">Sign In to Your Account</span>
                <FaArrowRightLong className="group-hover:translate-x-2 transition-transform" />
              </button>
            </Link>

            <Link to="/signup">
              <button className="w-full bg-white hover:bg-slate-50 text-teal-600 font-semibold py-4 px-6 rounded-xl border-2 border-teal-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-between group">
                <span className="text-lg">Create New Account</span>
                <FaArrowRightLong className="group-hover:translate-x-2 transition-transform" />
              </button>
            </Link>
          </div>
        </div>

        {/* Right Side - Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="max-w-lg relative bg-gradient-to-tl from-purple-500 to-teal-700 shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 h-64 flex flex-col justify-between p-6 text-white rounded-xl">
            {/* Rounded curve overlay */}
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/20 backdrop-blur-sm rounded-tr-[50%]"></div>

            <div className="relative z-10">
              <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                {/* Stock Icon */}
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Stock Management</h3>
              <p className="text-blue-100 text-sm">
                Track product inventory, update stock levels, and manage
                warehouses in real-time.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="max-w-lg relative bg-gradient-to-tr from-blue-500 to-teal-700 shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 h-64 flex flex-col justify-between p-6 text-white rounded-xl">
            <div className="absolute bottom-0 right-0 w-28 h-28 bg-white/20 backdrop-blur-sm rounded-tr-[50%]"></div>

            <div className="relative z-10">
              <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                {/* Invoice Icon */}
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 4h16v16H4V4zm2 2v2h12V6H6zm0 4v2h12v-2H6zm0 4v2h8v-2H6z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Invoices</h3>
              <p className="text-emerald-100 text-sm">
                Create, send, and manage invoices for your customers with ease.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="max-w-lg relative bg-gradient-to-bl from-blue-500 to-teal-700 shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 h-72 flex flex-col justify-between p-6 text-white rounded-xl">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/20 backdrop-blur-sm rounded-tr-[50%]"></div>

            <div className="relative z-10">
              <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                {/* Sales Icon */}
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 3h18v2H3V3zm2 4h14v14H5V7zm4 4v6h2v-6H9zm4 0v6h2v-6h-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Sales</h3>
              <p className="text-blue-100 text-sm">
                Monitor sales performance, analyze trends, and increase revenue
                effectively.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="max-w-lg relative bg-gradient-to-br from-purple-500 to-teal-700 shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 h-72 flex flex-col justify-between p-6 text-white rounded-xl">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/20 backdrop-blur-sm rounded-tr-[50%]"></div>

            <div className="relative z-10">
              <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                {/* Orders Icon */}
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 4h16v2H4V4zm0 4h16v14H4V8zm2 2v10h12V10H6z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Orders</h3>
              <p className="text-purple-100 text-sm">
                Manage customer orders, track delivery status, and ensure timely
                fulfillment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
